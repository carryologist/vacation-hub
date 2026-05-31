import { sql } from '@vercel/postgres';
import { initConfigTable } from './config';

// Database Types
export interface TravelNote {
  id?: number;
  name: string;
  email?: string;
  coming_from: string;
  arrival_date: string;
  departure_date?: string;
  transportation: string;
  notes?: string;
  created_at?: string;
}

export interface ItineraryEvent {
  id?: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  url?: string;
  category: string;
  color: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ActivitySuggestion {
  id?: number;
  title: string;
  description: string;
  category: string;
  location?: string;
  url?: string;
  suggested_by?: string;
  notes?: string;
  image_url?: string;
  created_at?: string;
}

export interface ActivityVote {
  id?: number;
  activity_id: number;
  voter_name: string;
  vote: 1 | -1;  // 1 = thumbs up, -1 = thumbs down
  created_at?: string;
}

export interface Expense {
  id?: number;
  description: string;
  amount: number;
  paid_by: string;
  split_count: number;
  category: string;
  vendor?: string;
  expense_date: string;
  receipt_url?: string;
  receipt_filename?: string;
  notes?: string;
  created_at?: string;
}

export interface Photo {
  id?: number;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  width: number | null;
  height: number | null;
  uploaded_by: string;
  storage_path: string;
  public_url: string;
  description: string | null;
  uploaded_at?: string;
}

// Travel Notes
export async function getTravelNotes(): Promise<TravelNote[]> {
  const { rows } = await sql<TravelNote>`SELECT * FROM travel_notes ORDER BY arrival_date`;
  return rows;
}

export async function createTravelNote(note: Omit<TravelNote, 'id' | 'created_at'>): Promise<TravelNote> {
  const { rows } = await sql<TravelNote>`
    INSERT INTO travel_notes (name, email, coming_from, arrival_date, departure_date, transportation, notes)
    VALUES (${note.name}, ${note.email || null}, ${note.coming_from}, ${note.arrival_date}, ${note.departure_date || null}, ${note.transportation}, ${note.notes || null})
    RETURNING *
  `;
  return rows[0];
}

export async function updateTravelNote(id: number, note: Partial<Omit<TravelNote, 'id' | 'created_at'>>): Promise<TravelNote | null> {
  const { rows } = await sql<TravelNote>`
    UPDATE travel_notes 
    SET name = COALESCE(${note.name}, name),
        email = COALESCE(${note.email}, email),
        coming_from = COALESCE(${note.coming_from}, coming_from),
        arrival_date = COALESCE(${note.arrival_date}, arrival_date),
        departure_date = COALESCE(${note.departure_date}, departure_date),
        transportation = COALESCE(${note.transportation}, transportation),
        notes = COALESCE(${note.notes}, notes)
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] || null;
}

export async function deleteTravelNote(id: number): Promise<boolean> {
  const { rowCount } = await sql`DELETE FROM travel_notes WHERE id = ${id}`;
  return (rowCount ?? 0) > 0;
}

// Itinerary Events
export async function getItineraryEvents(): Promise<ItineraryEvent[]> {
  const { rows } = await sql<ItineraryEvent>`SELECT * FROM itinerary_events ORDER BY start_time`;
  return rows;
}

export async function createItineraryEvent(event: Omit<ItineraryEvent, 'id' | 'created_at' | 'updated_at'>): Promise<ItineraryEvent> {
  const { rows } = await sql<ItineraryEvent>`
    INSERT INTO itinerary_events (title, description, start_time, end_time, location, url, category, color, created_by)
    VALUES (${event.title}, ${event.description || null}, ${event.start_time}, ${event.end_time}, ${event.location || null}, ${event.url || null}, ${event.category}, ${event.color}, ${event.created_by || null})
    RETURNING *
  `;
  return rows[0];
}

export async function updateItineraryEvent(id: number, event: Partial<ItineraryEvent>): Promise<ItineraryEvent | null> {
  const { rows } = await sql<ItineraryEvent>`
    UPDATE itinerary_events 
    SET title = COALESCE(${event.title}, title),
        description = COALESCE(${event.description}, description),
        start_time = COALESCE(${event.start_time}, start_time),
        end_time = COALESCE(${event.end_time}, end_time),
        location = COALESCE(${event.location}, location),
        url = COALESCE(${event.url}, url),
        category = COALESCE(${event.category}, category),
        color = COALESCE(${event.color}, color),
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] || null;
}

