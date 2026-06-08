import { promises as fsp } from 'fs';
import { evaluateDidAgainstCampaignRules } from '../src/logic/didCampaignRules';
import { buildDidSelectionV2DryRunEvent } from '../src/logic/didSelectionDryRun';
import type { DidRecord, DidStoreV2 } from '../src/storage/dids';
import type { CampaignRulesSnapshot } from '../src/logic/didSelectionDryRun';

const CAMPAIGN_RULES_FILE = '/opt/vici-mw/src/logic/didCampaignRules.ts';
const DRY_RUN_FILE = '/opt/vici-mw/src/logic/didSelectionDryRun.ts';
const ROTATION_FILE = '/opt/vici-mw/src/logic/didRotation.ts';
const SELECTION_FILE = '/opt/vici-mw/src/logic/didSelection.ts';
const SCHEDULER_FILE = '/opt/vici-mw/src/jobs/scheduler.ts';
const UI_FILE = '/opt/vici-mw/public/ui-v2/did-ops.html';
const ARCH_DOC_FILE = '/opt/vici-mw/docs/vici-middleware-2.0-architecture.md';

const LIVE_UPDATE_REFERENCES = [
  'updateAcCidForState',
  'setActiveDidForState',
  'memory.setActiveDid',
  'addSwitch',
  '../vici',
];

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function didRecord(input: Partial<DidRecord> & { did: string; state: string }): DidRecord {
  const now = '2026-06-08T12:00:00.000Z';
  return {
    did: input.did,
    clientId: input.clientId,
    campaignId: input.campaignId,
    areaCode: input.areaCode || input.did.slice(0, 3),
    state: input.state,
    status: input.status || 'available',
    limits: input.limits || { daily: 70, hourly: 20 },
    metrics: input.metrics || {
      date: now.slice(0, 10),
      hour: now.slice(0, 13),
      callsToday: 0,
      callsThisHour: 0,
      connectedCalls: 0,
      ahtSec: 0,
      connectionAhtSec: 0,
      spamReports: 0,
    },
    controls: input.controls || {
      manualPaused: false,
      pauseReason: null,
      pausedAt: null,
      coolUntil: null,
      coolReason: null,
      removed: false,
      removedAt: null,
      removedReason: null,
    },
    rotation: input.rotation || {
      lastUsedAt: null,
      lastActivatedAt: null,
      lastReleasedAt: null,
      currentReason: null,
      history: [],
    },
    replacement: input.replacement || { replacedBy: null, replaces: null },
    notes: input.notes || '',
  };
}

function rules(input: Partial<CampaignRulesSnapshot> = {}): CampaignRulesSnapshot {
  return {
    campaignId: input.campaignId || 'campaign-a',
    dailyCallLimitPerDid: input.dailyCallLimitPerDid ?? 70,
    hourlyCallLimitPerDid: input.hourlyCallLimitPerDid ?? 20,
    ahtThresholdSec: input.ahtThresholdSec ?? 60,
    connectionAhtThresholdSec: input.connectionAhtThresholdSec ?? 60,
    coolingDurationMinutes: input.coolingDurationMinutes ?? 60,
    spamReportThreshold: input.spamReportThreshold ?? 3,
    allowNearbyStateFallback: input.allowNearbyStateFallback ?? true,
    allowedFallbackStates: input.allowedFallbackStates || [],
    leadExclusionEnabled: input.leadExclusionEnabled ?? true,
  };
}

function store(records: DidRecord[], nearbyStates: Record<string, string[]> = {}): DidStoreV2 {
  return {
    schemaVersion: 2,
    inventory: Object.fromEntries(records.map(record => [record.did, record])),
    active: { byState: {}, byAreaCode: {} },
    coverage: { nearbyStates, missing: [] },
    leadExclusions: [],
  };
}

function dryRun(input: {
  records: DidRecord[];
  campaignRules?: CampaignRulesSnapshot | null;
  state?: string;
  sampleLeadPhone?: string;
  nearbyStates?: Record<string, string[]>;
}) {
  return buildDidSelectionV2DryRunEvent({
    mode: 'scheduled_rotation',
    state: input.state || 'NY',
    clientId: input.campaignRules ? 'client-a' : undefined,
    campaignId: input.campaignRules?.campaignId,
    campaignRules: input.campaignRules,
    store: store(input.records, input.nearbyStates),
    pool: input.records.map(record => record.did),
    currentActiveDid: null,
    currentLogicDid: null,
    currentLogicReason: null,
    sampleLeadPhone: input.sampleLeadPhone || input.records[0]?.did || '2125550100',
    now: '2026-06-08T12:00:00.000Z',
  });
}

