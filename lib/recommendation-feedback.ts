export type RecommendationFeedback = { placeIds: string[]; brands: string[]; categories: string[]; maxDistance: number | null; maxCost: number | null };
type RecommendationPlace = { id: string; name: string; category: string; distance: number | null };
type RecommendationPlan = { title?: string; places?: RecommendationPlace[]; includedPlaces?: RecommendationPlace[]; estimatedCost?: number | null };

export const emptyRecommendationFeedback = (): RecommendationFeedback => ({ placeIds: [], brands: [], categories: [], maxDistance: null, maxCost: null });
export const recommendationBrandKey = (name: string) => name.toLowerCase().replace(/[（(].*$/u, "").replace(/(?:旗舰店|体验店|门店|店)$/u, "").replace(/\s+/g, "").slice(0, 30);
// Include every referenced place, even if a partial response omits it from includedPlaces.
export const recommendationPlaces = (plan: RecommendationPlan) => [...(plan.includedPlaces ?? []), ...(plan.places ?? [])].filter((place, index, places) => places.findIndex(other => other.id === place.id) === index);
export const planIdentity = (plan: RecommendationPlan) => recommendationPlaces(plan).map(place => place.id).sort().join("|") || plan.title;

export function recommendationDistance(plan: RecommendationPlan): number | null {
  const places = recommendationPlaces(plan);
  if (!places.length || places.some(place => place.distance === null || !Number.isFinite(place.distance) || place.distance < 0)) return null;
  return Math.max(...places.map(place => place.distance!));
}

export function planAllowedByFeedback(plan: RecommendationPlan, feedback: RecommendationFeedback) {
  const places = recommendationPlaces(plan);
  if (places.some(place => feedback.placeIds.includes(place.id) || feedback.brands.includes(recommendationBrandKey(place.name)) || feedback.categories.includes(place.category))) return false;
  if (!places.length && (feedback.placeIds.length || feedback.brands.length || feedback.categories.length)) return false;
  const distance = recommendationDistance(plan);
  if (feedback.maxDistance !== null && (distance === null || distance >= feedback.maxDistance)) return false;
  if (feedback.maxCost !== null && (plan.estimatedCost === null || plan.estimatedCost === undefined || !Number.isFinite(plan.estimatedCost) || plan.estimatedCost >= feedback.maxCost)) return false;
  return true;
}

// The request carries a bounded recent history; the page still checks its entire session.
export function selectUnseenPlans<T extends RecommendationPlan>(plans: T[], feedback: RecommendationFeedback, seenPlaceIds: string[] = []): T[] {
  const seen = new Set(seenPlaceIds);
  const identities = new Set<string | undefined>();
  return plans.filter(plan => {
    const places = recommendationPlaces(plan);
    const identity = planIdentity(plan);
    if (!planAllowedByFeedback(plan, feedback) || identities.has(identity) || (seen.size > 0 && !places.length) || places.some(place => seen.has(place.id))) return false;
    identities.add(identity);
    places.forEach(place => seen.add(place.id));
    return true;
  });
}