export async function deleteItineraryEvent(id: number): Promise<boolean> {
  const { rowCount } = await sql`DELETE FROM itinerary_events WHERE id = ${id}`;
  return (rowCount ?? 0) > 0;
}

// Activity Suggestions
export async function getActivitySuggestions(): Promise<ActivitySuggestion[]> {
  const { rows } = await sql<ActivitySuggestion>`SELECT DISTINCT ON (LOWER(title)) * FROM activity_suggestions ORDER BY LOWER(title), created_at ASC`;
  return rows;
}

export async function createActivitySuggestion(suggestion: Omit<ActivitySuggestion, 'id' | 'created_at'>): Promise<ActivitySuggestion> {
  const { rows } = await sql<ActivitySuggestion>`
    INSERT INTO activity_suggestions (title, description, category, location, url, suggested_by, image_url)
    VALUES (${suggestion.title}, ${suggestion.description}, ${suggestion.category}, ${suggestion.location || null}, ${suggestion.url || null}, ${suggestion.suggested_by || null}, ${suggestion.image_url || null})
    ON CONFLICT DO NOTHING
    RETURNING *
  `;
  // If conflict, return a stub (row already exists)
  if (rows.length === 0) {
    return { title: suggestion.title, description: suggestion.description, category: suggestion.category } as ActivitySuggestion;
  }
  return rows[0];
}

export async function deleteActivitySuggestion(id: number): Promise<boolean> {
  const { rowCount } = await sql`DELETE FROM activity_suggestions WHERE id = ${id}`;
  return (rowCount ?? 0) > 0;
}

// Activity Votes
export async function getActivityVotes(): Promise<ActivityVote[]> {
  const { rows } = await sql<ActivityVote>`SELECT * FROM activity_votes ORDER BY created_at DESC`;
  return rows;
}

export async function getActivityVoteSummary(): Promise<{ activity_id: number; upvotes: number; downvotes: number; score: number }[]> {
  const { rows } = await sql`
    SELECT 
      activity_id,
      COUNT(*) FILTER (WHERE vote = 1) AS upvotes,
      COUNT(*) FILTER (WHERE vote = -1) AS downvotes,
      SUM(vote) AS score
    FROM activity_votes
    GROUP BY activity_id
  `;
  return rows.map(r => ({
    activity_id: r.activity_id,
    upvotes: Number(r.upvotes),
    downvotes: Number(r.downvotes),
    score: Number(r.score)
  }));
}

export async function upsertActivityVote(activityId: number, voterName: string, vote: 1 | -1): Promise<ActivityVote> {
  const { rows } = await sql<ActivityVote>`
    INSERT INTO activity_votes (activity_id, voter_name, vote)
    VALUES (${activityId}, ${voterName}, ${vote})
    ON CONFLICT (activity_id, voter_name) DO UPDATE SET vote = ${vote}, created_at = NOW()
    RETURNING *
  `;
  return rows[0];
}

export async function deleteActivityVote(activityId: number, voterName: string): Promise<boolean> {
  const { rowCount } = await sql`DELETE FROM activity_votes WHERE activity_id = ${activityId} AND voter_name = ${voterName}`;
  return (rowCount ?? 0) > 0;
}

// Photos
export async function getPhotos(limit: number = 20, offset: number = 0): Promise<Photo[]> {
  const { rows } = await sql<Photo>`SELECT * FROM photos ORDER BY uploaded_at DESC LIMIT ${limit} OFFSET ${offset}`;
  return rows;
}

export async function createPhoto(photo: Omit<Photo, 'id' | 'uploaded_at'>): Promise<Photo> {
  const { rows } = await sql<Photo>`
    INSERT INTO photos (filename, original_filename, file_size, mime_type, width, height, uploaded_by, storage_path, public_url, description)
    VALUES (${photo.filename}, ${photo.original_filename}, ${photo.file_size}, ${photo.mime_type}, ${photo.width}, ${photo.height}, ${photo.uploaded_by}, ${photo.storage_path}, ${photo.public_url}, ${photo.description})
    RETURNING *
  `;
  return rows[0];
}

export async function updatePhotoName(id: number, originalFilename: string): Promise<Photo | null> {
  const { rows } = await sql<Photo>`
    UPDATE photos SET original_filename = ${originalFilename} WHERE id = ${id} RETURNING *
  `;
  return rows[0] || null;
}

export async function deletePhoto(id: number): Promise<Photo | null> {
  const { rows } = await sql<Photo>`DELETE FROM photos WHERE id = ${id} RETURNING *`;
  return rows[0] || null;
}

