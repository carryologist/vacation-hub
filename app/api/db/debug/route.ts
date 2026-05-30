import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, unknown> = {};

  // Check which tables exist
  try {
    const { rows } = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    results.tables = rows.map(r => r.table_name);
  } catch (err) {
    results.tables_error = String(err);
  }

  // Check activity_votes specifically
  try {
    const { rows } = await sql`SELECT COUNT(*) as count FROM activity_votes`;
    results.activity_votes_count = rows[0].count;
  } catch (err) {
    results.activity_votes_error = String(err);
  }

  // Check activity_suggestions
  try {
    const { rows } = await sql`SELECT COUNT(*) as count FROM activity_suggestions`;
    results.activity_suggestions_count = rows[0].count;
  } catch (err) {
    results.activity_suggestions_error = String(err);
  }

  // Try to create the votes table directly
  try {
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
    results.create_votes_table = 'success';
  } catch (err) {
    results.create_votes_table_error = String(err);
  }

  return NextResponse.json(results, { status: 200 });
}
