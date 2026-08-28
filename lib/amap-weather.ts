export type AmapWeatherDay = {
  date: string;
  dayWeather: string;
  nightWeather: string;
  dayTemp: string;
  nightTemp: string;
  dayWind: string;
  nightWind: string;
  dayPower: string;
  nightPower: string;
};

export type AmapWeatherForecast = {
  queryCity: string;
  city: string;
  province: string;
  adcode: string;
  reportTime: string;
  fetchedAt: string;
  forecasts: AmapWeatherDay[];
};

const weatherCache = new Map<string, { expiresAt: number; value: AmapWeatherForecast }>();
const CACHE_MS = 15 * 60_000;

export async function fetchAmapWeather(apiKey: string, cityInput: string): Promise<AmapWeatherForecast> {
  const queryCity = clean(cityInput, 40);
  if (!queryCity) throw new Error("CITY_REQUIRED");
  const cached = weatherCache.get(queryCity);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const geocodeUrl = new URL("https://restapi.amap.com/v3/geocode/geo");
  geocodeUrl.searchParams.set("key", apiKey);
  geocodeUrl.searchParams.set("address", queryCity);
  geocodeUrl.searchParams.set("city", queryCity);
  geocodeUrl.searchParams.set("output", "JSON");
  const geocodeResponse = await fetch(geocodeUrl, { signal: AbortSignal.timeout(8_000) });
  const geocodeData = await geocodeResponse.json() as { status?: string; geocodes?: Array<Record<string, unknown>> };
  const geocode = geocodeData.geocodes?.[0];
  const adcode = stringValue(geocode?.adcode);
  if (!geocodeResponse.ok || geocodeData.status !== "1" || !/^\d{6}$/.test(adcode)) throw new Error("CITY_NOT_FOUND");

  const weatherUrl = new URL("https://restapi.amap.com/v3/weather/weatherInfo");
  weatherUrl.searchParams.set("key", apiKey);
  weatherUrl.searchParams.set("city", adcode);
  weatherUrl.searchParams.set("extensions", "all");
  weatherUrl.searchParams.set("output", "JSON");
  const weatherResponse = await fetch(weatherUrl, { signal: AbortSignal.timeout(8_000) });
  const weatherData = await weatherResponse.json() as { status?: string; forecasts?: Array<Record<string, unknown>> };
  const forecast = weatherData.forecasts?.[0];
  const casts = Array.isArray(forecast?.casts) ? forecast.casts as Array<Record<string, unknown>> : [];
  if (!weatherResponse.ok || weatherData.status !== "1" || !forecast || casts.length === 0) throw new Error("WEATHER_UNAVAILABLE");

  const value: AmapWeatherForecast = {
    queryCity,
    city: stringValue(forecast.city) || queryCity,
    province: stringValue(forecast.province),
    adcode,
    reportTime: stringValue(forecast.reporttime),
    fetchedAt: new Date().toISOString(),
    forecasts: casts.slice(0, 4).map(cast => ({
      date: stringValue(cast.date),
      dayWeather: stringValue(cast.dayweather),
      nightWeather: stringValue(cast.nightweather),
      dayTemp: stringValue(cast.daytemp),
      nightTemp: stringValue(cast.nighttemp),
      dayWind: stringValue(cast.daywind),
      nightWind: stringValue(cast.nightwind),
      dayPower: stringValue(cast.daypower),
      nightPower: stringValue(cast.nightpower),
    })).filter(day => /^\d{4}-\d{2}-\d{2}$/.test(day.date)),
  };
  if (value.forecasts.length === 0) throw new Error("WEATHER_UNAVAILABLE");
  if (weatherCache.size > 100) weatherCache.clear();
  weatherCache.set(queryCity, { expiresAt: Date.now() + CACHE_MS, value });
  return value;
}

export function weatherPrompt(forecast: AmapWeatherForecast) {
  return forecast.forecasts.map(day => `${day.date}：白天${day.dayWeather}${day.dayTemp}℃，夜间${day.nightWeather}${day.nightTemp}℃`).join("；");
}

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? Array.from(value.trim(), character => character.charCodeAt(0) < 32 ? " " : character).join("").slice(0, maxLength) : "";
}
function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
