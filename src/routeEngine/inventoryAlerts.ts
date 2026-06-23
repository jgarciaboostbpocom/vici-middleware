import { calculateDidEffectiveStatus } from '../logic/didSelection';
import { loadDidStore, type DidRecord } from '../storage/dids';
import {
  getCampaigns,
  getCampaignRules,
  type CampaignRules,
  type ScopedUser,
  type ViciCampaign,
  userCanAccessCampaign,
  userCanAccessClient,
} from '../storage/tenants';

export type InventoryAlertSeverity = 'info' | 'warning' | 'critical';

export type InventoryAlertType =
  | 'NO_ELIGIBLE_DID'
  | 'LOW_ELIGIBLE_DID_INVENTORY'
  | 'LOW_LOCAL_NPA_COVERAGE'
  | 'LOW_STATE_COVERAGE'
  | 'HIGH_RESTING_OR_COOLING_RATIO'
  | 'HIGH_PAUSED_OR_REMOVED_RATIO'
  | 'SPAM_RISK_INVENTORY_PRESSURE'
  | 'DAILY_LIMIT_EXHAUSTION'
  | 'HOURLY_LIMIT_EXHAUSTION';

export type InventoryAlert = {
  id: string;
  severity: InventoryAlertSeverity;
  type: InventoryAlertType;
  message: string;
  clientId?: string | null;
  campaignId?: string | null;
  state?: string | null;
  npa?: string | null;
  areaCode?: string | null;
  eligibleCount: number;
  totalCount: number;
  affectedDidCount: number;
  threshold: number;
  generatedAt: string;
  recommendedAction: string;
};

export type InventoryAlertFilters = {
  clientId?: string | null;
  campaignId?: string | null;
  state?: string | null;
  npa?: string | null;
  severity?: InventoryAlertSeverity | null;
  type?: InventoryAlertType | null;
  limit?: number | null;
};

type InventoryScope = {
  key: string;
  label: string;
  records: DidRecord[];
  clientId: string | null;
  campaignId: string | null;
  state: string | null;
  npa: string | null;
  rules: CampaignRules | null;
};

const DEFAULT_MIN_ELIGIBLE = 3;
const DEFAULT_LOCAL_MIN_ELIGIBLE = 2;
const DEFAULT_RATIO_THRESHOLD = 0.5;
const DEFAULT_LIMIT_PRESSURE_RATIO = 0.8;
const DEFAULT_MAX_LIMIT = 500;

export async function listInventoryAlertsForUser(
  user: ScopedUser,
  filters: InventoryAlertFilters = {},
): Promise<InventoryAlert[]> {
  const store = await loadDidStore();
  const records = Object.values(store.inventory || {});
  const visibleRecords = await filterRecordsForUser(records, user);
  const scopes = await buildScopes(visibleRecords, user, filters);
  const generatedAt = new Date().toISOString();
  const alerts = scopes.flatMap(scope => buildScopeAlerts(scope, generatedAt));
  const filtered = alerts.filter(alert => alertMatchesFilters(alert, filters));
  return filtered.slice(0, normalizeLimit(filters.limit));
}

async function filterRecordsForUser(records: DidRecord[], user: ScopedUser): Promise<DidRecord[]> {
  if (user.role === 'super_admin') return records;
  const out: DidRecord[] = [];
  for (const record of records) {
    if (record.campaignId && await userCanAccessCampaign(user, record.campaignId)) {
      out.push(record);
      continue;
    }
    if (record.clientId && userCanAccessClient(user, record.clientId)) out.push(record);
  }
  return out;
}

