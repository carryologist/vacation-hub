'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LodgingHighlight {
  key: string;
  value: string;
}

interface LodgingFormData {
  name: string;
  address: string;
  url: string;
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  description: string;
  imageUrls: string;
  highlights: LodgingHighlight[];
}

interface WizardState {
  // Step 1
  tripName: string;
  destination: string;
  tagline: string;
  startDate: string;
  endDate: string;
  timezone: string;
  // Step 2
  brandColor: string;
  heroImageUrl: string;
  // Step 3
  lodgings: LodgingFormData[];
  // Step 4
  password: string;
  passwordConfirm: string;
  // Step 5
  llmProvider: 'openai' | 'anthropic' | 'gemini' | null;
  llmApiKey: string;
  generatedCount: number;
  skipAI: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Basics', 'Branding', 'Lodging', 'Password', 'AI Generation', 'Review'];
const TOTAL_STEPS = 6;

const PRESET_COLORS = [
  { hex: '#ef4444', name: 'Red' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#eab308', name: 'Yellow' },
  { hex: '#22c55e', name: 'Green' },
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#8b5cf6', name: 'Purple' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#06b6d4', name: 'Cyan' },
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'America/Toronto',
  'America/Vancouver',
  'America/Phoenix',
  'America/Sao_Paulo',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Pacific/Auckland',
];

const EMPTY_LODGING: LodgingFormData = {
  name: '',
  address: '',
  url: '',
  checkIn: '',
  checkOut: '',
  checkInTime: '15:00',
  checkOutTime: '11:00',
  description: '',
  imageUrls: '',
  highlights: [],
};

const DEFAULT_STATE: WizardState = {
  tripName: '',
  destination: '',
  tagline: '',
  startDate: '',
  endDate: '',
  timezone: 'America/New_York',
  brandColor: '#3b82f6',
  heroImageUrl: '',
  lodgings: [{ ...EMPTY_LODGING }],
  password: '',
  passwordConfirm: '',
  llmProvider: null,
  llmApiKey: '',
  generatedCount: 0,
  skipAI: false,
};

// ─── Reusable Sub-components (defined outside to preserve identity across renders)

function WizardField({ label, name, errors, stepAttempted, children }: {
  label: string;
  name: string;
  errors: Record<string, string>;
  stepAttempted: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{
        display: 'block',
        fontSize: '0.8125rem',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        marginBottom: '0.375rem',
      }}>{label}</label>
      {children}
      {stepAttempted && errors[name] && (
        <p style={{ color: 'var(--accent-red)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
          {errors[name]}
        </p>
      )}
    </div>
  );
}

function WizardInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  onBlur: onBlurProp,
}: {
  name?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  onBlur?: () => void;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '0.625rem 0.875rem',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        color: 'var(--text-primary)',
        fontSize: '0.9375rem',
        outline: 'none',
        transition: 'border-color 0.15s',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; onBlurProp?.(); }}
    />
  );
}

// ─── Summary helpers (outside component for stable identity) ──────────────────

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '1rem', border: '1px solid var(--border)' }}>
      <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function SummaryRow({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem', alignItems: 'baseline' }}>
      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', minWidth: 80, flexShrink: 0 }}>{label}:</span>
      <span
        style={{
          fontSize: '0.875rem',
          color: 'var(--text-primary)',
          ...(truncate ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const } : {}),
        }}
      >
        {value}
      </span>
    </div>
  );
}

