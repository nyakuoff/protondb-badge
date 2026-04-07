import { callable } from '@steambrew/client';

const fetchFn = callable<[{ appId: number }], string>('FetchProtonDb');

export interface ProtonDbRating {
  tier: string;
  bestReportedTier: string;
  confidence: string;
  score: number;
  total: number;
  trendingTier: string;
}

const cache = new Map<number, ProtonDbRating | null>();

export async function fetchProtonDbRating(appId: number): Promise<ProtonDbRating | null> {
  if (cache.has(appId)) {
    return cache.get(appId) ?? null;
  }

  try {
    const json = await fetchFn({ appId });
    const data = JSON.parse(json);

    if (data.error || !data.tier) {
      cache.set(appId, null);
      return null;
    }

    const rating: ProtonDbRating = {
      tier: data.tier,
      bestReportedTier: data.bestReportedTier ?? data.tier,
      confidence: data.confidence ?? '',
      score: data.score ?? 0,
      total: data.total ?? 0,
      trendingTier: data.trendingTier ?? data.tier,
    };

    cache.set(appId, rating);
    return rating;
  } catch (e) {
    console.error('[ProtonDB] error fetching rating:', e);
    cache.set(appId, null);
    return null;
  }
}
