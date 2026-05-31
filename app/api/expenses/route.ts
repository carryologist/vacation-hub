import { NextRequest, NextResponse } from 'next/server';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '@/lib/db';
import { validateExpenseInput, sanitizeExpenseInput } from '@/lib/validate';
import { del } from '@vercel/blob';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const expenses = await getExpenses();
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sanitized = sanitizeExpenseInput(body);
    
    // Ensure amount is a number
    if (typeof sanitized.amount === 'string') {
      sanitized.amount = parseFloat(sanitized.amount);
    }
    
    const validation = validateExpenseInput(sanitized);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const expense = await createExpense({
      description: sanitized.description as string,
      amount: sanitized.amount as number,
      paid_by: sanitized.paid_by as string,
      split_count: (sanitized.split_count as number) || 2,
      category: (sanitized.category as string) || 'other',
      vendor: sanitized.vendor as string | undefined,
      expense_date: (sanitized.expense_date as string) || new Date().toISOString().split('T')[0],
      receipt_url: sanitized.receipt_url as string | undefined,
      receipt_filename: sanitized.receipt_filename as string | undefined,
      notes: sanitized.notes as string | undefined,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    
    if (!id || !Number.isInteger(Number(id))) {
      return NextResponse.json({ error: 'Valid expense ID required' }, { status: 400 });
    }

    const sanitized = sanitizeExpenseInput(data);
    if (typeof sanitized.amount === 'string') {
      sanitized.amount = parseFloat(sanitized.amount);
    }

    // Only validate fields that are provided
    if (sanitized.description || sanitized.amount || sanitized.paid_by) {
      const validation = validateExpenseInput({
        description: sanitized.description || 'placeholder',
        amount: sanitized.amount || 1,
        paid_by: sanitized.paid_by || 'placeholder',
        ...sanitized,
      });
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    const updated = await updateExpense(Number(id), sanitized as Record<string, unknown> & { description?: string; amount?: number; paid_by?: string; split_count?: number; category?: string; vendor?: string; expense_date?: string; receipt_url?: string; receipt_filename?: string; notes?: string });
    if (!updated) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id, receipt_url } = await request.json();
    
    if (!id || !Number.isInteger(Number(id))) {
      return NextResponse.json({ error: 'Valid expense ID required' }, { status: 400 });
    }

    // Delete blob if receipt exists
    if (receipt_url && typeof receipt_url === 'string' && receipt_url.includes('blob.vercel-storage.com')) {
      try {
        await del(receipt_url);
      } catch {
        console.warn('Failed to delete receipt blob:', receipt_url);
      }
    }

    const deleted = await deleteExpense(Number(id));
    if (!deleted) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
