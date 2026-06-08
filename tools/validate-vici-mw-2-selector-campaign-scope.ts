import { promises as fsp } from 'fs';
import { buildDidSelectionV2DryRunEvent } from '../src/logic/didSelectionDryRun';
import type { DidRecord } from '../src/storage/dids';

const DRY_RUN_FILE = '/opt/vici-mw/src/logic/didSelectionDryRun.ts';
const ROTATION_FILE = '/opt/vici-mw/src/logic/didRotation.ts';
const DID_ROUTES_FILE = '/opt/vici-mw/src/routes/dids.ts';
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

function functionBlock(source: string, name: string, before: string): string {
  const start = source.indexOf(`function ${name}`);
  assertOk(start >= 0, `missing function ${name}`);
  const end = source.indexOf(before, start);
  assertOk(end > start, `could not isolate function ${name}`);
  return source.slice(start, end);
}

function didRecord(input: Partial<DidRecord> & { did: string; state: string }): DidRecord {
  return {
    did: input.did,
    clientId: input.clientId,
    campaignId: input.campaignId,
    areaCode: input.areaCode || input.did.slice(0, 3),
    state: input.state,
    status: input.status || 'available',
    limits: input.limits || { daily: 70, hourly: 20 },
    metrics: input.metrics || {
      date: '2026-06-08',
      hour: '2026-06-08T12',
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

async function main() {
  const [dryRun, rotation, didRoutes, doc] = await Promise.all([
    fsp.readFile(DRY_RUN_FILE, 'utf-8'),
    fsp.readFile(ROTATION_FILE, 'utf-8'),
    fsp.readFile(DID_ROUTES_FILE, 'utf-8'),
    fsp.readFile(ARCH_DOC_FILE, 'utf-8'),
  ]);

  assertOk(dryRun.includes('clientId?: string | null'), 'dry-run input type does not support optional clientId');
  assertOk(dryRun.includes('campaignId?: string | null'), 'dry-run input type does not support optional campaignId');
  assertOk(dryRun.includes('clientId?: string;'), 'dry-run event type does not support clientId');
  assertOk(dryRun.includes('campaignId?: string;'), 'dry-run event type does not support campaignId');
  assertOk(dryRun.includes('selectedDidClientId?: string'), 'dry-run event type does not include selected DID client scope');
  assertOk(dryRun.includes('selectedDidCampaignId?: string'), 'dry-run event type does not include selected DID campaign scope');
  assertOk(dryRun.includes('campaignRules?: CampaignRulesSnapshot'), 'dry-run event type does not support campaign rule snapshots');
  assertOk(dryRun.includes('metadata: Record<string, unknown>'), 'dry-run event type does not include metadata');
  assertOk(dryRun.includes('inferDryRunScope'), 'dry-run scope inference helper is missing');
  assertOk(dryRun.includes('inferScopeFromEligiblePool'), 'eligible pool campaign inference helper is missing');
  assertOk(dryRun.includes('selectedRecord?.campaignId'), 'selected DID campaign inference is missing');
  assertOk(dryRun.includes('scopedObservation(alert, scope)'), 'coverage alerts are not scoped in dry-run events');
  assertOk(dryRun.includes('scopedObservation(exclusion, scope)'), 'lead exclusions are not scoped in dry-run events');
  assertOk(dryRun.includes('metadata = compactObject'), 'dry-run event metadata is not built');
  assertOk(dryRun.includes('clientId: scope.clientId'), 'dry-run event metadata does not include clientId');
  assertOk(dryRun.includes('campaignId: scope.campaignId'), 'dry-run event metadata does not include campaignId');

  const scopedDid = didRecord({
    did: '2125550100',
    state: 'NY',
    clientId: 'client-a',
    campaignId: 'campaign-a',
  });
  const scopedEvent = buildDidSelectionV2DryRunEvent({
    mode: 'scheduled_rotation',
    state: 'NY',
    store: {
      inventory: { [scopedDid.did]: scopedDid },
      active: { byState: {}, byAreaCode: {} },
      coverage: { nearbyStates: {}, missing: [] },
    },
    pool: [scopedDid.did],
    currentActiveDid: scopedDid.did,
    currentLogicDid: scopedDid.did,
    currentLogicReason: null,
    sampleLeadPhone: '9995550100',
    now: '2026-06-08T12:00:00.000Z',
  });

  assertOk(scopedEvent.clientId === 'client-a', 'scoped event did not infer clientId from selected DID');
  assertOk(scopedEvent.campaignId === 'campaign-a', 'scoped event did not infer campaignId from selected DID');
  assertOk(scopedEvent.selectedDidClientId === 'client-a', 'selected DID clientId is missing from event');
  assertOk(scopedEvent.selectedDidCampaignId === 'campaign-a', 'selected DID campaignId is missing from event');
  assertOk(scopedEvent.metadata.clientId === 'client-a', 'event metadata.clientId is missing');
  assertOk(scopedEvent.metadata.campaignId === 'campaign-a', 'event metadata.campaignId is missing');
  assertOk(scopedEvent.coverageAlerts.every(alert => alert.clientId === 'client-a' && alert.campaignId === 'campaign-a'), 'coverage alerts are not scoped');
  assertOk(scopedEvent.leadExclusions.every(exclusion => exclusion.clientId === 'client-a' && exclusion.campaignId === 'campaign-a'), 'lead exclusions are not scoped');

  const rulesEvent = buildDidSelectionV2DryRunEvent({
    mode: 'scheduled_rotation',
    state: 'NY',
    clientId: 'client-a',
    campaignId: 'campaign-a',
    campaignRules: {
      campaignId: 'campaign-a',
      dailyCallLimitPerDid: 40,
      hourlyCallLimitPerDid: 10,
      ahtThresholdSec: 30,
      connectionAhtThresholdSec: 45,
      coolingDurationMinutes: 90,
      spamReportThreshold: 2,
      allowNearbyStateFallback: true,
      allowedFallbackStates: ['NJ'],
      leadExclusionEnabled: true,
    },
    store: {
      inventory: { [scopedDid.did]: scopedDid },
      active: { byState: {}, byAreaCode: {} },
      coverage: { nearbyStates: {}, missing: [] },
    },
    pool: [scopedDid.did],
    currentActiveDid: scopedDid.did,
    currentLogicDid: scopedDid.did,
    currentLogicReason: null,
    sampleLeadPhone: '9995550100',
    now: '2026-06-08T12:00:00.000Z',
  });
  assertOk(rulesEvent.campaignRules?.dailyCallLimitPerDid === 40, 'campaign rules snapshot is missing from event');
  assertOk((rulesEvent.metadata.campaignRules as any)?.hourlyCallLimitPerDid === 10, 'campaign rules snapshot is missing from metadata');

  const globalDid = didRecord({ did: '6465550100', state: 'NY' });
  const globalEvent = buildDidSelectionV2DryRunEvent({
    mode: 'scheduled_rotation',
    state: 'NY',
    store: {
      inventory: { [globalDid.did]: globalDid },
      active: { byState: {}, byAreaCode: {} },
      coverage: { nearbyStates: {}, missing: [] },
    },
    pool: [globalDid.did],
    currentActiveDid: globalDid.did,
    currentLogicDid: globalDid.did,
    currentLogicReason: null,
    sampleLeadPhone: '8885550100',
    now: '2026-06-08T12:00:00.000Z',
  });
  assertOk(!globalEvent.clientId && !globalEvent.campaignId, 'global dry-run event should not invent scope');
  assertOk(globalEvent.coverageAlerts.every(alert => !alert.clientId && !alert.campaignId), 'global coverage alerts should remain unscoped');
  assertOk(globalEvent.leadExclusions.every(exclusion => !exclusion.clientId && !exclusion.campaignId), 'global lead exclusions should remain unscoped');

  assertOk(rotation.includes('getCampaignRules'), 'dry-run recorder cannot load campaign rules for supplied campaignId');
  assertOk(rotation.includes('campaignRules = input.campaignRules || (input.campaignId ? await getCampaignRules(input.campaignId) : null)'), 'campaign rules are not loaded only when campaignId is supplied');
  assertOk(rotation.includes('clientId: event.clientId'), 'persisted observation metadata does not include clientId');
  assertOk(rotation.includes('campaignId: event.campaignId'), 'persisted observation metadata does not include campaignId');
  assertOk(rotation.includes('selectedDidClientId: event.selectedDidClientId'), 'persisted metadata does not include selected DID clientId');
  assertOk(rotation.includes('selectedDidCampaignId: event.selectedDidCampaignId'), 'persisted metadata does not include selected DID campaignId');
  assertOk(rotation.includes('campaignRules: event.campaignRules'), 'persisted metadata does not include campaign rules snapshot');
  assertOk(rotation.includes('withObservationMetadata(alert, metadata, event)'), 'coverage persistence does not receive event scope');
  assertOk(rotation.includes('withObservationMetadata(exclusion, metadata, event)'), 'lead exclusion persistence does not receive event scope');
  assertOk(rotation.includes('const clientId = record.clientId || scope.clientId'), 'persisted observations do not preserve/fill clientId');
  assertOk(rotation.includes('const campaignId = record.campaignId || scope.campaignId'), 'persisted observations do not preserve/fill campaignId');

  const persistBlock = functionBlock(rotation, 'persistDidSelectionV2Observations', 'function withObservationMetadata');
  for (const forbidden of LIVE_UPDATE_REFERENCES) {
    assertOk(!persistBlock.includes(forbidden), `persistence path references live/update code: ${forbidden}`);
  }
  assertOk(rotation.includes('await updateAcCidForState(state, next)'), 'existing live Vicidial update path is unexpectedly missing');
  assertOk(!dryRun.includes('../vici'), 'dry-run builder imports Vicidial code');

  const eventsRoute = functionBlock(didRoutes, 'eventMatchesScope', 'function objectMatchesScope');
  assertOk(eventsRoute.includes('objectMatchesScope(event, scope)'), 'dry-run event filter does not match top-level scope');
  assertOk(eventsRoute.includes('objectMatchesScope(event?.metadata, scope)'), 'dry-run event filter does not match metadata scope');
  assertOk(eventsRoute.includes('event?.coverageAlerts'), 'dry-run event filter does not inspect nested coverage alerts');
  assertOk(eventsRoute.includes('event?.leadExclusions'), 'dry-run event filter does not inspect nested lead exclusions');
  assertOk(eventsRoute.includes('didsByNumber.get(did)'), 'dry-run event filter does not fall back to DID inventory scope');

  assertOk(doc.includes('Phase 3 Selector Dry-Run Scope'), 'architecture doc is missing Phase 3 note');
  assertOk(doc.includes('Global/unassigned dry-run events and observations remain supported'), 'architecture doc does not preserve global dry-run support');
  assertOk(doc.includes('Campaign rules are metadata only in this phase'), 'architecture doc does not mark campaign rules as metadata only');
  assertOk(doc.includes('live selector limits and Vicidial selection/update behavior remain unchanged'), 'architecture doc does not state live Vicidial behavior is unchanged');

  console.log(JSON.stringify({
    ok: true,
    dryRunEventScope: {
      clientId: scopedEvent.clientId,
      campaignId: scopedEvent.campaignId,
      selectedDidScope: true,
      metadataScope: true,
      campaignRulesSnapshot: true,
    },
    persistedObservationScope: {
      coverageAlerts: true,
      leadExclusions: true,
      metadata: true,
    },
    globalCompatibility: true,
    liveVicidialBehaviorChanged: false,
    routeCampaignFilterSources: ['top-level', 'metadata', 'nested-observations', 'did-inventory'],
  }, null, 2));
}

main().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
