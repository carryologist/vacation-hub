"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { upload } from "@vercel/blob/client";

interface Expense {
  id: number;
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

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

interface SettlementData {
  members: string[];
  totals: Record<string, { paid: number; share: number; net: number }>;
  settlements: Settlement[];
  totalSpent: number;
  expenseCount: number;
}

interface ParsedReceipt {
  description: string;
  amount: number | null;
  vendor: string;
  date: string;
  category: string;
}

const CATEGORIES = [
  { value: "food", label: "Food", icon: "🍽️" },
  { value: "drinks", label: "Drinks", icon: "🍺" },
  { value: "transport", label: "Transport", icon: "🚗" },
  { value: "lodging", label: "Lodging", icon: "🏨" },
  { value: "activities", label: "Activities", icon: "🎯" },
  { value: "tickets", label: "Tickets", icon: "🎟️" },
  { value: "groceries", label: "Groceries", icon: "🛒" },
  { value: "other", label: "Other", icon: "📦" },
];

function getCategoryIcon(category: string): string {
  return CATEGORIES.find((c) => c.value === category)?.icon || "📦";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

interface Props {
  tripName: string;
}

export default function ExpensesClient({ tripName }: Props) {
  // Data state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [settlement, setSettlement] = useState<SettlementData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  
  // Form fields
  const [selectedPayer, setSelectedPayer] = useState<string>("");
  const [newPayerName, setNewPayerName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [splitCount, setSplitCount] = useState("2");
  const [vendor, setVendor] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Receipt state
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptFilename, setReceiptFilename] = useState("");
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [showSettlement, setShowSettlement] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [filterMember, setFilterMember] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [status, setStatus] = useState("");

  // Initialize payer from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("vh-expense-payer");
    if (saved) setSelectedPayer(saved);
  }, []);

