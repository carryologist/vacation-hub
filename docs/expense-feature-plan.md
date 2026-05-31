# Expense Management Feature — Implementation Plan

## Overview

A group expense tracker where trip members log shared costs, attach receipt photos/PDFs, and see a settlement summary showing who owes whom. The LLM can auto-extract expense details from receipt uploads.

---

## Data Model

### `expenses` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | `SERIAL PK` | |
| `description` | `TEXT NOT NULL` | What was purchased |
| `amount` | `NUMERIC(10,2) NOT NULL` | USD |
| `paid_by` | `TEXT NOT NULL` | Name of person who paid |
| `split_count` | `INTEGER NOT NULL DEFAULT 2` | How many ways to split |
| `category` | `TEXT NOT NULL DEFAULT 'other'` | food, drinks, transport, lodging, activities, tickets, groceries, other |
| `vendor` | `TEXT` | Store/restaurant name |
| `expense_date` | `DATE NOT NULL DEFAULT NOW()` | When the purchase happened |
| `receipt_url` | `TEXT` | Vercel Blob URL for receipt image/PDF |
| `receipt_filename` | `TEXT` | Original filename |
| `notes` | `TEXT` | Optional notes |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | |

No separate members table — the list of known names is derived dynamically from `SELECT DISTINCT paid_by FROM expenses ORDER BY paid_by`. This keeps it simple and self-populating per your description.

---

## API Routes

### `app/api/expenses/route.ts`
- **GET** — List all expenses, ordered by `expense_date DESC`
- **POST** — Create expense (validates all fields via `lib/validate.ts`)
- **PUT** — Update expense by id
- **DELETE** — Delete expense by id (also deletes blob if receipt_url exists)

