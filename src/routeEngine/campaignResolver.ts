import { getCampaignRules, getCampaigns, type CampaignRules, type ViciCampaign } from '../storage/tenants';

export type CampaignMatchType =
  | 'middleware_campaign_id'
  | 'vicidial_campaign_id'
  | 'external_campaign_id'
  | 'middleware_campaign_id_case_insensitive'
  | 'vicidial_campaign_id_case_insensitive'
  | 'external_campaign_id_case_insensitive'
  | 'request_client_only'
  | 'none';

export type CampaignMatchConfidence = 'exact' | 'fallback' | 'unresolved';

export type RouteCampaignScope = {
  campaign: ViciCampaign | null;
  clientId: string | null;
  campaignId: string | null;
  rules: CampaignRules | null;
  requestCampaignId: string | null;
  requestClientId: string | null;
  matchType: CampaignMatchType;
  confidence: CampaignMatchConfidence;
  warnings: string[];
};

export type ResolveRouteCampaignScopeInput = {
  campaignId?: string | null;
  clientId?: string | null;
  callType?: string | null;
};

export async function resolveRouteCampaignScope(input: ResolveRouteCampaignScopeInput): Promise<RouteCampaignScope> {
  const requestCampaignId = normalizeOptionalString(input.campaignId);
  const requestClientId = normalizeOptionalString(input.clientId);
  const warnings: string[] = [];

  if (!requestCampaignId) {
    if (requestClientId) {
      warnings.push('campaign_id missing; using request client_id only');
      return unresolved({
        requestCampaignId,
        requestClientId,
        clientId: requestClientId,
        matchType: 'request_client_only',
        confidence: 'fallback',
        warnings,
      });
    }

    warnings.push('campaign_id missing and client_id missing');
    return unresolved({
      requestCampaignId,
      requestClientId,
      clientId: null,
      matchType: 'none',
      confidence: 'unresolved',
      warnings,
    });
  }

  try {
    const campaigns = await getCampaigns();
    const exactMatch = findExact(campaigns, requestCampaignId);
    if (exactMatch) return buildResolved(exactMatch.campaign, exactMatch.matchType, 'exact', requestCampaignId, requestClientId, warnings);

    const fallbackMatch = findCaseInsensitive(campaigns, requestCampaignId);
    if (fallbackMatch) {
      warnings.push(`campaign matched case-insensitively from request campaign_id ${requestCampaignId}`);
      return buildResolved(fallbackMatch.campaign, fallbackMatch.matchType, 'fallback', requestCampaignId, requestClientId, warnings);
    }

    warnings.push(`campaign_id ${requestCampaignId} did not match middleware id, vicidialCampaignId, or externalCampaignId`);
    return unresolved({
      requestCampaignId,
      requestClientId,
      clientId: requestClientId,
      campaignId: requestCampaignId,
      matchType: 'none',
      confidence: 'unresolved',
      warnings,
    });
  } catch (err: any) {
    warnings.push(`campaign resolver failed: ${err?.message || String(err)}`);
    return unresolved({
      requestCampaignId,
      requestClientId,
      clientId: requestClientId,
      campaignId: requestCampaignId,
      matchType: 'none',
      confidence: 'unresolved',
      warnings,
    });
  }
}

async function buildResolved(
  campaign: ViciCampaign,
  matchType: CampaignMatchType,
  confidence: CampaignMatchConfidence,
  requestCampaignId: string,
  requestClientId: string | null,
  warnings: string[],
): Promise<RouteCampaignScope> {
  if (requestClientId && requestClientId !== campaign.clientId) {
    warnings.push(`request client_id ${requestClientId} differs from resolved campaign client_id ${campaign.clientId}`);
  }

  return {
    campaign,
    clientId: campaign.clientId,
    campaignId: campaign.id,
    rules: await getCampaignRules(campaign.id),
    requestCampaignId,
    requestClientId,
    matchType,
    confidence,
    warnings,
  };
}

function findExact(campaigns: ViciCampaign[], requested: string): { campaign: ViciCampaign; matchType: CampaignMatchType } | null {
  for (const campaign of campaigns) {
    if (campaign.id === requested) return { campaign, matchType: 'middleware_campaign_id' };
    if (campaign.vicidialCampaignId === requested) return { campaign, matchType: 'vicidial_campaign_id' };
    if (campaign.externalCampaignId === requested) return { campaign, matchType: 'external_campaign_id' };
  }
  return null;
}

function findCaseInsensitive(campaigns: ViciCampaign[], requested: string): { campaign: ViciCampaign; matchType: CampaignMatchType } | null {
  const wanted = requested.toLowerCase();
  for (const campaign of campaigns) {
    if (campaign.id.toLowerCase() === wanted) return { campaign, matchType: 'middleware_campaign_id_case_insensitive' };
    if (campaign.vicidialCampaignId?.toLowerCase() === wanted) return { campaign, matchType: 'vicidial_campaign_id_case_insensitive' };
    if (campaign.externalCampaignId?.toLowerCase() === wanted) return { campaign, matchType: 'external_campaign_id_case_insensitive' };
  }
  return null;
}

function unresolved(input: {
  requestCampaignId: string | null;
  requestClientId: string | null;
  clientId: string | null;
  campaignId?: string | null;
  matchType: CampaignMatchType;
  confidence: CampaignMatchConfidence;
  warnings: string[];
}): RouteCampaignScope {
  return {
    campaign: null,
    clientId: input.clientId,
    campaignId: input.campaignId || input.requestCampaignId,
    rules: null,
    requestCampaignId: input.requestCampaignId,
    requestClientId: input.requestClientId,
    matchType: input.matchType,
    confidence: input.confidence,
    warnings: input.warnings,
  };
}

function normalizeOptionalString(value: unknown): string | null {
  const normalized = String(value || '').trim();
  return normalized || null;
}