  // Fetch data
  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch("/api/expenses/");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setExpenses(data);
    } catch {
      console.error("Failed to fetch expenses");
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/expenses/members/");
      if (!res.ok) return;
      const data = await res.json();
      setMembers(data);
    } catch {
      // non-critical
    }
  }, []);

  const fetchSettlement = useCallback(async () => {
    try {
      const res = await fetch("/api/expenses/settle/");
      if (!res.ok) return;
      const data = await res.json();
      setSettlement(data);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchExpenses(), fetchMembers(), fetchSettlement()]).then(() =>
      setLoading(false)
    );
  }, [fetchExpenses, fetchMembers, fetchSettlement]);

  const refreshAll = async () => {
    await Promise.all([fetchExpenses(), fetchMembers(), fetchSettlement()]);
  };

  // Payer logic
  const effectivePayer = selectedPayer === "__new__" ? newPayerName.trim() : selectedPayer;

  // Receipt upload
  const handleReceiptUpload = async (file: File) => {
    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/expenses/upload/",
      });
      setReceiptUrl(blob.url);
      setReceiptFilename(file.name);
      setStatus("✅ Receipt uploaded");
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      console.error("Upload failed:", err);
      setStatus("❌ Upload failed");
      setTimeout(() => setStatus(""), 3000);
    } finally {
      setUploading(false);
    }
  };

  // AI receipt parsing
  const handleParseReceipt = async () => {
    if (!receiptUrl) return;
    setParsing(true);
    try {
      const res = await fetch("/api/expenses/parse/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptUrl,
          mimeType: receiptFilename.toLowerCase().endsWith(".pdf")
            ? "application/pdf"
            : "image/jpeg",
          filename: receiptFilename,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to parse receipt");
      }
      const parsed: ParsedReceipt = await res.json();

      // Auto-fill form fields
      if (parsed.description) setDescription(parsed.description);
      if (parsed.amount) setAmount(String(parsed.amount));
      if (parsed.vendor) setVendor(parsed.vendor);
      if (parsed.date) setExpenseDate(parsed.date);
      if (parsed.category) setCategory(parsed.category);

      setStatus("✅ Receipt scanned — review the details below");
      setTimeout(() => setStatus(""), 5000);
    } catch (err) {
      setStatus(
        `❌ ${err instanceof Error ? err.message : "Failed to parse receipt"}`
      );
      setTimeout(() => setStatus(""), 5000);
    } finally {
      setParsing(false);
    }
  };

  // Form reset
  const resetForm = () => {
    setDescription("");
    setAmount("");
    setCategory("food");
    setSplitCount("2");
    setVendor("");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setReceiptUrl("");
    setReceiptFilename("");
    setFormError("");
    setEditingExpense(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submit expense
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectivePayer) {
      setFormError("Please select or enter who paid");
      return;
    }
    if (!description.trim()) {
      setFormError("Description is required");
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setFormError("Enter a valid amount");
      return;
    }

    setSubmitting(true);
    setFormError("");

    const payload = {
      description: description.trim(),
      amount: Number(amount),
      paid_by: effectivePayer,
      split_count: Number(splitCount) || 2,
      category,
      vendor: vendor.trim() || undefined,
      expense_date: expenseDate,
      receipt_url: receiptUrl || undefined,
      receipt_filename: receiptFilename || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      const url = "/api/expenses/";
      const method = editingExpense ? "PUT" : "POST";
      const body = editingExpense
        ? { id: editingExpense.id, ...payload }
        : payload;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save expense");
      }

      // Save payer preference
      localStorage.setItem("vh-expense-payer", effectivePayer);

      resetForm();
      setShowForm(false);
      await refreshAll();
      setStatus(editingExpense ? "✅ Expense updated" : "✅ Expense added");
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save expense"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Edit expense
  const startEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setDescription(expense.description);
    setAmount(String(expense.amount));
    setSelectedPayer(expense.paid_by);
    setCategory(expense.category);
    setSplitCount(String(expense.split_count));
    setVendor(expense.vendor || "");
    setExpenseDate(expense.expense_date);
    setNotes(expense.notes || "");
    setReceiptUrl(expense.receipt_url || "");
    setReceiptFilename(expense.receipt_filename || "");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Delete expense
  const handleDelete = async (id: number, receiptUrl?: string) => {
    try {
      const res = await fetch("/api/expenses/", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, receipt_url: receiptUrl }),
      });
      if (!res.ok) throw new Error();
      setDeleteConfirmId(null);
      await refreshAll();
      setStatus("✅ Expense deleted");
      setTimeout(() => setStatus(""), 3000);
    } catch {
      setStatus("❌ Failed to delete expense");
      setTimeout(() => setStatus(""), 3000);
    }
  };

  // Filtered/sorted expenses
  const displayExpenses = useMemo(() => {
    let filtered = [...expenses];
    if (filterMember !== "all") {
      filtered = filtered.filter((e) => e.paid_by === filterMember);
    }
    if (filterCategory !== "all") {
      filtered = filtered.filter((e) => e.category === filterCategory);
    }
    if (sortBy === "amount") {
      filtered.sort((a, b) => Number(b.amount) - Number(a.amount));
    }
    // default is date, already sorted from API
    return filtered;
  }, [expenses, filterMember, filterCategory, sortBy]);

  // Summary stats
  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const uniqueMembers = [...new Set(expenses.map((e) => e.paid_by))];

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <div
          className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4"
          style={{
            borderColor: "var(--brand)",
            borderTopColor: "transparent",
          }}
        />
        <p className="opacity-75">Loading expenses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status message */}
      {status && (
        <div
          className="rounded-xl p-4 text-center font-medium"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: status.startsWith("✅")
              ? "var(--accent-green)"
              : "var(--accent-red)",
          }}
        >
          {status}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {formatCurrency(totalSpent)}
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Total Spent
          </p>
        </div>
        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {expenses.length}
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Expenses
          </p>
        </div>
        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {uniqueMembers.length}
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Members
          </p>
        </div>
        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {uniqueMembers.length > 0
              ? formatCurrency(totalSpent / uniqueMembers.length)
              : "$0"}
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Per Person
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => {
            if (showForm && !editingExpense) {
              setShowForm(false);
              resetForm();
            } else {
              resetForm();
              setShowForm(true);
            }
          }}
          className="px-5 py-2.5 rounded-xl font-medium text-white transition-all hover:opacity-90"
          style={{ background: "var(--brand)" }}
        >
          {showForm && !editingExpense ? "Cancel" : "➕ Add Expense"}
        </button>
        {expenses.length > 0 && (
          <button
            onClick={() => setShowSettlement(!showSettlement)}
            className="px-5 py-2.5 rounded-xl font-medium transition-all"
            style={{
              background: showSettlement ? "var(--brand)" : "var(--bg-card)",
              color: showSettlement ? "white" : "var(--text-primary)",
              border: showSettlement ? "none" : "1px solid var(--border)",
            }}
          >
            ⚖️ Settle Up
          </button>
        )}
      </div>

      {/* Settlement Panel */}
      {showSettlement && settlement && settlement.members.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            className="px-5 py-4"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <h3
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              ⚖️ Settlement Summary
            </h3>
          </div>
          <div className="p-5 space-y-4">
            {/* Per-member breakdown */}
            <div className="grid gap-2">
              {settlement.members.map((member) => {
                const info = settlement.totals[member];
                return (
                  <div
                    key={member}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "var(--bg-elevated)" }}
                  >
                    <div>
                      <span
                        className="font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {member}
                      </span>
                      <span
                        className="text-sm ml-2"
                        style={{ color: "var(--text-muted)" }}
                      >
                        paid {formatCurrency(info.paid)}
                      </span>
                    </div>
                    <span
                      className="font-bold"
                      style={{
                        color:
                          info.net > 0
                            ? "var(--accent-green)"
                            : info.net < 0
                            ? "var(--accent-red)"
                            : "var(--text-muted)",
                      }}
                    >
                      {info.net > 0
                        ? `owed ${formatCurrency(info.net)}`
                        : info.net < 0
                        ? `owes ${formatCurrency(Math.abs(info.net))}`
                        : "settled"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Transfers */}
            {settlement.settlements.length > 0 && (
              <div>
                <h4
                  className="text-sm font-semibold mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  To settle up:
                </h4>
                <div className="grid gap-2">
                  {settlement.settlements.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg"
                      style={{
                        background:
                          "color-mix(in srgb, var(--brand) 8%, transparent)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <span
                        className="font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {s.from}
                      </span>
                      <span style={{ color: "var(--text-muted)" }}>→</span>
                      <span
                        className="font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {s.to}
                      </span>
                      <span
                        className="ml-auto font-bold text-lg"
                        style={{ color: "var(--brand)" }}
                      >
                        {formatCurrency(s.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {settlement.settlements.length === 0 && (
              <p
                className="text-center py-2"
                style={{ color: "var(--accent-green)" }}
              >
                ✅ Everyone is settled up!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl p-5 sm:p-6 space-y-4"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <h3
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {editingExpense ? "Edit Expense" : "Add Expense"}
          </h3>

          {formError && (
            <p className="text-sm" style={{ color: "var(--accent-red)" }}>
              {formError}
            </p>
          )}

          {/* Receipt Upload */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Receipt (optional)
            </label>
            {!receiptUrl ? (
              <div
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors hover:opacity-80"
                style={{ borderColor: "var(--border)" }}
                onClick={() => fileInputRef.current?.click()}
              >
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  📸 Tap to upload receipt photo or PDF
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleReceiptUpload(file);
                  }}
                />
              </div>
            ) : (
              <div
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: "var(--bg-elevated)" }}
              >
                <span className="text-2xl">
                  {receiptFilename.toLowerCase().endsWith(".pdf")
                    ? "📄"
                    : "🖼️"}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {receiptFilename}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={handleParseReceipt}
                      disabled={parsing}
                      className="text-xs px-2 py-1 rounded font-medium text-white disabled:opacity-50"
                      style={{ background: "var(--brand)" }}
                    >
                      {parsing ? "Scanning..." : "🤖 Scan with AI"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptUrl("");
                        setReceiptFilename("");
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="text-xs px-2 py-1 rounded"
                      style={{ color: "var(--accent-red)" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}
            {uploading && (
              <p
                className="text-sm mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                Uploading...
              </p>
            )}
          </div>

          {/* Who Paid */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Who paid? *
            </label>
            <select
              value={selectedPayer}
              onChange={(e) => {
                setSelectedPayer(e.target.value);
                if (e.target.value !== "__new__") setNewPayerName("");
              }}
              className="w-full p-2.5 rounded-lg text-sm"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <option value="">Select person...</option>
              {members.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value="__new__">+ Someone new...</option>
            </select>
            {selectedPayer === "__new__" && (
              <input
                type="text"
                value={newPayerName}
                onChange={(e) => setNewPayerName(e.target.value)}
                placeholder="Enter name"
                maxLength={100}
                className="w-full p-2.5 rounded-lg text-sm mt-2"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
                autoFocus
              />
            )}
          </div>

          {/* Description + Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Description *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was it for?"
                maxLength={500}
                className="w-full p-2.5 rounded-lg text-sm"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Amount *
              </label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2.5 pl-7 rounded-lg text-sm"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Category + Split + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 rounded-lg text-sm"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Split between
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={splitCount}
                  onChange={(e) => setSplitCount(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-sm"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  people
                </span>
              </div>
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Date
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full p-2.5 rounded-lg text-sm"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>

          {/* Vendor + Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Vendor/Store
              </label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Optional"
                maxLength={200}
                className="w-full p-2.5 rounded-lg text-sm"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
                maxLength={1000}
                className="w-full p-2.5 rounded-lg text-sm"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || uploading}
              className="px-5 py-2.5 rounded-xl font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--brand)" }}
            >
              {submitting
                ? "Saving..."
                : editingExpense
                ? "Update Expense"
                : "Add Expense"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="px-5 py-2.5 rounded-xl font-medium transition-colors"
              style={{
                color: "var(--text-secondary)",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      {expenses.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            className="p-2 rounded-lg text-sm"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            <option value="all">All Members</option>
            {uniqueMembers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="p-2 rounded-lg text-sm"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setSortBy(sortBy === "date" ? "amount" : "date")}
            className="p-2 rounded-lg text-sm"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            Sort: {sortBy === "date" ? "📅 Date" : "💵 Amount"}
          </button>
        </div>
      )}

      {/* Expense List */}
      {displayExpenses.length > 0 ? (
        <div className="grid gap-3">
          {displayExpenses.map((expense) => (
            <div
              key={expense.id}
              className="rounded-xl p-4 sm:p-5 transition-all"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-start gap-3">
                {/* Category icon */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                  style={{
                    background:
                      "color-mix(in srgb, var(--brand) 10%, transparent)",
                  }}
                >
                  {getCategoryIcon(expense.category)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3
                        className="font-semibold truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {expense.description}
                      </h3>
                      <div
                        className="flex flex-wrap gap-x-3 gap-y-1 text-sm mt-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <span>{expense.paid_by}</span>
                        <span>{formatDate(expense.expense_date)}</span>
                        {expense.vendor && <span>@ {expense.vendor}</span>}
                        {expense.split_count > 1 && (
                          <span>÷ {expense.split_count}</span>
                        )}
                      </div>
                      {expense.notes && (
                        <p
                          className="text-sm mt-1 truncate"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {expense.notes}
                        </p>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p
                        className="text-lg font-bold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatCurrency(Number(expense.amount))}
                      </p>
                      {expense.split_count > 1 && (
                        <p
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {formatCurrency(
                            Number(expense.amount) / expense.split_count
                          )}
                          /ea
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Receipt + Actions row */}
                  <div className="flex items-center gap-2 mt-2">
                    {expense.receipt_url && (
                      <a
                        href={expense.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          background: "var(--bg-elevated)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {expense.receipt_filename?.toLowerCase().endsWith(".pdf")
                          ? "📄"
                          : "🖼️"}{" "}
                        Receipt
                      </a>
                    )}
                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={() => startEdit(expense)}
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          background: "var(--bg-elevated)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        ✏️ Edit
                      </button>
                      {deleteConfirmId === expense.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              handleDelete(expense.id, expense.receipt_url)
                            }
                            className="text-xs px-2 py-1 rounded text-white"
                            style={{ background: "var(--accent-red)" }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-xs px-2 py-1 rounded"
                            style={{
                              background: "var(--bg-elevated)",
                              color: "var(--text-muted)",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(expense.id)}
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            background: "var(--bg-elevated)",
                            color: "var(--accent-red)",
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : expenses.length > 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <p style={{ color: "var(--text-muted)" }}>
            No expenses match your filters.
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl p-8 text-center"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <p className="text-4xl mb-3">💰</p>
          <p
            className="font-semibold text-lg mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            No expenses yet
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Add the first expense to start tracking {tripName} spending.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 rounded-xl font-medium text-white"
            style={{ background: "var(--brand)" }}
          >
            ➕ Add First Expense
          </button>
        </div>
      )}
    </div>
  );
}
