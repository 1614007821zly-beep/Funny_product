export type AmapResolvedLocation = {
  city: string;
  district: string;
  businessArea: string;
  displayName: string;
  adcode: string;
  longitude: number;
  latitude: number;
};

type AmapBusinessArea = { name?: unknown; location?: unknown };

export async function resolveAmapLocation(apiKey: string, longitude: number, latitude: number): Promise<AmapResolvedLocation> {
  const converted = await convertGpsCoordinate(apiKey, longitude, latitude);
  const url = new URL("https://restapi.amap.com/v3/geocode/regeo");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("location", `${converted.longitude.toFixed(6)},${converted.latitude.toFixed(6)}`);
  url.searchParams.set("radius", "1000");
  url.searchParams.set("extensions", "all");
  url.searchParams.set("output", "JSON");

  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  const data = await response.json() as { status?: string; regeocode?: { addressComponent?: Record<string, unknown>; pois?: Array<Record<string, unknown>> } };
  const component = data.regeocode?.addressComponent;
  if (!response.ok || data.status !== "1" || !component) throw new Error("LOCATION_UNAVAILABLE");

  const province = text(component.province);
  const rawCity = text(component.city);
  const city = trimAdministrativeSuffix(rawCity || province);
  const district = text(component.district);
  const businessAreas = Array.isArray(component.businessAreas) ? component.businessAreas as AmapBusinessArea[] : [];
  const nearestBusinessArea = [...businessAreas]
    .map(item => ({ name: text(item.name), distance: coordinateDistance(item.location, converted.longitude, converted.latitude) }))
    .filter(item => item.name)
    .sort((left, right) => left.distance - right.distance)[0]?.name ?? "";
  const poiBusinessArea = data.regeocode?.pois?.map(poi => text(poi.businessarea)).find(Boolean) ?? "";
  const businessArea = nearestBusinessArea || poiBusinessArea;
  const displayName = businessArea || district || city;
  if (!displayName) throw new Error("LOCATION_UNAVAILABLE");

  return {
    city,
    district,
    businessArea,
    displayName,
    adcode: text(component.adcode),
    longitude: converted.longitude,
    latitude: converted.latitude,
  };
}

async function convertGpsCoordinate(apiKey: string, longitude: number, latitude: number) {
  const url = new URL("https://restapi.amap.com/v3/assistant/coordinate/convert");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("locations", `${longitude.toFixed(6)},${latitude.toFixed(6)}`);
  url.searchParams.set("coordsys", "gps");
  url.searchParams.set("output", "JSON");
  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  const data = await response.json() as { status?: string; locations?: string };
  const [convertedLongitude, convertedLatitude] = (data.locations ?? "").split(",").map(Number);
  if (!response.ok || data.status !== "1" || !Number.isFinite(convertedLongitude) || !Number.isFinite(convertedLatitude)) throw new Error("LOCATION_UNAVAILABLE");
  return { longitude: convertedLongitude, latitude: convertedLatitude };
}

function coordinateDistance(value: unknown, longitude: number, latitude: number) {
  if (typeof value !== "string") return Number.POSITIVE_INFINITY;
  const [candidateLongitude, candidateLatitude] = value.split(",").map(Number);
  if (!Number.isFinite(candidateLongitude) || !Number.isFinite(candidateLatitude)) return Number.POSITIVE_INFINITY;
  return (candidateLongitude - longitude) ** 2 + (candidateLatitude - latitude) ** 2;
}

function trimAdministrativeSuffix(value: string) {
  return value.replace(/(特别行政区|自治州|地区|盟|市)$/u, "");
}

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
