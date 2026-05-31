// ---------------------------------------------------------------------------
// Shared input-validation utilities for vacation-hub API routes
// ---------------------------------------------------------------------------

// ── Max-length constants ────────────────────────────────────────────────────
const MAX_TITLE = 500;
const MAX_DESCRIPTION = 5000;
const MAX_STRING = 1000;
const MAX_DESTINATION = 200;

// ── Allowed values ──────────────────────────────────────────────────────────
const ACTIVITY_CATEGORIES = [
  'Restaurants',
  'Attractions',
  'Entertainment',
  'Day Trips',
  'Outdoors',
  'Shopping',
] as const;

const AI_PROVIDERS = ['openai', 'anthropic', 'gemini'] as const;

// ── Result type ─────────────────────────────────────────────────────────────
export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; error: string };

// ---------------------------------------------------------------------------
// String helpers
// ---------------------------------------------------------------------------

/** True when `val` is a non-blank string (after trimming). */
export function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0;
}

/** True when `val` is null, undefined, or a non-blank string. */
export function isOptionalString(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  return isNonEmptyString(val);
}

/** True when `val` is absent or a valid http(s) URL string. */
export function isValidUrl(val: unknown): boolean {
  if (val === null || val === undefined || val === '') return true;
  if (typeof val !== 'string') return false;
  try {
    const url = new URL(val);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** True when `val` is a string that `Date` can parse. */
export function isValidDate(val: unknown): boolean {
  if (typeof val !== 'string' || val.trim().length === 0) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

/** True when `val` is in the `allowed` list. */
export function isValidCategory(val: unknown, allowed: string[]): boolean {
  return typeof val === 'string' && allowed.includes(val);
}

// ---------------------------------------------------------------------------
// Sanitisation
// ---------------------------------------------------------------------------

/** Strip all HTML tags from a string (prevents stored XSS). */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/** Trim, strip HTML, and enforce max length. */
function sanitize(val: string, maxLen: number): string {
  return stripHtml(val).trim().slice(0, maxLen);
}

/** If `val` is a non-empty string return the sanitised version, else undefined. */
function sanitizeOptional(val: unknown, maxLen: number): string | undefined {
  if (val === null || val === undefined) return undefined;
  if (typeof val !== 'string') return undefined;
  const s = sanitize(val, maxLen);
  return s.length > 0 ? s : undefined;
}

// ---------------------------------------------------------------------------
// Vercel Blob URL check
// ---------------------------------------------------------------------------
function isVercelBlobUrl(val: string): boolean {
  return (
    val.startsWith('https://') &&
    val.includes('.public.blob.vercel-storage.com')
  );
}

// ---------------------------------------------------------------------------
// Route-specific validators
// ---------------------------------------------------------------------------

export interface SanitizedActivity {
  title: string;
  description: string;
  category: string;
  location?: string;
  url?: string;
  suggested_by?: string;
  image_url?: string;
}

export function validateActivityInput(
  data: unknown,
): ValidationResult<SanitizedActivity> {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }
  const d = data as Record<string, unknown>;

  if (!isNonEmptyString(d.title)) {
    return { valid: false, error: 'title is required and must be a non-empty string' };
  }
  if (!isNonEmptyString(d.description)) {
    return { valid: false, error: 'description is required and must be a non-empty string' };
  }
  if (!isValidCategory(d.category, [...ACTIVITY_CATEGORIES])) {
    return {
      valid: false,
      error: `category must be one of: ${ACTIVITY_CATEGORIES.join(', ')}`,
    };
  }
  if (!isOptionalString(d.location)) {
    return { valid: false, error: 'location must be a string if provided' };
  }
  if (!isValidUrl(d.url)) {
    return { valid: false, error: 'url must be a valid http/https URL if provided' };
  }
  if (!isOptionalString(d.suggested_by)) {
    return { valid: false, error: 'suggested_by must be a string if provided' };
  }
  if (!isValidUrl(d.image_url)) {
    return { valid: false, error: 'image_url must be a valid http/https URL if provided' };
  }

  return {
    valid: true,
    data: {
      title: sanitize(d.title as string, MAX_TITLE),
      description: sanitize(d.description as string, MAX_DESCRIPTION),
      category: d.category as string,
      location: sanitizeOptional(d.location, MAX_STRING),
      url: sanitizeOptional(d.url, MAX_STRING),
      suggested_by: sanitizeOptional(d.suggested_by, MAX_STRING),
      image_url: sanitizeOptional(d.image_url, MAX_STRING),
    },
  };
}

// ── Itinerary events ────────────────────────────────────────────────────────

export interface SanitizedItineraryEvent {
  title: string;
  start_time: string;
  end_time: string;
  category: string;
  color: string;
  description?: string;
  location?: string;
  url?: string;
  created_by?: string;
}

export function validateItineraryEventInput(
  data: unknown,
): ValidationResult<SanitizedItineraryEvent> {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }
  const d = data as Record<string, unknown>;

  if (!isNonEmptyString(d.title)) {
    return { valid: false, error: 'title is required and must be a non-empty string' };
  }
  if (!isValidDate(d.start_time)) {
    return { valid: false, error: 'start_time is required and must be a valid datetime string' };
  }
  if (!isValidDate(d.end_time)) {
    return { valid: false, error: 'end_time is required and must be a valid datetime string' };
  }
  if (!isNonEmptyString(d.category)) {
    return { valid: false, error: 'category is required and must be a non-empty string' };
  }
  if (!isNonEmptyString(d.color)) {
    return { valid: false, error: 'color is required and must be a non-empty string' };
  }
  if (!isOptionalString(d.description)) {
    return { valid: false, error: 'description must be a string if provided' };
  }
  if (!isOptionalString(d.location)) {
    return { valid: false, error: 'location must be a string if provided' };
  }
  if (!isValidUrl(d.url)) {
    return { valid: false, error: 'url must be a valid http/https URL if provided' };
  }
  if (!isOptionalString(d.created_by)) {
    return { valid: false, error: 'created_by must be a string if provided' };
  }

  return {
    valid: true,
    data: {
      title: sanitize(d.title as string, MAX_TITLE),
      start_time: (d.start_time as string).trim(),
      end_time: (d.end_time as string).trim(),
      category: sanitize(d.category as string, MAX_STRING),
      color: sanitize(d.color as string, MAX_STRING),
      description: sanitizeOptional(d.description, MAX_DESCRIPTION),
      location: sanitizeOptional(d.location, MAX_STRING),
      url: sanitizeOptional(d.url, MAX_STRING),
      created_by: sanitizeOptional(d.created_by, MAX_STRING),
    },
  };
}

// ── Travel notes ────────────────────────────────────────────────────────────

export interface SanitizedTravelNote {
  name: string;
  coming_from: string;
  arrival_date: string;
  transportation: string;
  email?: string;
  departure_date?: string;
  notes?: string;
}

export function validateTravelNoteInput(
  data: unknown,
): ValidationResult<SanitizedTravelNote> {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }
  const d = data as Record<string, unknown>;

  if (!isNonEmptyString(d.name)) {
    return { valid: false, error: 'name is required and must be a non-empty string' };
  }
  if (!isNonEmptyString(d.coming_from)) {
    return { valid: false, error: 'coming_from is required and must be a non-empty string' };
  }
  if (!isValidDate(d.arrival_date)) {
    return { valid: false, error: 'arrival_date is required and must be a valid date string' };
  }
  if (!isNonEmptyString(d.transportation)) {
    return { valid: false, error: 'transportation is required and must be a non-empty string' };
  }
  if (!isOptionalString(d.email)) {
    return { valid: false, error: 'email must be a string if provided' };
  }
  if (d.departure_date !== null && d.departure_date !== undefined && !isValidDate(d.departure_date)) {
    return { valid: false, error: 'departure_date must be a valid date string if provided' };
  }
  if (!isOptionalString(d.notes)) {
    return { valid: false, error: 'notes must be a string if provided' };
  }

  return {
    valid: true,
    data: {
      name: sanitize(d.name as string, MAX_STRING),
      coming_from: sanitize(d.coming_from as string, MAX_STRING),
      arrival_date: (d.arrival_date as string).trim(),
      transportation: sanitize(d.transportation as string, MAX_STRING),
      email: sanitizeOptional(d.email, MAX_STRING),
      departure_date: d.departure_date ? (d.departure_date as string).trim() : undefined,
      notes: sanitizeOptional(d.notes, MAX_DESCRIPTION),
    },
  };
}

