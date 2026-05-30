"use client";

import { useState, useRef, useEffect } from "react";

export default function HeroImageEditor() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  function handleOpen() {
    setUrl("");
    setError("");
    setSaving(false);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  async function handleSave() {
    if (!url.trim()) {
      setError("Please enter an image URL.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/setup/config/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroImageUrl: url.trim() }),
      });
      if (!res.ok) throw new Error("Failed to save");
      window.location.reload();
    } catch {
      setError("Failed to save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <>
      {/* Floating edit button */}
      <button
        onClick={handleOpen}
        title="Change Hero Image"
        style={{
          position: "absolute",
          bottom: "1rem",
          right: "1rem",
          zIndex: 20,
          width: "2.5rem",
          height: "2.5rem",
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.3)",
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(8px)",
          color: "white",
          fontSize: "1.1rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s, transform 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(0,0,0,0.6)";
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(0,0,0,0.4)";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        📷
      </button>

      {/* Modal */}
      <dialog
        ref={dialogRef}
        onClose={handleClose}
        style={{
          position: "fixed",
          zIndex: 1000,
          border: "1px solid var(--border)",
          borderRadius: "1rem",
          padding: "0",
          maxWidth: "480px",
          width: "90vw",
          background: "var(--bg-card)",
          color: "var(--text-primary)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div style={{ padding: "1.5rem" }}>
          <h3
            style={{
              margin: "0 0 1rem 0",
              fontSize: "1.25rem",
              fontWeight: 700,
            }}
          >
            Change Hero Image
          </h3>

          <label
            htmlFor="hero-url-input"
            style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: 500,
              marginBottom: "0.375rem",
              color: "var(--text-secondary)",
            }}
          >
            Image URL
          </label>
          <input
            id="hero-url-input"
            type="url"
            placeholder="https://images.unsplash.com/..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
            }}
            style={{
              width: "100%",
              padding: "0.625rem 0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid var(--border)",
              background: "var(--bg-page)",
              color: "var(--text-primary)",
              fontSize: "0.875rem",
              boxSizing: "border-box",
              outline: "none",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--brand)";
              e.currentTarget.style.boxShadow =
                "0 0 0 3px color-mix(in srgb, var(--brand) 20%, transparent)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
            autoFocus
          />

          {/* Preview */}
          {url.trim() && (
            <div
              style={{
                marginTop: "1rem",
                borderRadius: "0.5rem",
                overflow: "hidden",
                border: "1px solid var(--border)",
                position: "relative",
                paddingBottom: "40%",
                background: "var(--bg-page)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url.trim()}
                alt="Preview"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                onError={() => setError("Could not load image. Check the URL.")}
              />
            </div>
          )}

          {error && (
            <p
              style={{
                color: "#ef4444",
                fontSize: "0.8125rem",
                marginTop: "0.5rem",
                marginBottom: 0,
              }}
            >
              {error}
            </p>
          )}

          {/* Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              marginTop: "1.25rem",
            }}
          >
            <button
              onClick={handleClose}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "1px solid var(--border)",
                background: "var(--bg-page)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !url.trim()}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "0.5rem",
                border: "none",
                background: saving || !url.trim() ? "var(--border)" : "var(--brand)",
                color: saving || !url.trim() ? "var(--text-muted)" : "white",
                cursor: saving || !url.trim() ? "not-allowed" : "pointer",
                fontSize: "0.875rem",
                fontWeight: 600,
              }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
