import { NextRequest, NextResponse } from 'next/server';
import { upsertActivityVote, deleteActivityVote, getActivityVoteSummary } from '@/lib/db';

export const dynamic = 'force-dynamic';

function sanitizeVoterName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/<[^>]*>/g, '').trim();
  if (cleaned.length === 0 || cleaned.length > 100) return null;
  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { activity_id, vote } = body;

    const voter_name = sanitizeVoterName(body.voter_name);
    if (!voter_name) {
      return NextResponse.json(
        { error: 'voter_name must be a non-empty string (max 100 characters)' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(activity_id) || activity_id < 1) {
      return NextResponse.json(
        { error: 'activity_id must be a positive integer' },
        { status: 400 }
      );
    }

    if (vote !== 1 && vote !== -1) {
      return NextResponse.json(
        { error: 'vote must be exactly 1 or -1' },
        { status: 400 }
      );
    }

    const result = await upsertActivityVote(activity_id, voter_name, vote);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error casting vote:', error);
    return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { activity_id } = body;

    const voter_name = sanitizeVoterName(body.voter_name);
    if (!voter_name) {
      return NextResponse.json(
        { error: 'voter_name must be a non-empty string (max 100 characters)' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(activity_id) || activity_id < 1) {
      return NextResponse.json(
        { error: 'activity_id must be a positive integer' },
        { status: 400 }
      );
    }

    await deleteActivityVote(activity_id, voter_name);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing vote:', error);
    return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const summaries = await getActivityVoteSummary();
    return NextResponse.json(summaries);
  } catch (error) {
    console.error('Error fetching vote summaries:', error);
    return NextResponse.json({ error: 'Failed to fetch vote summaries' }, { status: 500 });
  }
}
