export type LiveCallerIdRequest = {
  request_id?: string;
  asterisk_uniqueid?: string;
  linkedid?: string;
  campaign_id?: string | null;
  client_id?: string | null;
  lead_id?: string | number | null;
  list_id?: string | number | null;
  agent_id?: string | null;
  destination_phone: string;
  lead_state?: string | null;
  call_type?: string | null;
  source?: string | null;
  timestamp?: string | null;
};

export type LiveCallerIdDecision = {
  ok: boolean;
  mode: 'disabled' | 'shadow' | 'live' | 'fallback_only';
  allow_call: boolean;
  route_id: string | null;
  decision: string;
  selected_did: string | null;
  fallback_used: boolean;
  reason: string | null;
  safe_to_apply_caller_id: boolean;
  campaign_id?: string | null;
  client_id?: string | null;
  campaign_client_match_safe: boolean;
  warnings?: string[];
  safety_checks?: LiveCallerIdSafetyCheck[];
};

export const VICI_MW_OK = 'VICI_MW_OK';
export const VICI_MW_ALLOW_CALL = 'VICI_MW_ALLOW_CALL';
export const VICI_MW_ROUTE_ID = 'VICI_MW_ROUTE_ID';
export const VICI_MW_DECISION = 'VICI_MW_DECISION';
export const VICI_MW_SELECTED_DID = 'VICI_MW_SELECTED_DID';
export const VICI_MW_FALLBACK_USED = 'VICI_MW_FALLBACK_USED';
export const VICI_MW_REASON = 'VICI_MW_REASON';
export const VICI_MW_SAFE_TO_APPLY_CALLER_ID = 'VICI_MW_SAFE_TO_APPLY_CALLER_ID';

export type LiveCallerIdAgiVariables = {
  [VICI_MW_OK]: '0' | '1';
  [VICI_MW_ALLOW_CALL]: '0' | '1';
  [VICI_MW_ROUTE_ID]: string;
  [VICI_MW_DECISION]: string;
  [VICI_MW_SELECTED_DID]: string;
  [VICI_MW_FALLBACK_USED]: '0' | '1';
  [VICI_MW_REASON]: string;
  [VICI_MW_SAFE_TO_APPLY_CALLER_ID]: '0' | '1';
};

export type LiveCallerIdSafetyCheck = {
  name: string;
  ok: boolean;
  severity: 'info' | 'warning' | 'critical';
  reason: string;
};

export type LiveCallerIdSafetyResult = {
  safe: boolean;
  reasons: string[];
  checks: LiveCallerIdSafetyCheck[];
};

export function buildLiveCallerIdAgiVariables(decision: LiveCallerIdDecision): LiveCallerIdAgiVariables {
  const safety = evaluateLiveCallerIdSafety(decision);
  const safeToApply = safety.safe;

  return {
    [VICI_MW_OK]: boolToAgi(decision.ok),
    [VICI_MW_ALLOW_CALL]: boolToAgi(decision.allow_call),
    [VICI_MW_ROUTE_ID]: safeText(decision.route_id),
    [VICI_MW_DECISION]: safeText(decision.decision),
    [VICI_MW_SELECTED_DID]: safeToApply ? safeText(decision.selected_did) : '',
    [VICI_MW_FALLBACK_USED]: boolToAgi(decision.fallback_used),
    [VICI_MW_REASON]: safeText(safeToApply ? decision.reason : safety.reasons.join('; ')),
    [VICI_MW_SAFE_TO_APPLY_CALLER_ID]: safeToApply ? '1' : '0',
  };
}

export function evaluateLiveCallerIdSafety(decision: LiveCallerIdDecision): LiveCallerIdSafetyResult {
  const checks: LiveCallerIdSafetyCheck[] = [];

  checks.push(makeCheck('mode_live', decision.mode === 'live', 'Route engine mode must be live'));
  checks.push(makeCheck('decision_ok', decision.ok === true, 'Decision ok must be true'));
  checks.push(makeCheck('allow_call', decision.allow_call === true, 'allow_call must be true'));
  checks.push(makeCheck('route_id_present', hasText(decision.route_id), 'route_id must be present'));
  checks.push(makeCheck('selected_did_present', hasText(decision.selected_did), 'selected_did must be present'));
  checks.push(
    makeCheck(
      'selected_did_format',
      hasText(decision.selected_did) && isNanpOrE164Like(decision.selected_did),
      'selected_did must be valid NANP or E.164-like format',
    ),
  );
  checks.push(
    makeCheck(
      'safe_to_apply_flag',
      decision.safe_to_apply_caller_id === true,
      'safe_to_apply_caller_id must be true',
    ),
  );
  checks.push(
    makeCheck(
      'no_critical_warnings',
      !hasCriticalWarning(decision.warnings) && !hasCriticalSafetyCheck(decision.safety_checks),
      'critical warnings must be absent',
    ),
  );
  checks.push(
    makeCheck(
      'campaign_client_match_safe',
      decision.campaign_client_match_safe === true,
      'campaign/client match must be safe',
    ),
  );

  const reasons = checks.filter(check => !check.ok).map(check => check.reason);

  return {
    safe: reasons.length === 0,
    reasons,
    checks,
  };
}

function makeCheck(name: string, ok: boolean, reason: string): LiveCallerIdSafetyCheck {
  return {
    name,
    ok,
    severity: ok ? 'info' : 'critical',
    reason,
  };
}

function boolToAgi(value: boolean): '0' | '1' {
  return value ? '1' : '0';
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNanpOrE164Like(value: string | null): boolean {
  if (!hasText(value)) return false;
  const normalized = value.trim();
  const digitsOnly = normalized.replace(/\D/g, '');
  const nanpPattern = /^1?[2-9]\d{2}[2-9]\d{6}$/;
  const e164Pattern = /^\+[1-9]\d{7,14}$/;

  return e164Pattern.test(normalized) || nanpPattern.test(digitsOnly);
}

function hasCriticalWarning(warnings: string[] | undefined): boolean {
  return (warnings || []).some(warning => /\bcritical\b/i.test(warning));
}

function hasCriticalSafetyCheck(checks: LiveCallerIdSafetyCheck[] | undefined): boolean {
  return (checks || []).some(check => check.severity === 'critical' && !check.ok);
}

function safeText(value: string | null | undefined): string {
  const text = String(value || '').trim();
  if (!text) return '';

  return text
    .replace(/(authorization|password|secret|token)\s*[:=]\s*\S+/gi, '$1=[REDACTED]')
    .slice(0, 256);
}
