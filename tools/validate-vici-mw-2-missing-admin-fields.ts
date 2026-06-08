import { promises as fsp } from 'fs';

const UI_FILE = '/opt/vici-mw/public/ui-v2/did-ops.html';
const DID_ROUTES_FILE = '/opt/vici-mw/src/routes/dids.ts';
const SERVER_FILE = '/opt/vici-mw/src/server.ts';

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function functionBlock(source: string, name: string): string {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assertOk(start >= 0, `missing function ${name}`);
  const bodyStart = source.indexOf('{', start);
  assertOk(bodyStart >= 0, `missing body for function ${name}`);

  let depth = 0;
  for (let i = bodyStart; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`could not isolate function ${name}`);
}

function blockBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  assertOk(start >= 0, `missing start marker ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assertOk(end > start, `missing end marker ${endMarker}`);
  return source.slice(start, end);
}

async function main() {
  const [ui, didRoutes, server] = await Promise.all([
    fsp.readFile(UI_FILE, 'utf-8'),
    fsp.readFile(DID_ROUTES_FILE, 'utf-8'),
    fsp.readFile(SERVER_FILE, 'utf-8'),
  ]);

  const usersView = blockBetween(ui, 'id="view-users"', 'id="view-clients"');
  assertOk(usersView.includes('id="userNewPassword"') && usersView.includes('id="userConfirmPassword"'), 'Create user form is missing password/confirm fields');
  assertOk(usersView.includes('New password') && usersView.includes('Confirm password'), 'Create user password labels are missing');
  const saveUserForm = functionBlock(ui, 'saveUserForm');
  assertOk(saveUserForm.includes("api('/admin/v2/users'") && saveUserForm.includes('/password'), 'Create user flow does not call password endpoint after user creation');
  assertOk(saveUserForm.includes('validatePasswordPair') && functionBlock(ui, 'validatePasswordPair').includes('Password and confirm password must match'), 'Create user password match validation is missing');
  assertOk(saveUserForm.includes('User created, but password setup failed') && saveUserForm.includes('Use Set/reset password'), 'Create user password failure warning is missing');
  assertOk(saveUserForm.includes("method: 'PATCH'") && !saveUserForm.includes('password: createPassword,') && !saveUserForm.includes('userNewPassword') || saveUserForm.includes('if (!state.editingUser)'), 'User edit must not send password through generic PATCH');
  assertOk(!ui.includes('passwordHash'), 'UI must not reference passwordHash');

  const didsView = blockBetween(ui, 'id="view-dids"', 'id="view-alerts"');
  assertOk(didsView.includes('id="didForm"') && didsView.includes('Add DID'), 'DIDs view is missing Add DID form');
  assertOk(didsView.includes('id="bulkDidForm"') && didsView.includes('Bulk import DIDs'), 'DIDs view is missing Bulk import form');
  assertOk(didsView.includes('id="didClientInput"') && didsView.includes('id="didCampaignInput"'), 'Add DID client/campaign dropdowns are missing');
  assertOk(didsView.includes('id="assignDidClientInput"') && didsView.includes('id="assignDidCampaignInput"'), 'Assign scope client/campaign dropdowns are missing');
  assertOk(didsView.includes('Clear assignment'), 'Assign scope clear assignment action is missing');

  const collectDidFormBody = functionBlock(ui, 'collectDidFormBody');
  assertOk(collectDidFormBody.includes('validateDidNumber') && collectDidFormBody.includes('validateOptionalState'), 'DID form validation is incomplete');
  assertOk(collectDidFormBody.includes('validateOptionalAreaCode') && collectDidFormBody.includes('integerOptionalFromInput'), 'DID area/limit validation is incomplete');
  assertOk(collectDidFormBody.includes('assertCampaignBelongsToClient'), 'DID form does not enforce campaign/client relationship');
  assertOk(functionBlock(ui, 'validateDidNumber').includes('10 or 11 digits'), 'DID number validation is missing 10/11 digit guidance');
  assertOk(functionBlock(ui, 'validateOptionalState').includes('/^[A-Z]{2}$/'), 'State validation is missing uppercase two-letter check');
  assertOk(functionBlock(ui, 'validateOptionalAreaCode').includes('/^\\d{3}$/'), 'Area code validation is missing 3-digit check');
  assertOk(functionBlock(ui, 'integerOptionalFromInput').includes('positive integer'), 'DID limit positive integer validation is missing');
  assertOk(functionBlock(ui, 'parseBulkDidRows').includes("raw.split(',')") && functionBlock(ui, 'parseBulkDidRows').includes('valid.push'), 'Bulk import client-side parser is missing');
  assertOk(functionBlock(ui, 'saveBulkDidForm').includes("api('/admin/dids/bulk'"), 'Bulk import does not call POST /admin/dids/bulk');
  assertOk(functionBlock(ui, 'saveDidForm').includes("api('/admin/dids'"), 'Add DID API call is missing');
  assertOk(functionBlock(ui, 'patchDid').includes("method: 'PATCH'") && functionBlock(ui, 'saveDidScopeForm').includes('clientId') && functionBlock(ui, 'saveDidScopeForm').includes('campaignId'), 'Assign scope does not PATCH clientId/campaignId');

  assertOk(didRoutes.includes("didsRouter.post('/',"), 'DID create endpoint is missing');
  assertOk(didRoutes.includes("didsRouter.post('/bulk'"), 'DID bulk endpoint is missing');
  assertOk(didRoutes.includes('upsertDidConfig'), 'DID create/bulk routes do not update local DID store');
  assertOk(didRoutes.includes('resolveCreateScope') && didRoutes.includes('userCanManageDidScope'), 'DID create routes do not enforce manage scope');
  assertOk(didRoutes.includes("super_admin role required to add global DIDs"), 'Global DID create is not super_admin protected');
  assertOk(server.includes("app.use('/admin/dids', adminAuth, didsRouter)"), '/admin/dids is not protected by admin auth middleware');

  const rulesView = blockBetween(ui, 'id="view-rules"', 'id="view-dids"');
  assertOk(rulesView.includes('id="campaignRulesPanel"'), 'Campaign Rules panel is missing');
  const renderCampaignRules = functionBlock(ui, 'renderCampaignRules');
  for (const field of [
    'dailyCallLimitPerDid',
    'hourlyCallLimitPerDid',
    'ahtThresholdSec',
    'connectionAhtThresholdSec',
    'coolingDurationMinutes',
    'spamReportThreshold',
    'allowNearbyStateFallback',
    'allowedFallbackStates',
    'leadExclusionEnabled',
    'notes',
  ]) {
    assertOk(renderCampaignRules.includes(field) || functionBlock(ui, 'collectCampaignRulesPatch').includes(field), `Campaign Rules editor missing ${field}`);
  }
  assertOk(renderCampaignRules.includes('Select a campaign to edit rules.'), 'No-campaign rules message is missing');
  assertOk(renderCampaignRules.includes('Rules are saved to middleware configuration only. V2 live selection remains disabled.'), 'Rules local-only safety label is missing');
  assertOk(functionBlock(ui, 'saveCampaignRules').includes('/admin/v2/campaigns/${encodeURIComponent(state.selectedCampaignId)}/rules') && functionBlock(ui, 'saveCampaignRules').includes("method: 'PATCH'"), 'Rules save does not PATCH campaign rules endpoint');

  assertOk(ui.includes('function hasWriteAccess()'), 'viewer write helper is missing');
  assertOk(ui.includes("state.auth.user.role !== 'viewer'"), 'viewer write disabling is missing');
  assertOk(ui.includes('writeDisabledAttr()'), 'write disabled rendering is missing');
  assertOk(ui.includes('h.Authorization = `Bearer ${sessionToken}`'), 'Authorization Bearer session token support is missing');
  const renderAuthGate = functionBlock(ui, 'renderAuthGate');
  assertOk(renderAuthGate.includes("protectedContent.style.display = authenticated ? 'block' : 'none'"), 'protectedContent is not hidden unauthenticated');
  assertOk(renderAuthGate.includes("protectedContent.classList.toggle('hidden', !authenticated)"), 'protectedContent hidden class is not gated by auth');

  for (const marker of [
    '/scheduler',
    '/admin/rotate',
    'forceRotate',
    'rotateStateIfNeeded',
    'setActiveDidForState',
    'updateAcCidForState',
  ]) {
    assertOk(!ui.includes(marker), `UI appears to call scheduler/live rotation behavior: ${marker}`);
  }

  console.log('Vici Middleware 2.0 Phase 8B missing admin fields validation passed.');
}

main().catch(err => {
  console.error(err?.message || String(err));
  process.exit(1);
});
