'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SiteConfig {
  tripName?: string
  destination?: string
  startDate?: string
  endDate?: string
  brandColor?: string
  lodgings?: Array<unknown>
  hasPassword?: boolean
  hasLlmKey?: boolean
  llmProvider?: string
  setupComplete?: boolean
}

export default function SettingsPage() {
  const router = useRouter()
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Reset modal state
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetInput, setResetInput] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState('')

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/setup/config/')
      if (!res.ok) throw new Error('Failed to fetch config')
      const data = await res.json()
      setConfig(data)
    } catch {
      setError('Could not load configuration.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const handleReset = async () => {
    if (resetInput !== 'RESET') return
    setResetting(true)
    setResetError('')

    try {
      const res = await fetch('/api/setup/config/', { method: 'DELETE' })
      if (!res.ok) throw new Error('Reset failed')

      // Clear all vh- localStorage keys
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('vh-')) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key))

      window.location.href = '/setup'
    } catch {
      setResetError('Failed to reset. Please try again.')
      setResetting(false)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}
      >
        <p style={{ color: 'var(--text-muted)' }}>Loading settings...</p>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="container" style={{ maxWidth: '720px', padding: '2rem 1rem' }}>
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">⚙️</span>
            <h1
              className="text-2xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              Settings
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            View your site configuration and manage your vacation hub.
          </p>
        </div>

        {error && (
          <div
            className="rounded-lg p-4 mb-6"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--accent-red)',
              color: 'var(--accent-red)',
            }}
          >
            {error}
          </div>
        )}

        {/* Site Configuration */}
        <div className="card mb-6" style={{ borderLeftColor: 'var(--brand)' }}>
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            Site Configuration
          </h2>

          {config && config.setupComplete ? (
            <div className="space-y-3">
              <ConfigRow label="Trip Name" value={config.tripName || '—'} />
              <ConfigRow label="Destination" value={config.destination || '—'} />
              <ConfigRow
                label="Dates"
                value={`${formatDate(config.startDate)} – ${formatDate(config.endDate)}`}
              />
              <div
                className="flex items-center justify-between py-2"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Brand Color
                </span>
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      display: 'inline-block',
                      width: '1.25rem',
                      height: '1.25rem',
                      borderRadius: '0.25rem',
                      background: config.brandColor || 'var(--brand)',
                      border: '1px solid var(--border)',
                    }}
                  />
                  <span
                    className="text-sm"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {config.brandColor || 'Default'}
                  </span>
                </div>
              </div>
              <ConfigRow
                label="Lodgings"
                value={
                  config.lodgings
                    ? `${config.lodgings.length} configured`
                    : '0 configured'
                }
              />
              <ConfigRow
                label="Password"
                value={config.hasPassword ? '✓ Set' : '✗ Not set'}
                valueColor={
                  config.hasPassword
                    ? 'var(--accent-green)'
                    : 'var(--text-muted)'
                }
              />
              <ConfigRow
                label="LLM API Key"
                value={config.hasLlmKey ? '✓ Set' : '✗ Not set'}
                valueColor={
                  config.hasLlmKey
                    ? 'var(--accent-green)'
                    : 'var(--text-muted)'
                }
              />
              <ConfigRow
                label="LLM Provider"
                value={config.llmProvider || '—'}
                noBorder
              />
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Setup has not been completed yet.
            </p>
          )}

          <div className="mt-6">
            <button
              className="btn btn-primary"
              onClick={() => router.push('/setup')}
            >
              Edit Configuration
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--accent-red)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <h2
            className="text-lg font-semibold mb-1"
            style={{ color: 'var(--accent-red)' }}
          >
            Danger Zone
          </h2>
          <p
            className="text-sm mb-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            Permanently delete all data and start over from scratch. This cannot
            be undone.
          </p>
          <button
            className="btn"
            style={{
              background: 'transparent',
              color: 'var(--accent-red)',
              border: '1px solid var(--accent-red)',
            }}
            onClick={() => {
              setShowResetModal(true)
              setResetInput('')
              setResetError('')
            }}
          >
            Reset Everything
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !resetting) {
              setShowResetModal(false)
            }
          }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-md animate-fade-in"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Are you sure?
            </h3>
            <p
              className="text-sm mb-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              This will permanently delete <strong>all</strong> configuration,
              itinerary events, activity suggestions, travel notes, and photos.
              This action cannot be undone.
            </p>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Type <strong style={{ color: 'var(--accent-red)' }}>RESET</strong>{' '}
              to confirm
            </label>
            <input
              type="text"
              className="input w-full mb-4"
              placeholder="RESET"
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              autoFocus
              disabled={resetting}
            />
            {resetError && (
              <p
                className="text-sm mb-3"
                style={{ color: 'var(--accent-red)' }}
              >
                {resetError}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                className="btn btn-secondary"
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{
                  background:
                    resetInput === 'RESET' && !resetting
                      ? 'var(--accent-red)'
                      : 'var(--bg-elevated)',
                  color:
                    resetInput === 'RESET' && !resetting
                      ? 'white'
                      : 'var(--text-muted)',
                  border: 'none',
                  cursor:
                    resetInput === 'RESET' && !resetting
                      ? 'pointer'
                      : 'not-allowed',
                }}
                disabled={resetInput !== 'RESET' || resetting}
                onClick={handleReset}
              >
                {resetting ? 'Resetting...' : 'Reset Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ConfigRow({
  label,
  value,
  valueColor,
  noBorder,
}: {
  label: string
  value: string
  valueColor?: string
  noBorder?: boolean
}) {
  return (
    <div
      className="flex items-center justify-between py-2"
      style={noBorder ? {} : { borderBottom: '1px solid var(--border)' }}
    >
      <span
        className="text-sm font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </span>
      <span
        className="text-sm"
        style={{ color: valueColor || 'var(--text-primary)' }}
      >
        {value}
      </span>
    </div>
  )
}
