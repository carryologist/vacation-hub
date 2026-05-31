import { NextResponse } from 'next/server';
import { getExpenseMembers } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const members = await getExpenseMembers();
    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching expense members:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}
