'use client'

import { useState, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WeatherClientProps {
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
}

// ---------------------------------------------------------------------------
// API response type
// ---------------------------------------------------------------------------

interface WeatherApiResponse {
  days: Array<{
    date: string;
    highTemp: number;
    lowTemp: number;
    precipProbability: number;
    precipInches: number;
    windSpeedMph: number;
    weatherCode: number;
    source: 'forecast' | 'historical_avg';
  }>;
  destination: string;
  latitude: number;
  longitude: number;
  source: 'forecast' | 'historical_avg';
  packingTips: string[];
}

// ---------------------------------------------------------------------------
// Weather code helpers (duplicated from lib/weather.ts for client use)
// ---------------------------------------------------------------------------

function getWeatherEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 57) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌧️';
  if (code <= 86) return '🌨️';
  return '⛈️';
}

function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    66: 'Light freezing rain', 67: 'Heavy freezing rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    85: 'Slight snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm w/ slight hail', 99: 'Thunderstorm w/ heavy hail',
  };
  return descriptions[code] ?? 'Unknown';
}

// ---------------------------------------------------------------------------
// Visual sub-components
// ---------------------------------------------------------------------------

function TempBar({ low, high }: { low: number; high: number }) {
  const minScale = 20;
  const maxScale = 110;
  const range = maxScale - minScale;
  const leftPct = Math.max(0, ((low - minScale) / range) * 100);
  const widthPct = Math.max(5, ((high - low) / range) * 100);

  // Color based on high temp
  let barColor = '#3b82f6'; // blue for cold
  if (high >= 90) barColor = '#ef4444'; // red for hot
  else if (high >= 80) barColor = '#f59e0b'; // amber for warm
  else if (high >= 65) barColor = '#22c55e'; // green for mild
  else if (high >= 50) barColor = '#06b6d4'; // cyan for cool

  return (
    <div className="flex items-center gap-2 text-sm">
      <span style={{ color: 'var(--text-muted)', minWidth: '35px' }}>{low}°</span>
      <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            marginLeft: `${leftPct}%`,
            width: `${widthPct}%`,
            background: barColor,
          }}
        />
      </div>
      <span style={{ color: 'var(--text-primary)', fontWeight: 600, minWidth: '35px' }}>{high}°</span>
    </div>
  );
}