function WizardProgressBar({ step }: { step: number }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === step;
          const isComplete = stepNum < step;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < STEP_LABELS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    background: isActive ? 'var(--brand)' : isComplete ? 'var(--accent-green)' : 'var(--bg-elevated)',
                    color: isActive || isComplete ? '#fff' : 'var(--text-muted)',
                    border: isActive ? 'none' : '2px solid ' + (isComplete ? 'var(--accent-green)' : 'var(--border)'),
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  {isComplete ? '\u2713' : stepNum}
                </div>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: isActive ? 'var(--brand)' : isComplete ? 'var(--accent-green)' : 'var(--text-muted)',
                    fontWeight: isActive ? 600 : 400,
                    marginTop: 4,
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}
                  className="hidden sm:block"
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: isComplete ? 'var(--accent-green)' : 'var(--border)',
                    margin: '0 0.5rem',
                    marginBottom: '1rem',
                    transition: 'background 0.2s',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '2rem',
  boxShadow: 'var(--shadow-md)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  fontSize: '0.9375rem',
  outline: 'none',
  transition: 'border-color 0.15s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '0.375rem',
};

const btnBase: React.CSSProperties = {
  padding: '0.625rem 1.5rem',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '0.9375rem',
  cursor: 'pointer',
  border: 'none',
  transition: 'all 0.15s',
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: 'var(--brand)',
  color: '#fff',
};

const btnSecondary: React.CSSProperties = {
  ...btnBase,
  background: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
};

const btnDanger: React.CSSProperties = {
  ...btnBase,
  background: 'var(--accent-red)',
  color: '#fff',
  padding: '0.375rem 0.875rem',
  fontSize: '0.8125rem',
};

const btnSmall: React.CSSProperties = {
  ...btnBase,
  padding: '0.375rem 0.875rem',
  fontSize: '0.8125rem',
  background: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
};

