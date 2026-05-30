"use client";

import { useState, useCallback } from 'react';

interface CalendarExportProps {
  tripName: string;
}

export default function CalendarExport({ tripName }: CalendarExportProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [subscribeUrl, setSubscribeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSubscribeUrl = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/itinerary/export/token/');
      if (!res.ok) throw new Error('Failed to generate subscription URL');
      const { token } = await res.json();
      const base = window.location.origin;
      setSubscribeUrl(`${base}/api/itinerary/export?token=${token}`);
    } catch {
      setError('Could not generate subscription URL');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggle = async () => {
    if (!showPanel) {
      setShowPanel(true);
      if (!subscribeUrl) {
        await generateSubscribeUrl();
      }
    } else {
      setShowPanel(false);
    }
  };

  const handleDownload = () => {
    // Direct download — browser sends cookies automatically
    window.open('/api/itinerary/export', '_blank');
  };

  const handleCopy = async () => {
    if (!subscribeUrl) return;
    try {
      await navigator.clipboard.writeText(subscribeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS / older browsers
      const input = document.createElement('input');
      input.value = subscribeUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const webcalUrl = subscribeUrl?.replace(/^https?:\/\//, 'webcal://') ?? '';

  return (
    <div>
      <button
        onClick={handleToggle}
        className="btn btn-outline flex items-center gap-2"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        Sync to Calendar
      </button>

      {showPanel && (
        <div
          className="mt-4 rounded-xl p-5 space-y-5 animate-fade-in"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Header */}
          <div>
            <h3
              className="font-display text-lg font-semibold mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              Calendar Sync
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Add the {tripName} itinerary to your calendar app. Events stay in sync automatically.
            </p>
          </div>

          {error && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{
                background: 'color-mix(in srgb, var(--accent-red) 15%, transparent)',
                color: 'var(--accent-red)',
              }}
            >
              {error}
            </div>
          )}

          {/* Option 1: Download .ics */}
          <div
            className="rounded-lg p-4"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'color-mix(in srgb, var(--brand) 15%, transparent)',
                }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  style={{ color: 'var(--brand)' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p
                  className="font-medium text-sm mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Download .ics File
                </p>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                  One-time import. Open the file to add all events to your calendar.
                  Works with Google Calendar, Apple Calendar, Outlook, and more.
                </p>
                <button onClick={handleDownload} className="btn btn-sm btn-primary">
                  Download
                </button>
              </div>
            </div>
          </div>

          {/* Option 2: Subscribe URL */}
          <div
            className="rounded-lg p-4"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'color-mix(in srgb, #10b981 15%, transparent)',
                }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  style={{ color: '#10b981' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p
                    className="font-medium text-sm"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Subscribe (Auto-Sync)
                  </p>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{
                      background: 'color-mix(in srgb, #10b981 15%, transparent)',
                      color: '#10b981',
                    }}
                  >
                    Recommended
                  </span>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                  Your calendar will automatically pull new events as they&apos;re added.
                  Updates every few hours depending on your calendar app.
                </p>

                {loading ? (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <div
                      className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full"
                      style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }}
                    />
                    Generating URL...
                  </div>
                ) : subscribeUrl ? (
                  <div className="space-y-3">
                    {/* Subscription URL */}
                    <div
                      className="flex items-center gap-2 rounded-lg p-2.5"
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <code
                        className="flex-1 text-xs break-all select-all"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {subscribeUrl}
                      </code>
                      <button
                        onClick={handleCopy}
                        className="btn btn-sm btn-outline flex-shrink-0"
                        title="Copy URL"
                      >
                        {copied ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>

                    {/* Quick-add buttons */}
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline"
                      >
                        Google Calendar
                      </a>
                      <a
                        href={webcalUrl}
                        className="btn btn-sm btn-outline"
                      >
                        Apple Calendar
                      </a>
                      <a
                        href={webcalUrl}
                        className="btn btn-sm btn-outline"
                      >
                        Outlook
                      </a>
                    </div>

                    <p
                      className="text-xs flex items-center gap-1.5"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <svg
                        className="w-3.5 h-3.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      This URL contains an access token. Only share it with people who should see the itinerary.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
