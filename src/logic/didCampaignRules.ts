import type { DidRecord } from '../storage/dids';
import type { CampaignRules } from '../storage/tenants';

export type CampaignRuleReason =
  | 'DAILY_LIMIT_REACHED'
  | 'HOURLY_LIMIT_REACHED'
  | 'AHT_THRESHOLD_RISK'
  | 'CONNECTION_AHT_THRESHOLD_RISK'
  | 'SPAM_REPORT_THRESHOLD_REACHED'
  | 'FALLBACK_STATE_NOT_ALLOWED'
  | 'LEAD_EXCLUSION_DISABLED';

export type CampaignRulesSnapshot = Pick<
  CampaignRules,
  | 'campaignId'
  | 'dailyCallLimitPerDid'
  | 'hourlyCallLimitPerDid'
  | 'ahtThresholdSec'
  | 'connectionAhtThresholdSec'
  | 'coolingDurationMinutes'
  | 'spamReportThreshold'
  | 'allowNearbyStateFallback'
  | 'allowedFallbackStates'
  | 'leadExclusionEnabled'
>;

export type DidCampaignRuleEvaluation = {
  eligibleUnderCampaignRules: boolean;
  campaignRuleReasons: CampaignRuleReason[];
  campaignRuleWarnings: CampaignRuleReason[];
  appliedCampaignRules: CampaignRulesSnapshot | null;
};

export type DidCampaignRuleEvaluationInput = {
  record: DidRecord;
  campaignRules?: CampaignRulesSnapshot | null;
  now?: Date | string | number;
  leadState?: string | null;
  fallbackUsed?: boolean;
  fallbackState?: string | null;
  leadExclusionCreated?: boolean;
};

export function evaluateDidAgainstCampaignRules(input: DidCampaignRuleEvaluationInput): DidCampaignRuleEvaluation {
  const rules = input.campaignRules || null;
  if (!rules) {
    return {
      eligibleUnderCampaignRules: true,
      campaignRuleReasons: [],
      campaignRuleWarnings: [],
      appliedCampaignRules: null,
    };
  }

  const now = coerceDate(input.now || new Date());
  const metrics = effectiveMetrics(input.record, now);
  const reasons: CampaignRuleReason[] = [];
  const warnings: CampaignRuleReason[] = [];

  if (rules.dailyCallLimitPerDid > 0 && metrics.callsToday >= rules.dailyCallLimitPerDid) {
    reasons.push('DAILY_LIMIT_REACHED');
  }
  if (rules.hourlyCallLimitPerDid > 0 && metrics.callsThisHour >= rules.hourlyCallLimitPerDid) {
    reasons.push('HOURLY_LIMIT_REACHED');
  }
  if (rules.spamReportThreshold > 0 && metrics.spamReports >= rules.spamReportThreshold) {
    reasons.push('SPAM_REPORT_THRESHOLD_REACHED');
  }
  if (rules.ahtThresholdSec > 0 && metrics.ahtSec > rules.ahtThresholdSec) {
    warnings.push('AHT_THRESHOLD_RISK');
  }
  if (rules.connectionAhtThresholdSec > 0 && metrics.connectionAhtSec > rules.connectionAhtThresholdSec) {
    warnings.push('CONNECTION_AHT_THRESHOLD_RISK');
  }

  const fallbackState = normalizeState(input.fallbackState || input.record.state);
  if (input.fallbackUsed) {
    const allowedFallbackStates = normalizeStates(rules.allowedFallbackStates);
    const fallbackAllowed = rules.allowNearbyStateFallback
      && (!allowedFallbackStates.length || allowedFallbackStates.includes(fallbackState));
    if (!fallbackAllowed) {
      reasons.push('FALLBACK_STATE_NOT_ALLOWED');
      warnings.push('FALLBACK_STATE_NOT_ALLOWED');
    }
  }

  if (input.leadExclusionCreated && !rules.leadExclusionEnabled) {
    warnings.push('LEAD_EXCLUSION_DISABLED');
  }

  return {
    eligibleUnderCampaignRules: !hardReasons(reasons).length,
    campaignRuleReasons: uniqueReasons(reasons),
    campaignRuleWarnings: uniqueReasons(warnings),
    appliedCampaignRules: rules,
  };
}

function hardReasons(reasons: CampaignRuleReason[]): CampaignRuleReason[] {
  return reasons.filter(reason => reason !== 'AHT_THRESHOLD_RISK' && reason !== 'CONNECTION_AHT_THRESHOLD_RISK');
}

function effectiveMetrics(record: DidRecord, now: Date) {
  const today = now.toISOString().slice(0, 10);
  const hour = now.toISOString().slice(0, 13);
  return {
    callsToday: record.metrics.date === today ? Math.max(0, Number(record.metrics.callsToday || 0)) : 0,
    callsThisHour: record.metrics.hour === hour ? Math.max(0, Number(record.metrics.callsThisHour || 0)) : 0,
    ahtSec: Math.max(0, Number(record.metrics.ahtSec || 0)),
    connectionAhtSec: Math.max(0, Number(record.metrics.connectionAhtSec || 0)),
    spamReports: Math.max(0, Number(record.metrics.spamReports || 0)),
  };
}

function normalizeState(value: string | null | undefined): string {
  return String(value || '').trim().toUpperCase();
}

function normalizeStates(value: readonly string[] | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(normalizeState).filter(Boolean))).sort();
}

function uniqueReasons(values: CampaignRuleReason[]): CampaignRuleReason[] {
  return Array.from(new Set(values));
}

function coerceDate(value: Date | string | number): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date(0);
}