async function buildScopes(records: DidRecord[], user: ScopedUser, filters: InventoryAlertFilters): Promise<InventoryScope[]> {
  const narrowed = records.filter(record => {
    if (filters.clientId && record.clientId !== filters.clientId) return false;
    if (filters.campaignId && record.campaignId !== filters.campaignId) return false;
    if (filters.state && record.state !== filters.state) return false;
    if (filters.npa && record.areaCode !== filters.npa) return false;
    return true;
  });
  const scopes = new Map<string, InventoryScope>();

  for (const record of narrowed) {
    addScope(scopes, 'campaign', record, {
      clientId: record.clientId || null,
      campaignId: record.campaignId || null,
      state: null,
      npa: null,
    });
    addScope(scopes, 'state', record, {
      clientId: record.clientId || null,
      campaignId: record.campaignId || null,
      state: record.state || null,
      npa: null,
    });
    addScope(scopes, 'npa', record, {
      clientId: record.clientId || null,
      campaignId: record.campaignId || null,
      state: record.state || null,
      npa: record.areaCode || null,
    });
  }

  const campaigns = await visibleCampaigns(user);
  for (const campaign of campaigns) {
    if (filters.clientId && campaign.clientId !== filters.clientId) continue;
    if (filters.campaignId && campaign.id !== filters.campaignId) continue;

    addConfiguredScope(scopes, 'campaign', campaign, records, { state: null, npa: null });
    for (const state of campaign.allowedStates || []) {
      if (filters.state && state !== filters.state) continue;
      addConfiguredScope(scopes, 'state', campaign, records, { state, npa: null });
    }
    for (const npa of campaign.allowedAreaCodes || []) {
      if (filters.npa && npa !== filters.npa) continue;
      addConfiguredScope(scopes, 'npa', campaign, records, { state: null, npa });
    }
  }

  const out = Array.from(scopes.values());
  for (const scope of out) {
    scope.rules = scope.campaignId ? await getCampaignRules(scope.campaignId) : null;
  }
  return out;
}

async function visibleCampaigns(user: ScopedUser): Promise<ViciCampaign[]> {
  const campaigns = await getCampaigns();
  if (user.role === 'super_admin') return campaigns;
  const out: ViciCampaign[] = [];
  for (const campaign of campaigns) {
    if (await userCanAccessCampaign(user, campaign.id) || userCanAccessClient(user, campaign.clientId)) {
      out.push(campaign);
    }
  }
  return out;
}

function addScope(
  scopes: Map<string, InventoryScope>,
  group: string,
  record: DidRecord,
  attrs: Pick<InventoryScope, 'clientId' | 'campaignId' | 'state' | 'npa'>,
): void {
  const key = [
    group,
    attrs.clientId || 'global',
    attrs.campaignId || 'none',
    attrs.state || 'all',
    attrs.npa || 'all',
  ].join(':');
  const existing = scopes.get(key);
  if (existing) {
    existing.records.push(record);
    return;
  }
  scopes.set(key, {
    key,
    label: group,
    records: [record],
    ...attrs,
    rules: null,
  });
}

function addConfiguredScope(
  scopes: Map<string, InventoryScope>,
  group: string,
  campaign: ViciCampaign,
  records: DidRecord[],
  attrs: Pick<InventoryScope, 'state' | 'npa'>,
): void {
  const key = [
    group,
    campaign.clientId || 'global',
    campaign.id || 'none',
    attrs.state || 'all',
    attrs.npa || 'all',
  ].join(':');
  if (scopes.has(key)) return;
  const scopeRecords = records.filter(record => {
    if (record.clientId !== campaign.clientId) return false;
    if (record.campaignId !== campaign.id) return false;
    if (attrs.state && record.state !== attrs.state) return false;
    if (attrs.npa && record.areaCode !== attrs.npa) return false;
    return true;
  });
  scopes.set(key, {
    key,
    label: group,
    records: scopeRecords,
    clientId: campaign.clientId,
    campaignId: campaign.id,
    state: attrs.state,
    npa: attrs.npa,
    rules: null,
  });
}