export async function getPhotoById(id: number): Promise<Photo | null> {
  const { rows } = await sql<Photo>`SELECT * FROM photos WHERE id = ${id}`;
  return rows[0] || null;
}

// Expenses
export async function getExpenses(): Promise<Expense[]> {
  const { rows } = await sql<Expense>`SELECT * FROM expenses ORDER BY expense_date DESC, created_at DESC`;
  return rows;
}

export async function createExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
  const { rows } = await sql<Expense>`
    INSERT INTO expenses (description, amount, paid_by, split_count, category, vendor, expense_date, receipt_url, receipt_filename, notes)
    VALUES (${expense.description}, ${expense.amount}, ${expense.paid_by}, ${expense.split_count}, ${expense.category}, ${expense.vendor || null}, ${expense.expense_date}, ${expense.receipt_url || null}, ${expense.receipt_filename || null}, ${expense.notes || null})
    RETURNING *
  `;
  return rows[0];
}

export async function updateExpense(id: number, expense: Partial<Expense>): Promise<Expense | null> {
  const { rows } = await sql<Expense>`
    UPDATE expenses SET
      description = COALESCE(${expense.description ?? null}, description),
      amount = COALESCE(${expense.amount ?? null}, amount),
      paid_by = COALESCE(${expense.paid_by ?? null}, paid_by),
      split_count = COALESCE(${expense.split_count ?? null}, split_count),
      category = COALESCE(${expense.category ?? null}, category),
      vendor = COALESCE(${expense.vendor}, vendor),
      expense_date = COALESCE(${expense.expense_date ?? null}, expense_date),
      receipt_url = COALESCE(${expense.receipt_url}, receipt_url),
      receipt_filename = COALESCE(${expense.receipt_filename}, receipt_filename),
      notes = COALESCE(${expense.notes}, notes)
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] || null;
}

export async function deleteExpense(id: number): Promise<boolean> {
  const { rowCount } = await sql`DELETE FROM expenses WHERE id = ${id}`;
  return (rowCount ?? 0) > 0;
}

export async function getExpenseMembers(): Promise<string[]> {
  const { rows } = await sql`SELECT DISTINCT paid_by FROM expenses ORDER BY paid_by`;
  return rows.map(r => r.paid_by);
}

// Initialize database schema
export async function initializeDatabase(): Promise<void> {
  // Site config table
  await initConfigTable();

  // Travel Notes table
  await sql`
    CREATE TABLE IF NOT EXISTS travel_notes (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      coming_from TEXT NOT NULL,
      arrival_date DATE NOT NULL,
      departure_date DATE,
      transportation TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  // Itinerary Events table
  await sql`
    CREATE TABLE IF NOT EXISTS itinerary_events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start_time TIMESTAMP WITH TIME ZONE NOT NULL,
      end_time TIMESTAMP WITH TIME ZONE NOT NULL,
      location TEXT,
      url TEXT,
      category TEXT NOT NULL DEFAULT 'general',
      color TEXT NOT NULL DEFAULT '#f97316',
      created_by TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  // Activity Suggestions table
  await sql`
    CREATE TABLE IF NOT EXISTS activity_suggestions (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT,
      url TEXT,
      suggested_by TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE activity_suggestions ADD COLUMN IF NOT EXISTS image_url TEXT`;

  // Unique index on lowercase title to prevent duplicate activities
  try {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_title_unique ON activity_suggestions (LOWER(title))`;
  } catch (err) {
    console.warn('Could not create unique title index (duplicate titles may exist):', err);
  }

  // Activity Votes table
  await sql`
    CREATE TABLE IF NOT EXISTS activity_votes (
      id SERIAL PRIMARY KEY,
      activity_id INTEGER NOT NULL REFERENCES activity_suggestions(id) ON DELETE CASCADE,
      voter_name TEXT NOT NULL,
      vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(activity_id, voter_name)
    )
  `;

  // Expenses table
  await sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      description TEXT NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      paid_by TEXT NOT NULL,
      split_count INTEGER NOT NULL DEFAULT 2,
      category TEXT NOT NULL DEFAULT 'other',
      vendor TEXT,
      expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
      receipt_url TEXT,
      receipt_filename TEXT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  // Photos table
  await sql`
    CREATE TABLE IF NOT EXISTS photos (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      uploaded_by TEXT NOT NULL DEFAULT 'Anonymous',
      storage_path TEXT NOT NULL,
      public_url TEXT NOT NULL,
      description TEXT,
      uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
}