async function main() {
  const [campaignRules, dryRunSource, rotation, selection, scheduler, ui, doc] = await Promise.all([
    fsp.readFile(CAMPAIGN_RULES_FILE, 'utf-8'),
    fsp.readFile(DRY_RUN_FILE, 'utf-8'),
    fsp.readFile(ROTATION_FILE, 'utf-8'),
    fsp.readFile(SELECTION_FILE, 'utf-8'),
    fsp.readFile(SCHEDULER_FILE, 'utf-8'),
    fsp.readFile(UI_FILE, 'utf-8'),
    fsp.readFile(ARCH_DOC_FILE, 'utf-8'),
  ]);

  assertOk(campaignRules.includes('evaluateDidAgainstCampaignRules'), 'campaign rule evaluation helper/module is missing');
  assertOk(campaignRules.includes('eligibleUnderCampaignRules'), 'campaign rule evaluation output is missing eligibility');
  assertOk(campaignRules.includes('campaignRuleReasons'), 'campaign rule evaluation output is missing reasons');
  assertOk(campaignRules.includes('campaignRuleWarnings'), 'campaign rule evaluation output is missing warnings');
  assertOk(campaignRules.includes('appliedCampaignRules'), 'campaign rule evaluation output is missing applied rules snapshot');
  for (const reason of [
    'DAILY_LIMIT_REACHED',
    'HOURLY_LIMIT_REACHED',
    'AHT_THRESHOLD_RISK',
    'CONNECTION_AHT_THRESHOLD_RISK',
    'SPAM_REPORT_THRESHOLD_REACHED',
    'FALLBACK_STATE_NOT_ALLOWED',
    'LEAD_EXCLUSION_DISABLED',
  ]) {
    assertOk(campaignRules.includes(reason), `campaign rule helper missing reason ${reason}`);
  }

  assertOk(dryRunSource.includes('evaluateDidAgainstCampaignRules'), 'dry-run builder does not evaluate campaign rules');
  assertOk(dryRunSource.includes('campaignRuleEvaluation'), 'event does not include candidate campaignRuleEvaluation');
  assertOk(dryRunSource.includes('selectedDidCampaignRuleEvaluation'), 'event does not include selected DID campaign rule evaluation');
  assertOk(dryRunSource.includes('campaignRuleSummary'), 'event does not include campaignRuleSummary');
  assertOk(dryRunSource.includes('wouldSelectUnderCampaignRules'), 'event does not include wouldSelectUnderCampaignRules');
  assertOk(dryRunSource.includes('wouldDifferUnderCampaignRules'), 'event does not include wouldDifferUnderCampaignRules');
  assertOk(dryRunSource.includes('campaignRuleReasons'), 'metadata does not include campaign rule reasons');
  assertOk(dryRunSource.includes('campaignRuleWarnings'), 'metadata does not include campaign rule warnings');

  assertOk(rotation.includes('campaignRuleSummary: event.campaignRuleSummary'), 'persisted metadata missing campaign rule summary');
  assertOk(rotation.includes('campaignRuleReasons: event.campaignRuleSummary?.campaignRuleReasons'), 'persisted metadata missing campaign rule reasons');
  assertOk(rotation.includes('wouldSelectUnderCampaignRules: event.wouldSelectUnderCampaignRules'), 'persisted metadata missing would-select comparison');

  assertOk(ui.includes('Would select under campaign rules'), 'UI dry-run table does not show would-select field');
  assertOk(ui.includes('Would differ under campaign rules'), 'UI dry-run table does not show would-differ field');
  assertOk(ui.includes('campaignRuleSummary?.campaignRuleBlockedCount'), 'UI dry-run table does not show blocked count');
  assertOk(ui.includes('campaignRuleSummary?.campaignRuleWarningCount'), 'UI dry-run table does not show warning count');
  assertOk(ui.includes('selectedDidCampaignRuleEvaluation'), 'UI dry-run table does not show selected DID rule reasons');

  assertOk(doc.includes('Phase 5 Campaign Rules Dry-Run Evaluation'), 'architecture doc is missing Phase 5 note');
  assertOk(doc.includes('wouldSelectUnderCampaignRules'), 'architecture doc does not describe would-select reporting');
  assertOk(doc.includes('wouldDifferUnderCampaignRules'), 'architecture doc does not describe would-differ reporting');
  assertOk(doc.includes('Live Vicidial behavior remains unchanged'), 'architecture doc does not state live Vicidial behavior is unchanged');

  for (const forbidden of LIVE_UPDATE_REFERENCES) {
    assertOk(!campaignRules.includes(forbidden), `campaign rule helper references live/update code: ${forbidden}`);
    assertOk(!dryRunSource.includes(forbidden), `dry-run builder references live/update code: ${forbidden}`);
  }
  assertOk(selection.includes('selectDidForLead') && !selection.includes('campaignRuleEvaluation'), 'live selector was changed to use campaign rule evaluation');
  assertOk(!scheduler.includes('didCampaignRules') && !scheduler.includes('campaignRule'), 'scheduler behavior references campaign rule evaluation');
  assertOk(rotation.includes('await updateAcCidForState(state, next)'), 'existing live Vicidial update path is unexpectedly missing');

  const baseDid = didRecord({ did: '2125550100', state: 'NY', clientId: 'client-a', campaignId: 'campaign-a' });
  const noRulesEvent = dryRun({ records: [baseDid], campaignRules: null });
  assertOk(noRulesEvent.selectedDid === baseDid.did, 'no-rules dry-run did not preserve selected DID behavior');
  assertOk(!noRulesEvent.campaignRuleEvaluation, 'no-rules dry-run should not add campaign rule evaluations');
  assertOk(!noRulesEvent.wouldSelectUnderCampaignRules, 'no-rules dry-run should not add wouldSelectUnderCampaignRules');

  const dailyBlocked = dryRun({
    records: [didRecord({
      did: '2125550101',
      state: 'NY',
      clientId: 'client-a',
      campaignId: 'campaign-a',
      metrics: { ...baseDid.metrics, callsToday: 1 },
    })],
    campaignRules: rules({ dailyCallLimitPerDid: 1 }),
  });
  assertOk(dailyBlocked.selectedDid === '2125550101', 'daily limit case should preserve current selected DID');
  assertOk(dailyBlocked.selectedDidCampaignRuleEvaluation?.campaignRuleReasons.includes('DAILY_LIMIT_REACHED'), 'daily limit case did not block selected DID');
  assertOk(dailyBlocked.campaignRuleSummary?.campaignRuleBlockedCount === 1, 'daily limit case did not increment blocked count');
  assertOk(dailyBlocked.wouldDifferUnderCampaignRules === true, 'daily limit case should differ when selected DID is blocked');

  const hourlyBlocked = dryRun({
    records: [didRecord({
      did: '2125550102',
      state: 'NY',
      clientId: 'client-a',
      campaignId: 'campaign-a',
      metrics: { ...baseDid.metrics, callsThisHour: 1 },
    })],
    campaignRules: rules({ hourlyCallLimitPerDid: 1 }),
  });
  assertOk(hourlyBlocked.selectedDidCampaignRuleEvaluation?.campaignRuleReasons.includes('HOURLY_LIMIT_REACHED'), 'hourly limit case did not block selected DID');

  const spamBlocked = dryRun({
    records: [didRecord({
      did: '2125550103',
      state: 'NY',
      clientId: 'client-a',
      campaignId: 'campaign-a',
      metrics: { ...baseDid.metrics, spamReports: 2 },
    })],
    campaignRules: rules({ spamReportThreshold: 2 }),
  });
  assertOk(spamBlocked.selectedDidCampaignRuleEvaluation?.campaignRuleReasons.includes('SPAM_REPORT_THRESHOLD_REACHED'), 'spam threshold case did not block selected DID');

  const ahtWarning = dryRun({
    records: [didRecord({
      did: '2125550104',
      state: 'NY',
      clientId: 'client-a',
      campaignId: 'campaign-a',
      metrics: { ...baseDid.metrics, ahtSec: 90, connectionAhtSec: 95 },
    })],
    campaignRules: rules({ ahtThresholdSec: 60, connectionAhtThresholdSec: 60 }),
  });
  assertOk(ahtWarning.selectedDidCampaignRuleEvaluation?.campaignRuleWarnings.includes('AHT_THRESHOLD_RISK'), 'AHT warning case missing AHT warning');
  assertOk(ahtWarning.selectedDidCampaignRuleEvaluation?.campaignRuleWarnings.includes('CONNECTION_AHT_THRESHOLD_RISK'), 'AHT warning case missing connection AHT warning');
  assertOk(ahtWarning.selectedDidCampaignRuleEvaluation?.eligibleUnderCampaignRules === true, 'AHT warning should not hard-block by itself');

  const mixedSelected = didRecord({
    did: '2125550105',
    state: 'NY',
    clientId: 'client-a',
    campaignId: 'campaign-a',
    metrics: { ...baseDid.metrics, spamReports: 1 },
  });
  const mixedFallback = didRecord({
    did: '2125550106',
    state: 'NY',
    clientId: 'client-a',
    campaignId: 'campaign-a',
    metrics: { ...baseDid.metrics, callsToday: 5 },
  });
  const mixed = dryRun({
    records: [mixedSelected, mixedFallback],
    campaignRules: rules({ spamReportThreshold: 1 }),
  });
  assertOk(mixed.selectedDid === mixedSelected.did, 'mixed candidate case should preserve current selector choice');
  assertOk(mixed.wouldSelectUnderCampaignRules === mixedFallback.did, 'mixed candidate case should pick eligible candidate under campaign rules');
  assertOk(mixed.wouldDifferUnderCampaignRules === true, 'mixed candidate case should report campaign-rule difference');

  const fallbackNotAllowed = dryRun({
    records: [didRecord({
      did: '9735550107',
      state: 'NJ',
      clientId: 'client-a',
      campaignId: 'campaign-a',
      areaCode: '973',
    })],
    campaignRules: rules({ allowNearbyStateFallback: true, allowedFallbackStates: ['CT'] }),
    state: 'NY',
    sampleLeadPhone: '9995550100',
    nearbyStates: { NY: ['NJ'] },
  });
  assertOk(fallbackNotAllowed.selectedDid === '9735550107', 'fallback state case should preserve current fallback selection');
  assertOk(fallbackNotAllowed.metadata.campaignRuleReasons instanceof Array, 'fallback state case missing metadata campaign rule reasons');
  assertOk((fallbackNotAllowed.metadata.campaignRuleReasons as string[]).includes('FALLBACK_STATE_NOT_ALLOWED'), 'fallback state case missing metadata fallback reason');
  assertOk(fallbackNotAllowed.selectedDidCampaignRuleEvaluation?.campaignRuleWarnings.includes('FALLBACK_STATE_NOT_ALLOWED'), 'fallback state case missing selected warning');

  const directLeadExclusionDisabled = evaluateDidAgainstCampaignRules({
    record: baseDid,
    campaignRules: rules({ leadExclusionEnabled: false }),
    leadExclusionCreated: true,
  });
  assertOk(directLeadExclusionDisabled.campaignRuleWarnings.includes('LEAD_EXCLUSION_DISABLED'), 'lead exclusion disabled warning is missing');

  console.log(JSON.stringify({
    ok: true,
    helper: 'src/logic/didCampaignRules.ts',
    dryRunFields: {
      campaignRuleEvaluation: true,
      selectedDidCampaignRuleEvaluation: true,
      campaignRuleSummary: true,
      wouldSelectUnderCampaignRules: true,
      wouldDifferUnderCampaignRules: true,
    },
    inMemoryCases: {
      noRulesCompatible: true,
      dailyLimitBlocked: true,
      hourlyLimitBlocked: true,
      spamThresholdBlocked: true,
      ahtWarning: true,
      mixedCandidateWouldSelect: mixed.wouldSelectUnderCampaignRules,
      fallbackStateNotAllowed: true,
    },
    liveVicidialBehaviorChanged: false,
    schedulerBehaviorChanged: false,
  }, null, 2));
}

main().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
