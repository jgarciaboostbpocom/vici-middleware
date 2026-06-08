import { promises as fsp } from 'fs';

const UI_FILE = '/opt/vici-mw/public/ui-v2/did-ops.html';

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
  const ui = await fsp.readFile(UI_FILE, 'utf-8');

  const usersView = blockBetween(ui, 'id="view-users"', 'id="view-clients"');
  assertOk(!usersView.includes('User management coming next.'), 'Users view is still only a placeholder');
  assertOk(usersView.includes('id="usersBody"'), 'Users table/list is missing');
  assertOk(usersView.includes('id="userForm"'), 'User create/edit form is missing');
  assertOk(usersView.includes('id="userPasswordForm"'), 'User password form is missing');
  assertOk(usersView.includes('Assigned client IDs') && usersView.includes('Assigned campaign IDs'), 'User assignment controls are missing');
  assertOk(ui.includes("api('/admin/v2/users'"), 'User list/create API call is missing');
  assertOk(ui.includes('/admin/v2/users/${encodeURIComponent') && ui.includes('/password'), 'User password API call is missing');
  assertOk(!ui.includes('passwordHash'), 'UI must not reference password hashes');
  const validatePassword = functionBlock(ui, 'validatePassword');
  assertOk(validatePassword.includes('value.length < 10'), 'Password minimum length validation is missing');
  assertOk(validatePassword.includes('/[A-Za-z]/'), 'Password letter validation is missing');
  assertOk(validatePassword.includes('/[0-9]/'), 'Password number validation is missing');

  const clientsView = blockBetween(ui, 'id="view-clients"', 'id="view-campaigns"');
  assertOk(!clientsView.includes('Client management coming next.'), 'Clients view is still only a placeholder');
  assertOk(clientsView.includes('id="clientsBody"'), 'Clients table/list is missing');
  assertOk(clientsView.includes('id="clientForm"'), 'Client create/edit form is missing');
  assertOk(ui.includes("api('/admin/v2/clients'"), 'Client API call is missing');

  const campaignsView = blockBetween(ui, 'id="view-campaigns"', 'id="view-rules"');
  assertOk(!campaignsView.includes('Campaign management coming next.'), 'Campaigns view is still only a placeholder');
  assertOk(campaignsView.includes('id="campaignsBody"'), 'Campaigns table/list is missing');
  assertOk(campaignsView.includes('id="campaignForm"'), 'Campaign create/edit form is missing');
  assertOk(campaignsView.includes('Allowed states') && campaignsView.includes('Allowed area codes') && campaignsView.includes('Fallback states'), 'Campaign scope controls are missing');
  assertOk(ui.includes("api('/admin/v2/campaigns'"), 'Campaign API call is missing');

  const saveClientForm = functionBlock(ui, 'saveClientForm');
  assertOk(saveClientForm.includes('await loadScopeOptions()'), 'Client save does not refresh scope options');
  assertOk(saveClientForm.includes('renderAll()'), 'Client save does not rerender dependent views');
  const saveCampaignForm = functionBlock(ui, 'saveCampaignForm');
  assertOk(saveCampaignForm.includes('await loadScopeOptions()'), 'Campaign save does not refresh scope options');
  assertOk(saveCampaignForm.includes('await loadCampaignRules()'), 'Campaign save does not refresh campaign rules state');
  assertOk(saveCampaignForm.includes('renderAll()'), 'Campaign save does not rerender dependent views');

  assertOk(ui.includes('function isSuperAdmin()'), 'super_admin management helper is missing');
  assertOk(ui.includes('function managementDisabledAttr()'), 'management disabled helper is missing');
  for (const fn of ['showUserForm', 'saveUserForm', 'showClientForm', 'saveClientForm', 'showCampaignForm', 'saveCampaignForm']) {
    assertOk(functionBlock(ui, fn).includes('ensureSuperAdminAction'), `${fn} is not guarded by super_admin UI check`);
  }

  assertOk(ui.includes('function hasWriteAccess()'), 'viewer write helper is missing');
  assertOk(ui.includes("state.auth.user.role !== 'viewer'"), 'viewer write disabling is missing');
  assertOk(ui.includes('writeDisabledAttr()'), 'write disabled rendering is missing');
  assertOk(ui.includes('h.Authorization = `Bearer ${sessionToken}`'), 'Authorization Bearer session token support is missing');

  const renderAuthGate = functionBlock(ui, 'renderAuthGate');
  assertOk(renderAuthGate.includes("protectedContent.style.display = authenticated ? 'block' : 'none'"), 'protectedContent is not hidden while unauthenticated');
  assertOk(renderAuthGate.includes("protectedContent.classList.toggle('hidden', !authenticated)"), 'protectedContent hidden class is not gated by auth');
  const refreshAll = functionBlock(ui, 'refreshAll');
  const unauthenticatedCheck = refreshAll.indexOf('if (!isAuthenticated())');
  const firstProtectedCall = refreshAll.indexOf("api(scopedAdminPath('/admin/dids'))");
  assertOk(unauthenticatedCheck >= 0 && firstProtectedCall > unauthenticatedCheck, 'refreshAll can call protected endpoints before auth check');
  assertOk(refreshAll.includes('loadUsers()'), 'refreshAll does not load users after auth');

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

  console.log('Vici Middleware 2.0 Phase 8 admin CRUD module validation passed.');
}

main().catch(err => {
  console.error(err?.message || String(err));
  process.exit(1);
});
