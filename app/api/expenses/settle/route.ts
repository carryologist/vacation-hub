import { NextResponse } from 'next/server';
import { getExpenses } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export async function GET() {
  try {
    const expenses = await getExpenses();
    
    if (expenses.length === 0) {
      return NextResponse.json({ members: [], totals: {}, settlements: [], totalSpent: 0 });
    }

    // Get unique members
    const members = [...new Set(expenses.map(e => e.paid_by))].sort();
    
    // Calculate total spent and per-person totals
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const perPerson = totalSpent / members.length;
    
    const totals: Record<string, { paid: number; share: number; net: number }> = {};
    for (const member of members) {
      const paid = expenses
        .filter(e => e.paid_by === member)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      totals[member] = {
        paid: Math.round(paid * 100) / 100,
        share: Math.round(perPerson * 100) / 100,
        net: Math.round((paid - perPerson) * 100) / 100,
      };
    }

    // Greedy min-transfer settlement algorithm
    const balances = members.map(m => ({ name: m, balance: totals[m].net }));
    const settlements: Settlement[] = [];
    
    // Sort: debtors (negative) first, creditors (positive) last
    balances.sort((a, b) => a.balance - b.balance);
    
    let i = 0;
    let j = balances.length - 1;
    
    while (i < j) {
      const debtor = balances[i];
      const creditor = balances[j];
      
      if (Math.abs(debtor.balance) < 0.01) { i++; continue; }
      if (Math.abs(creditor.balance) < 0.01) { j--; continue; }
      
      const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
      
      if (amount >= 0.01) {
        settlements.push({
          from: debtor.name,
          to: creditor.name,
          amount: Math.round(amount * 100) / 100,
        });
      }
      
      debtor.balance += amount;
      creditor.balance -= amount;
      
      if (Math.abs(debtor.balance) < 0.01) i++;
      if (Math.abs(creditor.balance) < 0.01) j--;
    }

    return NextResponse.json({
      members,
      totals,
      settlements,
      totalSpent: Math.round(totalSpent * 100) / 100,
      expenseCount: expenses.length,
    });
  } catch (error) {
    console.error('Error computing settlement:', error);
    return NextResponse.json({ error: 'Failed to compute settlement' }, { status: 500 });
  }
}