### `app/api/expenses/upload/route.ts`
- Vercel Blob client upload handler (same pattern as photos)
- Accepts image/* and application/pdf, max 10MB

### `app/api/expenses/parse/route.ts`
- **POST** — Accepts receipt image/PDF via Blob URL
- Downloads the file, extracts text (PDF → `unpdf`, image → send directly to vision LLM)
- LLM extracts: description, amount, vendor, date, category
- Returns parsed fields for user to review/edit before saving

### `app/api/expenses/members/route.ts`
- **GET** — Returns `SELECT DISTINCT paid_by FROM expenses ORDER BY paid_by`
- Lightweight endpoint so the form can populate the name dropdown

### `app/api/expenses/settle/route.ts`
- **GET** — Computes settlement: each person's total paid, each person's fair share (sum of amount/split_count across all expenses they're part of... see Settlement Logic below), and the minimum transfers needed to settle up
- Returns `{ members: [...], totals: {...}, settlements: [{ from, to, amount }] }`

---

## Settlement Logic

The simple approach, given that `split_count` is a number (not a list of specific people):

1. Each expense has an `amount` and a `split_count`.
2. The **per-person cost** of each expense is `amount / split_count`.
3. Each person's **total paid** = sum of all expenses where they are `paid_by`.
4. Each person's **fair share** = sum of `amount / split_count` across ALL expenses (since split_count defines equal splitting among the whole group or a subset, but we don't track *who* is in each split).

**Problem:** Without knowing *who* is in each split, we can't compute individual fair shares accurately. We only know the split count.

**Revised approach:** Since the split_count represents "this expense is shared N ways among the group," and the group is self-forming, the simplest correct model is:

- Total pool = sum of all expense amounts
- Each person's share = total pool / number_of_members (assumes equal participation)
- Each person's paid = sum of their expenses
- Net = paid - share
- Positive net = they're owed money; negative = they owe

This is the classic Splitwise-style algorithm. The `split_count` field is used as a **display hint** for the user ("I paid $200 for dinner for 4 people") but settlement computes across the whole group equally.

**Actually, let me reconsider.** The user said split_count is how many ways to split each expense. That means not every expense involves everyone. A couple might split a $100 dinner 2 ways — only they should be responsible for it, not the whole group.

**Final approach:** Each expense has `paid_by` and `split_count`. The expense contributes `amount / split_count` to the group pot per participating person. But since we don't know *which* people participated, we'll treat `split_count` as the divisor and assign the per-person cost (`amount / split_count`) only to the payer's "covered others" column. For settlement, we compute:

- Each person's **total paid** for the group (their expenses)
- The **total group cost** = sum of all `amount` values
- Each member's **equal share** = total group cost / number of unique members
- **Net balance** = total paid − equal share
- Settlement uses the min-transfer greedy algorithm

The `split_count` is informational/display only — it tells users "this $200 was for 4 people" but the settlement divides the full pool equally among all members. This is the standard group-trip model.

If users want to exclude themselves from certain expenses, that's a v2 feature.

---

## Page & Components

### `app/expenses/page.tsx` (server component)
- Reads config for trip name/dates
- Renders `ExpensesClient` component

### `components/ExpensesClient.tsx` (client component)
Main expense management page with:

**Header section:**
- Trip expense summary cards: total spent, per-person average, number of expenses
- Settlement summary panel (expandable) — "Who owes whom"

**Add Expense section:**
- Name selector: dropdown of existing members + "Someone new..." option that reveals a text input
  - Remembers last-used name in localStorage (like voting)
- Amount input (numeric, USD)
- Description text field
- Category dropdown (food, drinks, transport, lodging, activities, tickets, groceries, other)
- Date picker (defaults to today)
- Split count: number input (default 2, min 1)
- Vendor (optional text)
- Notes (optional text)
- Receipt upload: drop zone for image/PDF
  - On upload → stores to Blob → optionally calls parse endpoint to auto-fill fields
  - Shows receipt thumbnail/icon after upload
- Submit button

**Expense list:**
- Cards showing: description, amount (large), paid by (badge), date, category icon, receipt thumbnail if present
- Sort: by date (default), by amount
- Filter: by member, by category
- Edit/delete actions per card
- Clicking receipt thumbnail opens full-size image or PDF in new tab

### `components/ExpenseReceiptUpload.tsx`
- Drag-and-drop zone (reuses pattern from ItineraryPdfUpload and PhotoUpload)
- Accepts images and PDFs
- Uploads to Vercel Blob via client upload
- After upload, offers "Scan receipt with AI" button
- Displays parsed results for user to accept/edit

### `components/SettlementSummary.tsx`
- Shows each member's total paid and fair share
- Shows net balances (positive = owed, negative = owes)
- Settlement transfers: "Alice pays Bob $45.00" with clear directional arrows
- Expandable/collapsible

---

## LLM Receipt Parsing

Add to `lib/llm.ts`:

### `parseReceiptFromImage(opts)`
- For images: sends the Blob URL directly to the vision-capable model
  - OpenAI: gpt-4o-mini with image_url in content
  - Anthropic: claude-sonnet-4-20250514 with image media type
  - Gemini: gemini-2.0-flash with inline image
- For PDFs: extracts text with `unpdf`, sends text to LLM (same as itinerary parsing)
- Prompt asks LLM to extract: `{ description, amount, vendor, date, category }`
- Returns parsed fields with confidence indicators

---

## File Inventory

| File | Action | Description |
|------|--------|-------------|
| `lib/db.ts` | Modify | Add `Expense` interface, `expenses` table to `initializeDatabase()`, CRUD functions |
| `lib/validate.ts` | Modify | Add `validateExpenseInput()` with field limits |
| `lib/llm.ts` | Modify | Add `parseReceiptFromImage()` and `parseReceiptFromText()` |
| `app/api/expenses/route.ts` | Create | GET/POST/PUT/DELETE |
| `app/api/expenses/upload/route.ts` | Create | Vercel Blob upload handler |
| `app/api/expenses/parse/route.ts` | Create | Receipt → LLM parsing |
| `app/api/expenses/members/route.ts` | Create | GET distinct member names |
| `app/api/expenses/settle/route.ts` | Create | GET settlement computation |
| `app/expenses/page.tsx` | Create | Server component |
| `components/ExpensesClient.tsx` | Create | Main client component |
| `components/ExpenseReceiptUpload.tsx` | Create | Receipt upload + AI scan |
| `components/SettlementSummary.tsx` | Create | Who-owes-whom display |
| `app/layout.tsx` | Modify | Add "Expenses" to desktop nav + footer |
| `components/MobileNavigation.tsx` | Modify | Add "Expenses" to mobile nav |
| `middleware.ts` | Modify | Add `/api/expenses/upload` to any special route lists if needed |

---

## Navigation Placement

Add "Expenses" between "Travel" and "Settings" in all three nav locations. Icon: 💰 or a dollar sign SVG.

---

## Implementation Order

1. **Database layer** — interface, table, CRUD functions in `lib/db.ts`
2. **Validation** — field limits and sanitization in `lib/validate.ts`
3. **Core API routes** — expenses CRUD, members, settle
4. **Page + client component** — form, list, settlement display
5. **Blob upload** — receipt upload route + component
6. **LLM parsing** — receipt scanning in `lib/llm.ts` + parse API route
7. **Navigation** — add to all three nav locations
8. **Polish** — empty states, loading states, error handling, mobile responsiveness