function RainBar({ probability }: { probability: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span>💧</span>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${probability}%`,
            background: probability > 60 ? '#3b82f6' : probability > 30 ? '#93c5fd' : '#dbeafe',
          }}
        />
      </div>
      <span style={{ color: 'var(--text-muted)', minWidth: '30px' }}>{probability}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function WeatherClient({ tripName, destination, startDate, endDate }: WeatherClientProps) {
  const [weather, setWeather] = useState<WeatherApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const params = new URLSearchParams({ destination, startDate, endDate });
        const res = await fetch(`/api/weather/?${params.toString()}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setWeather(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchWeather();
  }, [destination, startDate, endDate]);

  // Format date for display
  function formatDay(dateStr: string): { day: string; date: string } {
    const d = new Date(dateStr + 'T12:00:00');
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="container space-y-8 animate-fade-in px-4 sm:px-6">
        {/* Header skeleton */}
        <div className="text-center">
          <div className="badge badge-primary mb-4">🌤️ Weather</div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
            Trip <span className="text-gradient">Weather</span>
          </h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>Loading forecast...</p>
        </div>
        {/* Skeleton cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="card animate-pulse" style={{ minHeight: '200px' }}>
              <div className="h-4 rounded" style={{ background: 'var(--border)', width: '60%' }} />
              <div className="h-8 rounded mt-3" style={{ background: 'var(--border)', width: '40%' }} />
              <div className="h-3 rounded mt-4" style={{ background: 'var(--border)' }} />
              <div className="h-3 rounded mt-2" style={{ background: 'var(--border)', width: '80%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  if (error || !weather) {
    return (
      <div className="container space-y-8 animate-fade-in px-4 sm:px-6">
        <div className="text-center">
          <div className="badge badge-primary mb-4">🌤️ Weather</div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
            Trip <span className="text-gradient">Weather</span>
          </h1>
        </div>
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🌥️</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Weather data unavailable
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            We couldn&apos;t load weather information for {destination}. Try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Summary stats
  // ---------------------------------------------------------------------------

  const avgHigh = Math.round(weather.days.reduce((s, d) => s + d.highTemp, 0) / weather.days.length);
  const avgLow = Math.round(weather.days.reduce((s, d) => s + d.lowTemp, 0) / weather.days.length);
  const rainyDays = weather.days.filter(d => d.precipProbability > 40).length;
  const totalPrecip = Math.round(weather.days.reduce((s, d) => s + d.precipInches, 0) * 100) / 100;
  const maxWind = Math.max(...weather.days.map(d => d.windSpeedMph));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="container space-y-8 animate-fade-in px-4 sm:px-6">
      {/* Header */}
      <div className="text-center">
        <div className="badge badge-primary mb-4">🌤️ Weather</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
          Trip <span className="text-gradient">Weather</span>
        </h1>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          {weather.source === 'forecast'
            ? `Live forecast for ${destination}`
            : `Historical averages for ${destination} based on past years`
          }
        </p>
        {/* Source badge */}
        <div className="mt-3">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide"
            style={{
              background: weather.source === 'forecast' ? '#dcfce7' : '#e0e7ff',
              color: weather.source === 'forecast' ? '#166534' : '#3730a3',
              border: `1px solid ${weather.source === 'forecast' ? '#86efac' : '#a5b4fc'}`,
            }}
          >
            {weather.source === 'forecast' ? '📡 Live Forecast' : '📊 Historical Average'}
          </span>
        </div>
      </div>

      {/* Weekly Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center py-6">
          <div className="text-3xl mb-2">🌡️</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{avgHigh}° / {avgLow}°</div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Avg High / Low</div>
        </div>
        <div className="card text-center py-6">
          <div className="text-3xl mb-2">🌧️</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{rainyDays}</div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Rainy Days</div>
        </div>
        <div className="card text-center py-6">
          <div className="text-3xl mb-2">💧</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalPrecip}&quot;</div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Rainfall</div>
        </div>
        <div className="card text-center py-6">
          <div className="text-3xl mb-2">💨</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{maxWind} mph</div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Max Wind</div>
        </div>
      </div>

      {/* Daily Forecast */}
      <div>
        <h2 className="font-display text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Daily <span className="text-gradient">Breakdown</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {weather.days.map((day) => {
            const { day: dayName, date: dateStr } = formatDay(day.date);
            return (
              <div key={day.date} className="card space-y-3">
                {/* Date header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{dayName}</div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{dateStr}</div>
                  </div>
                  <div className="text-3xl" title={getWeatherDescription(day.weatherCode)}>
                    {getWeatherEmoji(day.weatherCode)}
                  </div>
                </div>

                {/* Weather description */}
                <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {getWeatherDescription(day.weatherCode)}
                </div>

                {/* Temp bar */}
                <TempBar low={day.lowTemp} high={day.highTemp} />

                {/* Rain probability */}
                <RainBar probability={day.precipProbability} />

                {/* Wind + precip details */}
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>💨 {day.windSpeedMph} mph</span>
                  {day.precipInches > 0 && <span>🌧️ {day.precipInches}&quot;</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Packing Tips */}
      {weather.packingTips.length > 0 && (
        <div>
          <h2 className="font-display text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Packing <span className="text-gradient">Tips</span>
          </h2>
          <div className="card">
            <div className="space-y-3">
              {weather.packingTips.map((tip, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-2"
                  style={{
                    borderBottom: i < weather.packingTips.length - 1 ? '1px solid var(--border)' : undefined,
                  }}
                >
                  <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {tip}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