const errorStyle: React.CSSProperties = {
  color: 'var(--accent-red)',
  fontSize: '0.8125rem',
  marginTop: '0.25rem',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(DEFAULT_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stepAttempted, setStepAttempted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState('');
  const [customColorInput, setCustomColorInput] = useState('');
  const [useCustomColor, setUseCustomColor] = useState(false);

  // ─── State helpers ────────────────────────────────────────────────────────

  const update = useCallback(<K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState(prev => ({ ...prev, [key]: value }));
    // Clear all errors when user starts editing — they'll revalidate on Next
    setErrors({});
    setStepAttempted(false);
  }, []);

  const updateLodging = useCallback((index: number, field: keyof LodgingFormData, value: string | LodgingHighlight[]) => {
    setState(prev => {
      const lodgings = [...prev.lodgings];
      lodgings[index] = { ...lodgings[index], [field]: value };
      return { ...prev, lodgings };
    });
    setErrors({});
    setStepAttempted(false);
  }, []);

  // Auto-populate lodging address, URL, and dates from the name + destination
  const autofillLodging = useCallback((index: number) => {
    setState(prev => {
      const lodging = prev.lodgings[index];
      const name = lodging.name.trim();
      if (!name) return prev;

      const destination = prev.destination.trim();
      const lodgings = [...prev.lodgings];
      const updated = { ...lodgings[index] };
      let changed = false;

      // Auto-fill address if empty
      if (!updated.address.trim() && destination) {
        updated.address = `${name}, ${destination}`;
        changed = true;
      }

      // Auto-fill URL if empty — Google Maps search link
      if (!updated.url.trim()) {
        const query = encodeURIComponent(destination ? `${name} ${destination}` : name);
        updated.url = `https://www.google.com/maps/search/${query}`;
        changed = true;
      }

      // Auto-fill check-in/out dates from trip dates if empty
      if (!updated.checkIn && prev.startDate) {
        updated.checkIn = prev.startDate;
        changed = true;
      }
      if (!updated.checkOut && prev.endDate) {
        updated.checkOut = prev.endDate;
        changed = true;
      }

      if (!changed) return prev;
      lodgings[index] = updated;
      return { ...prev, lodgings };
    });
  }, []);

  const addLodging = useCallback(() => {
    setState(prev => ({ ...prev, lodgings: [...prev.lodgings, { ...EMPTY_LODGING }] }));
  }, []);

  const removeLodging = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      lodgings: prev.lodgings.filter((_, i) => i !== index),
    }));
  }, []);

  const addHighlight = useCallback((lodgingIndex: number) => {
    setState(prev => {
      const lodgings = [...prev.lodgings];
      lodgings[lodgingIndex] = {
        ...lodgings[lodgingIndex],
        highlights: [...lodgings[lodgingIndex].highlights, { key: '', value: '' }],
      };
      return { ...prev, lodgings };
    });
  }, []);

  const removeHighlight = useCallback((lodgingIndex: number, highlightIndex: number) => {
    setState(prev => {
      const lodgings = [...prev.lodgings];
      lodgings[lodgingIndex] = {
        ...lodgings[lodgingIndex],
        highlights: lodgings[lodgingIndex].highlights.filter((_, i) => i !== highlightIndex),
      };
      return { ...prev, lodgings };
    });
  }, []);

  const updateHighlight = useCallback((lodgingIndex: number, highlightIndex: number, field: 'key' | 'value', val: string) => {
    setState(prev => {
      const lodgings = [...prev.lodgings];
      const highlights = [...lodgings[lodgingIndex].highlights];
      highlights[highlightIndex] = { ...highlights[highlightIndex], [field]: val };
      lodgings[lodgingIndex] = { ...lodgings[lodgingIndex], highlights };
      return { ...prev, lodgings };
    });
  }, []);

  // ─── Validation ───────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!state.tripName.trim()) errs.tripName = 'Trip name is required';
      if (!state.destination.trim()) errs.destination = 'Destination is required';
      if (!state.startDate) errs.startDate = 'Start date is required';
      if (!state.endDate) errs.endDate = 'End date is required';
      if (state.startDate && state.endDate && state.startDate > state.endDate) {
        errs.endDate = 'End date must be after start date';
      }
    }

    if (step === 2) {
      if (useCustomColor) {
        const hex = customColorInput.trim();
        if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
          errs.brandColor = 'Enter a valid hex color (e.g. #ff5500)';
        }
      }
    }

    if (step === 4) {
      if (!state.password) errs.password = 'Password is required';
      else if (state.password.length < 4) errs.password = 'Minimum 4 characters';
      if (state.password !== state.passwordConfirm) errs.passwordConfirm = 'Passwords do not match';
    }

    if (step === 5 && !state.skipAI) {
      if (state.llmProvider && !state.llmApiKey.trim()) {
        errs.llmApiKey = 'API key is required when a provider is selected';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── Navigation ───────────────────────────────────────────────────────────

  const next = () => {
    setStepAttempted(true);
    if (!validate()) return;
    // Sync custom color
    if (step === 2 && useCustomColor) {
      update('brandColor', customColorInput.trim());
    }
    setStepAttempted(false);
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  };

  const back = () => { setStepAttempted(false); setErrors({}); setStep(s => Math.max(s - 1, 1)); };

  // ─── AI Generation ────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!state.llmProvider || !state.llmApiKey.trim()) {
      setErrors({ llmApiKey: 'Select a provider and enter an API key' });
      return;
    }
    setIsGenerating(true);
    setErrors({});
    try {
      const res = await fetch('/api/setup/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: state.llmProvider,
          apiKey: state.llmApiKey,
          tripName: state.tripName,
          destination: state.destination,
          startDate: state.startDate,
          endDate: state.endDate,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Generation failed');
      }
      const data = await res.json();
      update('generatedCount', data.count ?? 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      setErrors({ generate: message });
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Launch ───────────────────────────────────────────────────────────────

  const handleLaunch = async () => {
    setIsLaunching(true);
    setLaunchError('');
    try {
      // 1. POST config
      const configPayload = {
        tripName: state.tripName,
        destination: state.destination,
        tagline: state.tagline,
        startDate: state.startDate,
        endDate: state.endDate,
        timezone: state.timezone,
        brandColor: state.brandColor,
        heroImageUrl: state.heroImageUrl,
        lodgings: state.lodgings.filter(l => l.name.trim()).map(l => ({
          ...l,
          imageUrls: l.imageUrls
            ? l.imageUrls.split(',').map(u => u.trim()).filter(Boolean)
            : [],
          highlights: l.highlights.filter(h => h.key.trim() || h.value.trim()),
        })),
        password: state.password,
        llmProvider: state.skipAI ? null : state.llmProvider,
        llmApiKey: state.skipAI ? '' : state.llmApiKey,
        setupComplete: true,
      };

      const configRes = await fetch('/api/setup/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configPayload),
      });
      if (!configRes.ok) {
        const data = await configRes.json().catch(() => ({}));
        throw new Error(data.error || `Config save failed (${configRes.status})`);
      }

      // 2. Init database tables
      await fetch('/api/db/init', { method: 'POST' }).catch(() => {});

      // 3. Authenticate (auto-login after setup)
      const authRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: state.password, rememberMe: true }),
      });
      if (!authRes.ok) {
        // Auth failed but config is saved — redirect to password page instead
        window.location.href = '/password';
        return;
      }

      // 4. Redirect
      window.location.href = '/';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Launch failed';
      setLaunchError(message);
      // Scroll error into view
      setTimeout(() => {
        document.querySelector('[data-launch-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } finally {
      setIsLaunching(false);
    }
  };

  // ─── Step Renderers ───────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        Trip Basics
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        Tell us about your trip — the essentials.
      </p>

      <WizardField errors={errors} stepAttempted={stepAttempted} label="Trip Name *" name="tripName">
        <WizardInput name="tripName" value={state.tripName} onChange={v => update('tripName', v)} placeholder="e.g. Beach Week 2026" />
      </WizardField>

      <WizardField errors={errors} stepAttempted={stepAttempted} label="Destination *" name="destination">
        <WizardInput name="destination" value={state.destination} onChange={v => update('destination', v)} placeholder="e.g. Tulum, Mexico" />
      </WizardField>

      <WizardField errors={errors} stepAttempted={stepAttempted} label="Tagline" name="tagline">
        <WizardInput name="tagline" value={state.tagline} onChange={v => update('tagline', v)} placeholder="e.g. Sun, sand, and good times" />
      </WizardField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <WizardField errors={errors} stepAttempted={stepAttempted} label="Start Date *" name="startDate">
          <WizardInput name="startDate" type="date" value={state.startDate} onChange={v => update('startDate', v)} />
        </WizardField>
        <WizardField errors={errors} stepAttempted={stepAttempted} label="End Date *" name="endDate">
          <WizardInput name="endDate" type="date" value={state.endDate} onChange={v => update('endDate', v)} />
        </WizardField>
      </div>

      <WizardField errors={errors} stepAttempted={stepAttempted} label="Timezone" name="timezone">
        <select
          value={state.timezone}
          onChange={e => update('timezone', e.target.value)}
          style={inputStyle}
        >
          {TIMEZONES.map(tz => (
            <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </WizardField>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        Branding
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        Choose a brand color and optional hero image.
      </p>

      <WizardField errors={errors} stepAttempted={stepAttempted} label="Brand Color" name="brandColor">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {PRESET_COLORS.map(c => (
            <button
              key={c.hex}
              type="button"
              onClick={() => { update('brandColor', c.hex); setUseCustomColor(false); }}
              title={c.name}
              style={{
                width: 40,
                height: 40,
                borderRadius: '8px',
                background: c.hex,
                border: !useCustomColor && state.brandColor === c.hex ? '3px solid var(--text-primary)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
                outline: !useCustomColor && state.brandColor === c.hex ? '2px solid var(--bg-primary)' : 'none',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={useCustomColor}
            onChange={e => {
              setUseCustomColor(e.target.checked);
              if (e.target.checked && customColorInput) {
                update('brandColor', customColorInput);
              }
            }}
            id="customColorToggle"
          />
          <label htmlFor="customColorToggle" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Custom hex color
          </label>
          {useCustomColor && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <input
                type="text"
                value={customColorInput}
                onChange={e => {
                  setCustomColorInput(e.target.value);
                  if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                    update('brandColor', e.target.value);
                  }
                }}
                placeholder="#ff5500"
                style={{ ...inputStyle, maxWidth: 140 }}
              />
              {/^#[0-9a-fA-F]{6}$/.test(customColorInput) && (
                <div style={{ width: 32, height: 32, borderRadius: '6px', background: customColorInput, border: '1px solid var(--border)' }} />
              )}
            </div>
          )}
        </div>
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Preview:</span>
          <div style={{ height: 8, flex: 1, borderRadius: 4, background: state.brandColor, transition: 'background 0.2s' }} />
        </div>
      </WizardField>

      <WizardField errors={errors} stepAttempted={stepAttempted} label="Hero Image URL" name="heroImageUrl">
        <WizardInput name="heroImageUrl" value={state.heroImageUrl} onChange={v => update('heroImageUrl', v)} placeholder="https://example.com/hero.jpg" />
        {state.heroImageUrl && (
          <div style={{ marginTop: '0.75rem', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.heroImageUrl}
              alt="Hero preview"
              style={{ width: '100%', height: 160, objectFit: 'cover' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
      </WizardField>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        Lodging
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        Add your accommodations. You can skip this and add later.
      </p>

      {state.lodgings.map((lodging, li) => (
        <div
          key={li}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '1.25rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Lodging {li + 1}
            </h3>
            {state.lodgings.length > 1 && (
              <button type="button" onClick={() => removeLodging(li)} style={btnDanger}>
                Remove
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Name</label>
              <WizardInput name={`lodging-${li}-name`} value={lodging.name} onChange={v => updateLodging(li, 'name', v)} placeholder="e.g. Beach House" onBlur={() => autofillLodging(li)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Address</label>
              <WizardInput name={`lodging-${li}-address`} value={lodging.address} onChange={v => updateLodging(li, 'address', v)} placeholder="123 Main St, City" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>URL</label>
              <WizardInput name={`lodging-${li}-url`} value={lodging.url} onChange={v => updateLodging(li, 'url', v)} placeholder="https://airbnb.com/rooms/..." />
            </div>
            <div>
              <label style={labelStyle}>Check-in Date</label>
              <WizardInput name={`lodging-${li}-checkIn`} type="date" value={lodging.checkIn} onChange={v => updateLodging(li, 'checkIn', v)} />
            </div>
            <div>
              <label style={labelStyle}>Check-out Date</label>
              <WizardInput name={`lodging-${li}-checkOut`} type="date" value={lodging.checkOut} onChange={v => updateLodging(li, 'checkOut', v)} />
            </div>
            <div>
              <label style={labelStyle}>Check-in Time</label>
              <WizardInput name={`lodging-${li}-checkInTime`} type="time" value={lodging.checkInTime} onChange={v => updateLodging(li, 'checkInTime', v)} />
            </div>
            <div>
              <label style={labelStyle}>Check-out Time</label>
              <WizardInput name={`lodging-${li}-checkOutTime`} type="time" value={lodging.checkOutTime} onChange={v => updateLodging(li, 'checkOutTime', v)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Description</label>
              <textarea
                value={lodging.description}
                onChange={e => updateLodging(li, 'description', e.target.value)}
                placeholder="A short description of the property"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Image URLs (comma-separated)</label>
              <WizardInput name={`lodging-${li}-imageUrls`} value={lodging.imageUrls} onChange={v => updateLodging(li, 'imageUrls', v)} placeholder="https://img1.jpg, https://img2.jpg" />
            </div>
          </div>

          {/* Highlights */}
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Highlights</label>
              <button type="button" onClick={() => addHighlight(li)} style={btnSmall}>
                + Add
              </button>
            </div>
            {lodging.highlights.map((h, hi) => (
              <div key={hi} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={h.key}
                  onChange={e => updateHighlight(li, hi, 'key', e.target.value)}
                  placeholder="Key (e.g. Bedrooms)"
                  style={{ ...inputStyle, flex: '0 0 35%' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                />
                <input
                  type="text"
                  value={h.value}
                  onChange={e => updateHighlight(li, hi, 'value', e.target.value)}
                  placeholder="Value (e.g. 6)"
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                />
                <button type="button" onClick={() => removeHighlight(li, hi)} style={{ ...btnDanger, flexShrink: 0 }}>
                  ✕
                </button>
              </div>
            ))}
            {lodging.highlights.length === 0 && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No highlights yet. Add key-value pairs like &quot;Bedrooms: 6&quot;.
              </p>
            )}
          </div>
        </div>
      ))}

      <button type="button" onClick={addLodging} style={{ ...btnSecondary, width: '100%', marginTop: '0.5rem' }}>
        + Add Another Lodging
      </button>
    </div>
  );

  const renderStep4 = () => (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        Set Password
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        Protect your trip hub with a password. Share it with your group.
      </p>

      <WizardField errors={errors} stepAttempted={stepAttempted} label="Password *" name="password">
        <WizardInput name="password" type="password" value={state.password} onChange={v => update('password', v)} placeholder="Minimum 4 characters" />
      </WizardField>

      <WizardField errors={errors} stepAttempted={stepAttempted} label="Confirm Password *" name="passwordConfirm">
        <WizardInput name="passwordConfirm" type="password" value={state.passwordConfirm} onChange={v => update('passwordConfirm', v)} placeholder="Re-enter password" />
      </WizardField>

      <div style={{ background: 'var(--brand-light)', borderRadius: 8, padding: '0.875rem', marginTop: '0.5rem' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          <strong>Tip:</strong> Pick something easy to share with your group — this isn&apos;t bank-level security, just a simple gate to keep your trip private.
        </p>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        AI Content Generation
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        Optionally generate activities and itinerary suggestions using AI.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input
          type="checkbox"
          id="skipAI"
          checked={state.skipAI}
          onChange={e => update('skipAI', e.target.checked)}
        />
        <label htmlFor="skipAI" style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Skip AI generation — I&apos;ll add content manually
        </label>
      </div>

      {!state.skipAI && (
        <>
          <WizardField errors={errors} stepAttempted={stepAttempted} label="LLM Provider" name="llmProvider">
            <select
              value={state.llmProvider ?? ''}
              onChange={e => update('llmProvider', (e.target.value || null) as WizardState['llmProvider'])}
              style={inputStyle}
            >
              <option value="">Select a provider...</option>
              <option value="openai">OpenAI (GPT)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="gemini">Google (Gemini)</option>
            </select>
          </WizardField>

          <WizardField errors={errors} stepAttempted={stepAttempted} label="API Key" name="llmApiKey">
            <WizardInput name="llmApiKey" type="password" value={state.llmApiKey} onChange={v => update('llmApiKey', v)} placeholder="sk-..." />
          </WizardField>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !state.llmProvider}
            style={{
              ...btnPrimary,
              width: '100%',
              opacity: isGenerating || !state.llmProvider ? 0.6 : 1,
              cursor: isGenerating || !state.llmProvider ? 'not-allowed' : 'pointer',
            }}
          >
            {isGenerating ? 'Generating...' : 'Generate Content'}
          </button>

          {errors.generate && <p style={{ ...errorStyle, marginTop: '0.5rem' }}>{errors.generate}</p>}

          {state.generatedCount > 0 && (
            <div
              style={{
                marginTop: '1rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid var(--accent-green)',
                borderRadius: 8,
                padding: '0.875rem',
              }}
            >
              <p style={{ color: 'var(--accent-green)', fontWeight: 600, fontSize: '0.9375rem' }}>
                ✓ Generated {state.generatedCount} item{state.generatedCount !== 1 ? 's' : ''} successfully!
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderStep6 = () => {
    const filledLodgings = state.lodgings.filter(l => l.name.trim());

    return (
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Review &amp; Launch
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
          Everything looks good? Hit Launch to set up your trip hub.
        </p>

        {/* Summary sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Basics */}
          <SummaryCard title="Basics">
            <SummaryRow label="Trip Name" value={state.tripName} />
            <SummaryRow label="Destination" value={state.destination} />
            {state.tagline && <SummaryRow label="Tagline" value={state.tagline} />}
            <SummaryRow label="Dates" value={`${state.startDate} → ${state.endDate}`} />
            <SummaryRow label="Timezone" value={state.timezone} />
          </SummaryCard>

          {/* Branding */}
          <SummaryCard title="Branding">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', minWidth: 80 }}>Color:</span>
              <div style={{ width: 20, height: 20, borderRadius: 4, background: state.brandColor, border: '1px solid var(--border)' }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{state.brandColor}</span>
            </div>
            {state.heroImageUrl && <SummaryRow label="Hero Image" value={state.heroImageUrl} truncate />}
          </SummaryCard>

          {/* Lodging */}
          <SummaryCard title="Lodging">
            {filledLodgings.length > 0 ? (
              filledLodgings.map((l, i) => (
                <div key={i} style={{ marginBottom: i < filledLodgings.length - 1 ? '0.5rem' : 0 }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{l.name}</span>
                  {l.address && <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>— {l.address}</span>}
                  {l.checkIn && l.checkOut && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {l.checkIn} → {l.checkOut}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No lodging added</p>
            )}
          </SummaryCard>

          {/* Password */}
          <SummaryCard title="Password">
            <SummaryRow label="Set" value={'•'.repeat(state.password.length)} />
          </SummaryCard>

          {/* AI */}
          <SummaryCard title="AI Generation">
            {state.skipAI ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Skipped</p>
            ) : (
              <>
                <SummaryRow label="Provider" value={state.llmProvider ?? 'None'} />
                {state.generatedCount > 0 && (
                  <SummaryRow label="Generated" value={`${state.generatedCount} item${state.generatedCount !== 1 ? 's' : ''}`} />
                )}
              </>
            )}
          </SummaryCard>
        </div>

        {launchError && (
          <div data-launch-error style={{ marginTop: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', borderRadius: 8, padding: '0.875rem' }}>
            <p style={{ color: 'var(--accent-red)', fontSize: '0.875rem' }}>{launchError}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleLaunch}
          disabled={isLaunching}
          style={{
            ...btnPrimary,
            width: '100%',
            marginTop: '1.5rem',
            padding: '0.875rem',
            fontSize: '1.0625rem',
            opacity: isLaunching ? 0.6 : 1,
            cursor: isLaunching ? 'not-allowed' : 'pointer',
            boxShadow: isLaunching ? 'none' : 'var(--shadow-glow)',
          }}
        >
          {isLaunching ? 'Launching...' : '🚀 Launch Trip Hub'}
        </button>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      default: return null;
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '0.375rem',
          }}
        >
          Setup Wizard
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>

      <WizardProgressBar step={step} />

      {/* Step content */}
      <div style={cardStyle}>
        {renderCurrentStep()}
      </div>

      {/* Navigation */}
      {step < TOTAL_STEPS && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
          {step > 1 ? (
            <button type="button" onClick={back} style={btnSecondary}>
              ← Back
            </button>
          ) : (
            <div />
          )}
          <button type="button" onClick={next} style={btnPrimary}>
            Next →
          </button>
        </div>
      )}

      {step === TOTAL_STEPS && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '1.5rem' }}>
          <button type="button" onClick={back} style={btnSecondary}>
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