// ── Photos ──────────────────────────────────────────────────────────────────

export interface SanitizedPhoto {
  filename: string;
  original_filename: string;
  public_url: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
  storage_path?: string;
}

export function validatePhotoInput(
  data: unknown,
): ValidationResult<SanitizedPhoto> {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }
  const d = data as Record<string, unknown>;

  if (!isNonEmptyString(d.filename)) {
    return { valid: false, error: 'filename is required and must be a non-empty string' };
  }
  if (!isNonEmptyString(d.original_filename)) {
    return { valid: false, error: 'original_filename is required and must be a non-empty string' };
  }
  if (!isNonEmptyString(d.public_url)) {
    return { valid: false, error: 'public_url is required and must be a non-empty string' };
  }
  if (!isValidUrl(d.public_url)) {
    return { valid: false, error: 'public_url must be a valid http/https URL' };
  }
  if (!isVercelBlobUrl(d.public_url as string)) {
    return {
      valid: false,
      error: 'public_url must be a Vercel Blob URL (https://*.public.blob.vercel-storage.com)',
    };
  }
  if (d.file_size !== null && d.file_size !== undefined && typeof d.file_size !== 'number') {
    return { valid: false, error: 'file_size must be a number if provided' };
  }
  if (!isOptionalString(d.mime_type)) {
    return { valid: false, error: 'mime_type must be a string if provided' };
  }
  if (!isOptionalString(d.uploaded_by)) {
    return { valid: false, error: 'uploaded_by must be a string if provided' };
  }
  if (!isOptionalString(d.storage_path)) {
    return { valid: false, error: 'storage_path must be a string if provided' };
  }

  return {
    valid: true,
    data: {
      filename: sanitize(d.filename as string, MAX_STRING),
      original_filename: sanitize(d.original_filename as string, MAX_STRING),
      public_url: (d.public_url as string).trim(),
      file_size: typeof d.file_size === 'number' ? d.file_size : undefined,
      mime_type: sanitizeOptional(d.mime_type, MAX_STRING),
      uploaded_by: sanitizeOptional(d.uploaded_by, MAX_STRING),
      storage_path: sanitizeOptional(d.storage_path, MAX_STRING),
    },
  };
}