function buildScopeAlerts(scope: InventoryScope, generatedAt: string): InventoryAlert[] {
  const totalCount = scope.records.length;
  const eligibleRecords = scope.records.filter(record => isEligible(record));
  const eligibleCount = eligibleRecords.length;
  const alerts: InventoryAlert[] = [];
  const minEligible = scope.npa || scope.state ? DEFAULT_LOCAL_MIN_ELIGIBLE : DEFAULT_MIN_ELIGIBLE;

  if (eligibleCount === 0) {
    alerts.push(alert(scope, generatedAt, 'critical', 'NO_ELIGIBLE_DID', eligibleCount, totalCount, totalCount, 1));
  } else if (eligibleCount < minEligible) {
    alerts.push(alert(scope, generatedAt, 'warning', 'LOW_ELIGIBLE_DID_INVENTORY', eligibleCount, totalCount, minEligible - eligibleCount, minEligible));
  }
  if (scope.npa && eligibleCount < DEFAULT_LOCAL_MIN_ELIGIBLE) {
    alerts.push(alert(scope, generatedAt, eligibleCount === 0 ? 'critical' : 'warning', 'LOW_LOCAL_NPA_COVERAGE', eligibleCount, totalCount, totalCount - eligibleCount, DEFAULT_LOCAL_MIN_ELIGIBLE));
  }
  if (scope.state && !scope.npa && eligibleCount < DEFAULT_LOCAL_MIN_ELIGIBLE) {
    alerts.push(alert(scope, generatedAt, eligibleCount === 0 ? 'critical' : 'warning', 'LOW_STATE_COVERAGE', eligibleCount, totalCount, totalCount - eligibleCount, DEFAULT_LOCAL_MIN_ELIGIBLE));
  }

  const resting = count(scope.records, record => calculateDidEffectiveStatus(record) === 'cooling');
  if (ratio(resting, totalCount) >= DEFAULT_RATIO_THRESHOLD) {
    alerts.push(alert(scope, generatedAt, severityForRatio(resting, totalCount), 'HIGH_RESTING_OR_COOLING_RATIO', eligibleCount, totalCount, resting, DEFAULT_RATIO_THRESHOLD));
  }

  const unavailable = count(scope.records, record => ['manual_paused', 'removed', 'burned'].includes(calculateDidEffectiveStatus(record)));
  if (ratio(unavailable, totalCount) >= DEFAULT_RATIO_THRESHOLD) {
    alerts.push(alert(scope, generatedAt, severityForRatio(unavailable, totalCount), 'HIGH_PAUSED_OR_REMOVED_RATIO', eligibleCount, totalCount, unavailable, DEFAULT_RATIO_THRESHOLD));
  }

  const spamPressure = count(scope.records, record => {
    const threshold = scope.rules?.spamReportThreshold || 0;
    return record.status === 'spam_risk' || (threshold > 0 && record.metrics.spamReports >= Math.max(1, threshold - 1));
  });
  if (ratio(spamPressure, totalCount) >= DEFAULT_RATIO_THRESHOLD) {
    alerts.push(alert(scope, generatedAt, severityForRatio(spamPressure, totalCount), 'SPAM_RISK_INVENTORY_PRESSURE', eligibleCount, totalCount, spamPressure, DEFAULT_RATIO_THRESHOLD));
  }

  const dailyPressure = count(scope.records, record => limitPressure(record.metrics.callsToday, record.limits.daily));
  if (ratio(dailyPressure, totalCount) >= DEFAULT_RATIO_THRESHOLD) {
    alerts.push(alert(scope, generatedAt, severityForRatio(dailyPressure, totalCount), 'DAILY_LIMIT_EXHAUSTION', eligibleCount, totalCount, dailyPressure, DEFAULT_LIMIT_PRESSURE_RATIO));
  }

  const hourlyPressure = count(scope.records, record => limitPressure(record.metrics.callsThisHour, record.limits.hourly));
  if (ratio(hourlyPressure, totalCount) >= DEFAULT_RATIO_THRESHOLD) {
    alerts.push(alert(scope, generatedAt, severityForRatio(hourlyPressure, totalCount), 'HOURLY_LIMIT_EXHAUSTION', eligibleCount, totalCount, hourlyPressure, DEFAULT_LIMIT_PRESSURE_RATIO));
  }

  return alerts;
}

