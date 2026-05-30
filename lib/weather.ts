// lib/weather.ts
// Weather data fetching library using Open-Meteo API (free, no API key needed)
// Strategy:
//   - Trip within 14 days → Forecast API (real forecast with precipitation probability)
//   - Trip further out     → Historical Archive API (average same calendar dates from 3 prior years)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DayWeather {
  date: string; // "2025-06-02"
  highTemp: number; // °F
  lowTemp: number; // °F
  precipProbability: number; // 0-100
  precipInches: number; // expected amount
  windSpeedMph: number; // max wind
  weatherCode: number; // WMO code
  source: "forecast" | "historical_avg";
}

export interface WeatherData {
  days: DayWeather[];
  destination: string;
  latitude: number;
  longitude: number;
  source: "forecast" | "historical_avg";
  packingTips: string[];
}

// ---------------------------------------------------------------------------
// WMO weather code descriptions
// ---------------------------------------------------------------------------

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm w/ slight hail",
  99: "Thunderstorm w/ heavy hail",
};

export function getWeatherDescription(code: number): string {
  return WMO_DESCRIPTIONS[code] ?? "Unknown";
}

export function getWeatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "🌨️";
  return "⛈️";
}

// ---------------------------------------------------------------------------
// Geocoding
// ---------------------------------------------------------------------------

interface GeoResult {
  latitude: number;
  longitude: number;
  name: string;
  country: string;
  timezone: string;
}

async function geocodeDestination(
  destination: string
): Promise<GeoResult | null> {
  const query = destination.trim();

  // Strategy 1: Try the full destination string
  const fullResult = await geocodeQuery(query);
  if (fullResult) return fullResult;

  // Strategy 2: Open-Meteo geocoding only handles city names well.
  // If the destination has a comma (e.g., "Nashville, Tennessee"), try just
  // the city part and then match the region from the results.
  const commaIndex = query.indexOf(',');
  if (commaIndex > 0) {
    const city = query.substring(0, commaIndex).trim();
    const region = query.substring(commaIndex + 1).trim().toLowerCase();

    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=en`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;

    // Try to find a result whose admin1 (state) or country matches the region
    const match = data.results.find(
      (r: Record<string, unknown>) =>
        (typeof r.admin1 === 'string' && r.admin1.toLowerCase().includes(region)) ||
        (typeof r.country === 'string' && r.country.toLowerCase().includes(region))
    );

    const r = match ?? data.results[0]; // Fall back to top result
    return {
      latitude: r.latitude as number,
      longitude: r.longitude as number,
      name: r.name as string,
      country: (r.country as string) ?? '',
      timezone: (r.timezone as string) ?? 'UTC',
    };
  }

  // Strategy 3: Try just the first word (handles "Nashville Tennessee" without comma)
  const firstWord = query.split(/\s+/)[0];
  if (firstWord && firstWord !== query) {
    const fallbackResult = await geocodeQuery(firstWord);
    if (fallbackResult) return fallbackResult;
  }

  return null;
}

async function geocodeQuery(query: string): Promise<GeoResult | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;

  const r = data.results[0];
  return {
    latitude: r.latitude,
    longitude: r.longitude,
    name: r.name,
    country: r.country ?? '',
    timezone: r.timezone ?? 'UTC',
  };
}

// ---------------------------------------------------------------------------
// Forecast fetch (near-future, ≤ 14 days)
// ---------------------------------------------------------------------------

async function fetchForecast(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string
): Promise<DayWeather[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,weathercode` +
    `&start_date=${startDate}&end_date=${endDate}` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`;

  const res = await fetch(url, { next: { revalidate: 3600 } }); // cache 1h
  if (!res.ok) return [];

  const data = await res.json();
  const d = data.daily;
  if (!d || !d.time) return [];

  return (d.time as string[]).map(
    (date: string, i: number): DayWeather => ({
      date,
      highTemp: Math.round(d.temperature_2m_max[i]),
      lowTemp: Math.round(d.temperature_2m_min[i]),
      precipProbability: d.precipitation_probability_max?.[i] ?? 0,
      precipInches:
        Math.round((d.precipitation_sum?.[i] ?? 0) * 100) / 100,
      windSpeedMph: Math.round(d.wind_speed_10m_max?.[i] ?? 0),
      weatherCode: d.weathercode?.[i] ?? 0,
      source: "forecast" as const,
    })
  );
}

// ---------------------------------------------------------------------------
// Historical average fetch (far-future, > 14 days)
// ---------------------------------------------------------------------------

interface ArchiveDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  wind_speed_10m_max: number[];
  weathercode: number[];
}

async function fetchHistoricalAverage(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string
): Promise<DayWeather[]> {
  const currentYear = new Date().getFullYear();
  const yearsBack = [1, 2, 3];

  const allYears = await Promise.all(
    yearsBack.map(async (offset): Promise<ArchiveDaily | null> => {
      const start = startDate.replace(/^\d{4}/, String(currentYear - offset));
      const end = endDate.replace(/^\d{4}/, String(currentYear - offset));

      const url =
        `https://archive-api.open-meteo.com/v1/archive` +
        `?latitude=${lat}&longitude=${lon}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weathercode` +
        `&start_date=${start}&end_date=${end}` +
        `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`;

      const res = await fetch(url, { next: { revalidate: 86400 } }); // cache 24h
      if (!res.ok) return null;

      const data = await res.json();
      return data.daily as ArchiveDaily | null;
    })
  );

  const validYears = allYears.filter(
    (d): d is ArchiveDaily => d !== null && d.time?.length > 0
  );
  if (validYears.length === 0) return [];

  const dayCount = validYears[0].time.length;
  const startParts = startDate.split("-");
  const baseDate = new Date(
    parseInt(startParts[0]),
    parseInt(startParts[1]) - 1,
    parseInt(startParts[2])
  );

  return Array.from({ length: dayCount }, (_, i): DayWeather => {
    const avgHigh =
      validYears.reduce(
        (sum, y) => sum + (y.temperature_2m_max?.[i] ?? 0),
        0
      ) / validYears.length;
    const avgLow =
      validYears.reduce(
        (sum, y) => sum + (y.temperature_2m_min?.[i] ?? 0),
        0
      ) / validYears.length;
    const avgPrecip =
      validYears.reduce(
        (sum, y) => sum + (y.precipitation_sum?.[i] ?? 0),
        0
      ) / validYears.length;
    const avgWind =
      validYears.reduce(
        (sum, y) => sum + (y.wind_speed_10m_max?.[i] ?? 0),
        0
      ) / validYears.length;

    // Rain probability: % of years that had > 0.01 inches
    const rainDays = validYears.filter(
      (y) => (y.precipitation_sum?.[i] ?? 0) > 0.01
    ).length;
    const precipProb = Math.round((rainDays / validYears.length) * 100);

    // Most common weather code (mode)
    const codes = validYears.map((y) => y.weathercode?.[i] ?? 0);
    const modeCode =
      codes
        .sort(
          (a: number, b: number) =>
            codes.filter((v: number) => v === a).length -
            codes.filter((v: number) => v === b).length
        )
        .pop() ?? 0;

    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];

    return {
      date: dateStr,
      highTemp: Math.round(avgHigh),
      lowTemp: Math.round(avgLow),
      precipProbability: precipProb,
      precipInches: Math.round(avgPrecip * 100) / 100,
      windSpeedMph: Math.round(avgWind),
      weatherCode: modeCode,
      source: "historical_avg" as const,
    };
  });
}

