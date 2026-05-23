'use client'

import { useState, useEffect } from 'react'

export default function PasswordPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [tripName, setTripName] = useState('Vacation Hub')
  const [tagline, setTagline] = useState('Group Vacation Hub')

  useEffect(() => {
    // Fetch config for display (public-safe fields only)
    fetch('/api/setup/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.tripName) setTripName(data.tripName)
        if (data.tagline) setTagline(data.tagline)
      })
      .catch(() => {
        // Config not available; use defaults
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password, rememberMe }),
      })

      if (response.ok) {
        setIsSuccess(true)
        setTimeout(() => {
          window.location.href = '/'
        }, 100)
      } else {
        setError('Incorrect password. Please try again.')
        setPassword('')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div
        className="rounded-2xl shadow-2xl p-8 w-full max-w-md"
        style={{ background: 'var(--bg-card)' }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🌴</div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            {tripName}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>{tagline}</p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Enter Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg focus:ring-2 transition-colors"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
              placeholder="Password required"
              autoFocus
              required
              disabled={isLoading || isSuccess}
            />
            {error && (
              <p
                className="mt-2 text-sm"
                style={{ color: 'var(--accent-red, #ef4444)' }}
              >
                {error}
              </p>
            )}
            {isSuccess && (
              <p
                className="mt-2 text-sm"
                style={{ color: 'var(--accent-green, #22c55e)' }}
              >
                ✓ Authentication successful! Redirecting...
              </p>
            )}
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-5 w-5 rounded"
              style={{ accentColor: 'var(--brand)' }}
              disabled={isLoading || isSuccess}
            />
            <label
              htmlFor="rememberMe"
              className="ml-2 block text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              Remember me for 30 days
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading || isSuccess}
            className="w-full text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:ring-2 focus:ring-offset-2"
            style={{
              background: isLoading || isSuccess
                ? 'color-mix(in srgb, var(--brand) 50%, transparent)'
                : 'var(--brand)',
              cursor: isLoading || isSuccess ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading
              ? 'Checking...'
              : isSuccess
              ? 'Redirecting...'
              : 'Access Site'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            This site contains private group information
          </p>
        </div>
      </div>
    </div>
  )
}
