import { config } from '../config';
import type { DidRecord } from '../storage/dids';
import type { RouteCampaignScope } from './campaignResolver';

export type DidPoolType = 'campaign' | 'client' | 'unscoped' | 'all' | 'none';

export type DidPoolSelection = {
  poolType: DidPoolType;
  candidates: DidRecord[];
  candidateCount: number;
  warnings: string[];
  reason: string;
};

export function selectDidPoolForRoute(scope: RouteCampaignScope, inventory: DidRecord[]): DidPoolSelection {
  const warnings = [...scope.warnings];

  if (scope.campaignId && scope.confidence !== 'unresolved') {
    const campaignDids = inventory.filter(record => record.campaignId === scope.campaignId);
    if (campaignDids.length) {
      return build('campaign', campaignDids, warnings, `using ${campaignDids.length} campaign-scoped DID candidates`);
    }
    warnings.push(`no DIDs assigned to resolved campaign ${scope.campaignId}`);
  }

  if (scope.clientId && config.routeEngine.allowClientDidFallback) {
    const clientDids = inventory.filter(record => record.clientId === scope.clientId && !record.campaignId);
    if (clientDids.length) {
      warnings.push('using client-level DID fallback because no campaign DID pool was available');
      return build('client', clientDids, warnings, `using ${clientDids.length} client-scoped DID candidates`);
    }
    warnings.push(`no client-level DIDs available for client ${scope.clientId}`);
  } else if (scope.clientId && !config.routeEngine.allowClientDidFallback) {
    warnings.push('client-level DID fallback disabled by ROUTE_ENGINE_ALLOW_CLIENT_DID_FALLBACK');
  }

  if (config.routeEngine.allowUnscopedDidFallback) {
    const unscopedDids = inventory.filter(record => !record.clientId && !record.campaignId);
    if (unscopedDids.length) {
      warnings.push('using unscoped legacy DID fallback because no scoped pool was available');
      return build('unscoped', unscopedDids, warnings, `using ${unscopedDids.length} unscoped DID candidates`);
    }
    warnings.push('unscoped DID fallback enabled but no unscoped DIDs are available');
  } else {
    warnings.push('unscoped DID fallback disabled by ROUTE_ENGINE_ALLOW_UNSCOPED_DID_FALLBACK');
  }

  return build('none', [], warnings, 'no DID pool available under current resolver scope and fallback settings');
}

function build(poolType: DidPoolType, candidates: DidRecord[], warnings: string[], reason: string): DidPoolSelection {
  return {
    poolType,
    candidates,
    candidateCount: candidates.length,
    warnings,
    reason,
  };
}