function isEligible(record: DidRecord): boolean {
  const status = calculateDidEffectiveStatus(record);
  return status === 'available' || status === 'active' || status === 'spam_risk';
}

function alert(
  scope: InventoryScope,
  generatedAt: string,
  severity: InventoryAlertSeverity,
  type: InventoryAlertType,
  eligibleCount: number,
  totalCount: number,
  affectedDidCount: number,
  threshold: number,
): InventoryAlert {
  return {
    id: [
      type,
      scope.clientId || 'global',
      scope.campaignId || 'none',
      scope.state || 'all',
      scope.npa || 'all',
    ].join(':'),
    severity,
    type,
    message: messageFor(type, scope, eligibleCount, totalCount),
    clientId: scope.clientId,
    campaignId: scope.campaignId,
    state: scope.state,
    npa: scope.npa,
    areaCode: scope.npa,
    eligibleCount,
    totalCount,
    affectedDidCount,
    threshold,
    generatedAt,
    recommendedAction: recommendationFor(type),
  };
}

function messageFor(type: InventoryAlertType, scope: InventoryScope, eligibleCount: number, totalCount: number): string {
  const parts = [
    scope.campaignId ? `campaign ${scope.campaignId}` : scope.clientId ? `client ${scope.clientId}` : 'global inventory',
    scope.state ? `state ${scope.state}` : '',
    scope.npa ? `NPA ${scope.npa}` : '',
  ].filter(Boolean).join(' / ');
  return `${type}: ${eligibleCount}/${totalCount} eligible DIDs in ${parts}.`;
}

function recommendationFor(type: InventoryAlertType): string {
  switch (type) {
    case 'NO_ELIGIBLE_DID':
      return 'Add or reactivate eligible DIDs for this scope before enabling live routing.';
    case 'LOW_ELIGIBLE_DID_INVENTORY':
    case 'LOW_LOCAL_NPA_COVERAGE':
    case 'LOW_STATE_COVERAGE':
      return 'Add local inventory or approve scoped fallback coverage.';
    case 'HIGH_RESTING_OR_COOLING_RATIO':
      return 'Review cooling duration and recent usage before changing routing.';
    case 'HIGH_PAUSED_OR_REMOVED_RATIO':
      return 'Review paused, removed, or burned DIDs and replenish inventory.';
    case 'SPAM_RISK_INVENTORY_PRESSURE':
      return 'Review spam reports and add clean DIDs for this scope.';
    case 'DAILY_LIMIT_EXHAUSTION':
      return 'Increase available inventory or review daily call limits.';
    case 'HOURLY_LIMIT_EXHAUSTION':
      return 'Increase available inventory or review hourly call pacing.';
  }
}

function alertMatchesFilters(alert: InventoryAlert, filters: InventoryAlertFilters): boolean {
  if (filters.clientId && alert.clientId !== filters.clientId) return false;
  if (filters.campaignId && alert.campaignId !== filters.campaignId) return false;
  if (filters.state && alert.state !== filters.state) return false;
  if (filters.npa && alert.npa !== filters.npa) return false;
  if (filters.severity && alert.severity !== filters.severity) return false;
  if (filters.type && alert.type !== filters.type) return false;
  return true;
}

function count(records: DidRecord[], predicate: (record: DidRecord) => boolean): number {
  return records.filter(predicate).length;
}

function ratio(value: number, total: number): number {
  return total > 0 ? value / total : 0;
}

function severityForRatio(value: number, total: number): InventoryAlertSeverity {
  return ratio(value, total) >= 0.75 ? 'critical' : 'warning';
}

function limitPressure(value: number, limit: number): boolean {
  return limit > 0 && value / limit >= DEFAULT_LIMIT_PRESSURE_RATIO;
}

function normalizeLimit(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 100;
  return Math.max(1, Math.min(Math.floor(numeric), DEFAULT_MAX_LIMIT));
}
