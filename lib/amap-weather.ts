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
  source: "高德天气" | "Open-Meteo";
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

export async function fetchWeather(apiKey: string | undefined, cityInput: string): Promise<AmapWeatherForecast> {
  const queryCity = clean(cityInput, 40);
  if (!queryCity) throw new Error("CITY_REQUIRED");
  const cached = weatherCache.get(queryCity);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  let value: AmapWeatherForecast;
  try {
    if (!apiKey) throw new Error("WEATHER_NOT_CONFIGURED");
    value = await fetchAmapWeather(apiKey, queryCity);
  } catch { value = await fetchOpenMeteoWeather(queryCity); }
  if (weatherCache.size > 100) weatherCache.clear();
  weatherCache.set(queryCity, { expiresAt: Date.now() + CACHE_MS, value });
  return value;
}

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
    source: "高德天气",
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

async function fetchOpenMeteoWeather(queryCity: string): Promise<AmapWeatherForecast> {
  const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodeUrl.searchParams.set("name", queryCity);
  geocodeUrl.searchParams.set("count", "1");
  geocodeUrl.searchParams.set("language", "zh");
  geocodeUrl.searchParams.set("countryCode", "CN");
  const geocodeResponse = await fetch(geocodeUrl, { signal: AbortSignal.timeout(6_000) });
  const geocodeData = await geocodeResponse.json() as { results?: Array<{ name?: string; admin1?: string; latitude?: number; longitude?: number }> };
  const location = geocodeData.results?.[0];
  if (!geocodeResponse.ok || !location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) throw new Error("CITY_NOT_FOUND");

  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.searchParams.set("latitude", String(location.latitude));
  forecastUrl.searchParams.set("longitude", String(location.longitude));
  forecastUrl.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max");
  forecastUrl.searchParams.set("timezone", "Asia/Shanghai");
  forecastUrl.searchParams.set("forecast_days", "4");
  const forecastResponse = await fetch(forecastUrl, { signal: AbortSignal.timeout(6_000) });
  const forecastData = await forecastResponse.json() as { daily?: { time?: string[]; weather_code?: number[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; wind_speed_10m_max?: number[] } };
  const daily = forecastData.daily;
  if (!forecastResponse.ok || !daily?.time?.length) throw new Error("WEATHER_UNAVAILABLE");
  const forecasts = daily.time.slice(0, 4).map((date, index) => {
    const weather = openMeteoWeatherLabel(daily.weather_code?.[index]);
    const max = daily.temperature_2m_max?.[index];
    const min = daily.temperature_2m_min?.[index];
    const wind = daily.wind_speed_10m_max?.[index];
    return {
      date,
      dayWeather: weather,
      nightWeather: weather,
      dayTemp: Number.isFinite(max) ? String(Math.round(max!)) : "--",
      nightTemp: Number.isFinite(min) ? String(Math.round(min!)) : "--",
      dayWind: "",
      nightWind: "",
      dayPower: Number.isFinite(wind) ? `${Math.round(wind!)} km/h` : "",
      nightPower: "",
    };
  }).filter(day => /^\d{4}-\d{2}-\d{2}$/.test(day.date));
  if (!forecasts.length) throw new Error("WEATHER_UNAVAILABLE");
  return {
    source: "Open-Meteo",
    queryCity,
    city: location.name || queryCity,
    province: location.admin1 || "",
    adcode: "",
    reportTime: new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()),
    fetchedAt: new Date().toISOString(),
    forecasts,
  };
}

function openMeteoWeatherLabel(code: number | undefined) {
  if (code === 0) return "晴";
  if (code !== undefined && code <= 3) return "多云";
  if (code === 45 || code === 48) return "雾";
  if (code !== undefined && code >= 51 && code <= 57) return "毛毛雨";
  if (code === 61 || code === 80) return "小雨";
  if (code === 63 || code === 81) return "中雨";
  if (code === 65 || code === 82) return "大雨";
  if (code === 66 || code === 67) return "冻雨";
  if (code === 71 || code === 85) return "小雪";
  if (code === 73) return "中雪";
  if (code === 75 || code === 77 || code === 86) return "大雪";
  if (code !== undefined && code >= 95) return "雷雨";
  return "天气变化";
}

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? Array.from(value.trim(), character => character.charCodeAt(0) < 32 ? " " : character).join("").slice(0, maxLength) : "";
}
function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