// ---------------------------------------------------------------------------
// Packing tips generator
// ---------------------------------------------------------------------------

function generatePackingTips(days: DayWeather[]): string[] {
  const tips: string[] = [];

  const avgHigh = days.reduce((s, d) => s + d.highTemp, 0) / days.length;
  const maxWind = Math.max(...days.map((d) => d.windSpeedMph));
  const rainyDays = days.filter((d) => d.precipProbability > 40).length;
  const totalPrecip = days.reduce((s, d) => s + d.precipInches, 0);
  const hasSnow = days.some(
    (d) => d.weatherCode >= 71 && d.weatherCode <= 77
  );
  const hasThunderstorms = days.some((d) => d.weatherCode >= 95);
  const highestTemp = Math.max(...days.map((d) => d.highTemp));
  const lowestTemp = Math.min(...days.map((d) => d.lowTemp));

  // Temperature-based tips
  if (avgHigh >= 90) {
    tips.push(
      "🥵 Expect hot weather — pack lightweight, breathable clothing and stay hydrated"
    );
    tips.push(
      "🧴 Bring sunscreen (SPF 30+) and a hat for sun protection"
    );
  } else if (avgHigh >= 80) {
    tips.push(
      "☀️ Warm weather ahead — pack shorts, t-shirts, and light layers"
    );
    tips.push(
      "🧴 Sunscreen recommended — UV can be strong even on partly cloudy days"
    );
  } else if (avgHigh >= 65) {
    tips.push("🌤️ Mild temperatures — pack layers you can add or remove");
  } else if (avgHigh >= 50) {
    tips.push("🧥 Cool weather expected — bring a jacket and long pants");
  } else {
    tips.push(
      "🧣 Cold weather — pack warm layers, a heavy coat, and gloves"
    );
  }

  // Temperature swing
  if (highestTemp - lowestTemp > 30) {
    tips.push(
      "🌡️ Big temperature swings — dress in layers to handle " +
        lowestTemp +
        "°F lows and " +
        highestTemp +
        "°F highs"
    );
  }

  // Rain
  if (rainyDays >= days.length * 0.5) {
    tips.push(
      "☔ Rain is likely on most days — pack a rain jacket or umbrella"
    );
    tips.push("👟 Waterproof shoes recommended");
  } else if (rainyDays >= 2) {
    tips.push(
      "🌦️ Some rainy days expected — bring a compact umbrella or rain jacket"
    );
  }

  if (totalPrecip > 2) {
    tips.push(
      "💧 Heavy rainfall expected — waterproof bag or dry sack for electronics"
    );
  }

  // Wind
  if (maxWind >= 25) {
    tips.push(
      "💨 Strong winds expected — secure loose items and bring a windbreaker"
    );
  } else if (maxWind >= 15) {
    tips.push(
      "🍃 Breezy conditions — a light windbreaker could be handy"
    );
  }

  // Snow
  if (hasSnow) {
    tips.push("❄️ Snow is possible — pack warm, waterproof boots");
  }

  // Thunderstorms
  if (hasThunderstorms) {
    tips.push(
      "⛈️ Thunderstorms possible — plan indoor alternatives and check forecasts daily"
    );
  }

  // Ensure at least 2 tips
  if (tips.length < 2) {
    tips.push(
      "👍 Weather looks comfortable — standard packing should be fine"
    );
  }

  return tips;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function getWeatherForTrip(
  destination: string,
  startDate: string,
  endDate: string
): Promise<WeatherData | null> {
  try {
    const geo = await geocodeDestination(destination);
    if (!geo) return null;

    // Determine if we should use forecast or historical data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tripStart = new Date(startDate + "T00:00:00");
    const daysUntilTrip = Math.ceil(
      (tripStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    let days: DayWeather[];
    let source: "forecast" | "historical_avg";

    if (daysUntilTrip <= 14 && daysUntilTrip >= 0) {
      // Use forecast for near-future dates
      days = await fetchForecast(
        geo.latitude,
        geo.longitude,
        startDate,
        endDate
      );
      source = "forecast";

      // If forecast returned empty (dates out of range), fall back to historical
      if (days.length === 0) {
        days = await fetchHistoricalAverage(
          geo.latitude,
          geo.longitude,
          startDate,
          endDate
        );
        source = "historical_avg";
      }
    } else if (daysUntilTrip < 0) {
      // Trip is in the past — use historical archive for actual dates
      const url =
        `https://archive-api.open-meteo.com/v1/archive` +
        `?latitude=${geo.latitude}&longitude=${geo.longitude}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weathercode` +
        `&start_date=${startDate}&end_date=${endDate}` +
        `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`;

      const res = await fetch(url, { next: { revalidate: 86400 } });
      if (res.ok) {
        const data = await res.json();
        const d = data.daily;
        if (d && d.time) {
          days = (d.time as string[]).map(
            (date: string, i: number): DayWeather => ({
              date,
              highTemp: Math.round(d.temperature_2m_max[i]),
              lowTemp: Math.round(d.temperature_2m_min[i]),
              precipProbability: d.precipitation_sum[i] > 0.01 ? 100 : 0,
              precipInches:
                Math.round((d.precipitation_sum?.[i] ?? 0) * 100) / 100,
              windSpeedMph: Math.round(d.wind_speed_10m_max?.[i] ?? 0),
              weatherCode: d.weathercode?.[i] ?? 0,
              source: "historical_avg" as const,
            })
          );
        } else {
          days = [];
        }
      } else {
        days = [];
      }
      source = "historical_avg";
    } else {
      // Trip is more than 14 days out — use historical averages
      days = await fetchHistoricalAverage(
        geo.latitude,
        geo.longitude,
        startDate,
        endDate
      );
      source = "historical_avg";
    }

    if (days.length === 0) return null;

    const packingTips = generatePackingTips(days);

    return {
      days,
      destination,
      latitude: geo.latitude,
      longitude: geo.longitude,
      source,
      packingTips,
    };
  } catch {
    return null;
  }
}