// ── Setup / generate ────────────────────────────────────────────────────────

export interface SanitizedGenerateInput {
  provider: 'openai' | 'anthropic' | 'gemini';
  destination: string;
  startDate: string;
  endDate: string;
}

export function validateGenerateInput(
  data: unknown,
): ValidationResult<SanitizedGenerateInput> {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }
  const d = data as Record<string, unknown>;

  if (!isValidCategory(d.provider, [...AI_PROVIDERS])) {
    return {
      valid: false,
      error: `provider must be one of: ${AI_PROVIDERS.join(', ')}`,
    };
  }
  if (!isNonEmptyString(d.destination)) {
    return { valid: false, error: 'destination is required and must be a non-empty string' };
  }
  if ((d.destination as string).trim().length > MAX_DESTINATION) {
    return { valid: false, error: `destination must be at most ${MAX_DESTINATION} characters` };
  }
  if (!isValidDate(d.startDate)) {
    return { valid: false, error: 'startDate must be a valid date string' };
  }
  if (!isValidDate(d.endDate)) {
    return { valid: false, error: 'endDate must be a valid date string' };
  }

  return {
    valid: true,
    data: {
      provider: d.provider as 'openai' | 'anthropic' | 'gemini',
      destination: sanitize(d.destination as string, MAX_DESTINATION),
      startDate: (d.startDate as string).trim(),
      endDate: (d.endDate as string).trim(),
    },
  };
}

