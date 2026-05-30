"use client";

import { useState, useRef, useCallback } from "react";

interface ParsedEvent {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  category: string;
  color: string;
  is_duplicate?: boolean;
}

interface Props {
  tripStartDate: string; // YYYY-MM-DD
  tripEndDate: string; // YYYY-MM-DD
  onEventsAdded: () => void; // callback to refresh the calendar
}

const CATEGORY_COLORS: Record<string, string> = {
  general: "#0ea5e9",
  meal: "#f59e0b",
  activity: "#10b981",
  travel: "#8b5cf6",
  celebration: "#ef4444",
  rest: "#6b7280",
};

function formatEventTime(iso: string): string {
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }) +
      " at " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    );
  } catch {
    return iso;
  }
}

type UploadState = "idle" | "processing" | "preview" | "success" | "error";

export default function ItineraryPdfUpload({
  tripStartDate,
  tripEndDate,
  onEventsAdded,
}: Props) {
  const [state, setState] = useState<UploadState>("idle");
  const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([]);
  const [checkedEvents, setCheckedEvents] = useState<boolean[]>([]);
  const [addedCount, setAddedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setErrorMessage("Please upload a PDF file.");
        setState("error");
        return;
      }

      setState("processing");

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("tripStartDate", tripStartDate);
        formData.append("tripEndDate", tripEndDate);

        const res = await fetch("/api/itinerary/parse/", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to parse itinerary");
        }

        const data = await res.json();
        const events: ParsedEvent[] = data.events || [];

        if (events.length === 0) {
          setErrorMessage("No events found in the PDF. Try a different file.");
          setState("error");
          return;
        }

        setParsedEvents(events);
        setCheckedEvents(events.map((e) => !e.is_duplicate));
        setState("preview");
      } catch {
        setErrorMessage("Something went wrong");
        setState("error");
      }
    },
    [tripStartDate, tripEndDate]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const toggleEvent = (index: number) => {
    setCheckedEvents((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const selectedCount = checkedEvents.filter(Boolean).length;

  const handleConfirm = async () => {
    const selectedEvents = parsedEvents.filter((_, i) => checkedEvents[i]);
    if (selectedEvents.length === 0) return;

    setState("processing");

    try {
      const res = await fetch("/api/itinerary/batch/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: selectedEvents }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add events");
      }

      const data = await res.json();
      setAddedCount(data.added ?? selectedEvents.length);
      setSkippedCount(data.skipped ?? 0);
      setState("success");
    } catch {
      setErrorMessage("Failed to add events");
      setState("error");
    }
  };

  const handleReset = () => {
    setState("idle");
    setParsedEvents([]);
    setCheckedEvents([]);
    setErrorMessage("");
    setAddedCount(0);
    setSkippedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const newCount = parsedEvents.filter((e) => !e.is_duplicate).length;
  const dupeCount = parsedEvents.filter((e) => e.is_duplicate).length;

  // ── State 1: Upload prompt ──
  if (state === "idle") {
    return (
      <div
        className="rounded-xl p-6 mb-6 transition-all"
        style={{
          background: "var(--bg-card)",
          border: `2px dashed ${dragOver ? "var(--brand)" : "var(--border)"}`,
          boxShadow: dragOver ? "var(--shadow-glow)" : "none",
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
      >
        <div className="flex flex-col items-center gap-3 cursor-pointer py-4">
          {/* PDF icon */}
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-secondary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p
            className="text-lg font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Upload an itinerary PDF
          </p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            We&apos;ll use AI to extract events and add them to the calendar
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleInputChange}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  // ── State 2: Processing ──
  if (state === "processing") {
    return (
      <div
        className="rounded-xl p-8 mb-6 text-center"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4"
          style={{
            borderColor: "var(--brand)",
            borderTopColor: "transparent",
          }}
        />
        <p className="font-medium" style={{ color: "var(--text-primary)" }}>
          Parsing your itinerary...
        </p>
      </div>
    );
  }

  // ── State 3: Preview ──
  if (state === "preview") {
    return (
      <div
        className="rounded-xl mb-6 overflow-hidden"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex flex-wrap items-center justify-between gap-2"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h3
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Found {parsedEvents.length} event
            {parsedEvents.length !== 1 ? "s" : ""}
          </h3>
          <div className="flex items-center gap-3 text-sm">
            <span style={{ color: "var(--accent-green)" }}>
              ✓ {newCount} new
            </span>
            {dupeCount > 0 && (
              <span style={{ color: "var(--text-muted)" }}>
                ✕ {dupeCount} duplicate{dupeCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Event list */}
        <div className="max-h-80 overflow-y-auto">
          {parsedEvents.map((event, i) => (
            <label
              key={i}
              className="flex items-start gap-3 px-5 py-3 cursor-pointer transition-colors hover:opacity-90"
              style={{
                borderBottom:
                  i < parsedEvents.length - 1
                    ? "1px solid var(--border-subtle)"
                    : "none",
                opacity: checkedEvents[i] ? 1 : 0.5,
              }}
            >
              <input
                type="checkbox"
                checked={checkedEvents[i]}
                onChange={() => toggleEvent(i)}
                className="mt-1 shrink-0 accent-[var(--brand)]"
                style={{ accentColor: "var(--brand)" }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="font-semibold truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {event.title}
                </p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {formatEventTime(event.start_time)}
                </p>
                {event.location && (
                  <p
                    className="text-sm truncate"
                    style={{ color: "var(--text-muted)" }}
                  >
                    📍 {event.location}
                  </p>
                )}
              </div>
              {/* Category badge */}
              <span
                className="shrink-0 inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full mt-0.5"
                style={{
                  background: `${CATEGORY_COLORS[event.category] || CATEGORY_COLORS.general}20`,
                  color:
                    CATEGORY_COLORS[event.category] ||
                    CATEGORY_COLORS.general,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{
                    background:
                      CATEGORY_COLORS[event.category] ||
                      CATEGORY_COLORS.general,
                  }}
                />
                {event.category}
              </span>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 flex flex-wrap items-center justify-end gap-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              color: "var(--text-secondary)",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40"
            style={{
              background:
                selectedCount > 0 ? "var(--brand)" : "var(--text-muted)",
            }}
          >
            Add {selectedCount} Event{selectedCount !== 1 ? "s" : ""} to
            Calendar
          </button>
        </div>
      </div>
    );
  }

  // ── State 4: Success ──
  if (state === "success") {
    return (
      <div
        className="rounded-xl p-6 mb-6 text-center"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ background: "color-mix(in srgb, var(--accent-green) 15%, transparent)" }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent-green)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>
          Added {addedCount} event{addedCount !== 1 ? "s" : ""}
          {skippedCount > 0 && (
            <span style={{ color: "var(--text-muted)" }}>
              , skipped {skippedCount} duplicate{skippedCount !== 1 ? "s" : ""}
            </span>
          )}
        </p>
        <button
          onClick={() => {
            handleReset();
            onEventsAdded();
          }}
          className="mt-3 px-5 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "var(--brand)" }}
        >
          Done
        </button>
      </div>
    );
  }

  // ── State 5: Error ──
  return (
    <div
      className="rounded-xl p-6 mb-6 text-center"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
        style={{ background: "color-mix(in srgb, var(--accent-red) 15%, transparent)" }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent-red)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>
      <p className="font-medium mb-1" style={{ color: "var(--accent-red)" }}>
        {errorMessage}
      </p>
      <button
        onClick={handleReset}
        className="mt-3 px-5 py-2 rounded-lg text-sm font-medium text-white"
        style={{ background: "var(--brand)" }}
      >
        Try Again
      </button>
    </div>
  );
}
