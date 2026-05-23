import { sql } from '@vercel/postgres';

export interface Lodging {
  name: string;
  description: string;
  address: string;
  imageUrls: string[];
  highlights: string[];
  bookingUrl?: string;
  checkIn?: string;
  checkOut?: string;
}

export interface VacationConfig {
  tripName: string;
  destination: string;
  tagline: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  brandColor: string;
  heroImageUrl: string;
  lodgings: Lodging[];
  passwordHash?: string;
  llmApiKeyEncrypted?: string;
  setupComplete: boolean;
}

const CONFIG_KEY = 'main';

export async function initConfigTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS vacation_config (
      key TEXT PRIMARY KEY DEFAULT 'main',
      data JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
}

export async function getConfig(): Promise<VacationConfig | null> {
  try {
    const { rows } = await sql`SELECT data FROM vacation_config WHERE key = ${CONFIG_KEY}`;
    if (rows.length === 0) return null;
    return rows[0].data as VacationConfig;
  } catch {
    // Table might not exist yet
    return null;
  }
}

export async function saveConfig(partial: Partial<VacationConfig>): Promise<void> {
  const existing = await getConfig();
  const merged = { ...existing, ...partial };

  await sql`
    INSERT INTO vacation_config (key, data, updated_at)
    VALUES (${CONFIG_KEY}, ${JSON.stringify(merged)}, NOW())
    ON CONFLICT (key) DO UPDATE
    SET data = ${JSON.stringify(merged)}, updated_at = NOW()
  `;
}

export async function deleteConfig(): Promise<void> {
  await sql`DELETE FROM vacation_config WHERE key = ${CONFIG_KEY}`;
}