// ---------------------------------------------------------------------------
// Partial (PUT) sanitiser — strips HTML & enforces max lengths on any
// provided string fields. Does NOT require any particular field to exist.
// ---------------------------------------------------------------------------

export function sanitizePartialUpdate(
  data: Record<string, unknown>,
  fieldLimits: Record<string, number>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && key in fieldLimits) {
      out[key] = sanitize(value, fieldLimits[key]);
    } else {
      out[key] = value;
    }
  }
  return out;
}

// Pre-defined field-limit maps for each entity type's PUT operations
export const ACTIVITY_FIELD_LIMITS: Record<string, number> = {
  title: MAX_TITLE,
  description: MAX_DESCRIPTION,
  category: MAX_STRING,
  location: MAX_STRING,
  url: MAX_STRING,
  suggested_by: MAX_STRING,
  image_url: MAX_STRING,
};

export const ITINERARY_FIELD_LIMITS: Record<string, number> = {
  title: MAX_TITLE,
  description: MAX_DESCRIPTION,
  category: MAX_STRING,
  color: MAX_STRING,
  location: MAX_STRING,
  url: MAX_STRING,
  created_by: MAX_STRING,
};

export const TRAVEL_NOTE_FIELD_LIMITS: Record<string, number> = {
  name: MAX_STRING,
  coming_from: MAX_STRING,
  arrival_date: MAX_STRING,
  transportation: MAX_STRING,
  email: MAX_STRING,
  departure_date: MAX_STRING,
  notes: MAX_DESCRIPTION,
};

export const PHOTO_FIELD_LIMITS: Record<string, number> = {
  filename: MAX_STRING,
  original_filename: MAX_STRING,
  public_url: MAX_STRING,
  mime_type: MAX_STRING,
  uploaded_by: MAX_STRING,
  storage_path: MAX_STRING,
};

// ── Expenses ────────────────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES = ['food', 'drinks', 'transport', 'lodging', 'activities', 'tickets', 'groceries', 'other'] as const;

export const EXPENSE_FIELD_LIMITS = {
  description: 500,
  paid_by: 100,
  vendor: 200,
  notes: 1000,
  category: 50,
};

export function validateExpenseInput(data: Record<string, unknown>): { valid: boolean; error?: string } {
  const { description, amount, paid_by, split_count, category, expense_date } = data;

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return { valid: false, error: 'Description is required' };
  }
  if (description.length > EXPENSE_FIELD_LIMITS.description) {
    return { valid: false, error: `Description must be under ${EXPENSE_FIELD_LIMITS.description} characters` };
  }

  if (amount === undefined || amount === null || typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return { valid: false, error: 'Amount must be a positive number' };
  }
  if (amount > 999999.99) {
    return { valid: false, error: 'Amount is too large' };
  }

  if (!paid_by || typeof paid_by !== 'string' || paid_by.trim().length === 0) {
    return { valid: false, error: 'Paid by is required' };
  }
  if (paid_by.length > EXPENSE_FIELD_LIMITS.paid_by) {
    return { valid: false, error: `Name must be under ${EXPENSE_FIELD_LIMITS.paid_by} characters` };
  }

  if (split_count !== undefined) {
    if (typeof split_count !== 'number' || !Number.isInteger(split_count) || split_count < 1 || split_count > 100) {
      return { valid: false, error: 'Split count must be between 1 and 100' };
    }
  }

  if (category !== undefined) {
    if (typeof category !== 'string' || !EXPENSE_CATEGORIES.includes(category as typeof EXPENSE_CATEGORIES[number])) {
      return { valid: false, error: `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}` };
    }
  }

  if (expense_date !== undefined) {
    if (typeof expense_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(expense_date)) {
      return { valid: false, error: 'Date must be in YYYY-MM-DD format' };
    }
  }

  return { valid: true };
}

export function sanitizeExpenseInput(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = { ...data };
  const textFields = ['description', 'paid_by', 'vendor', 'notes'] as const;
  for (const field of textFields) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = (sanitized[field] as string).replace(/<[^>]*>/g, '').trim();
    }
  }
  return sanitized;
}
