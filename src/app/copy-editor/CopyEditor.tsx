"use client";

import { useEffect, useState } from "react";

// Plain field-by-field editor for page copy. Deliberately not a JSON textarea: the point
// is that copy can be changed without touching code or worrying about syntax.

type Field = {
  key: string;
  label: string;
  hint?: string;
  multiline?: boolean;
};

type Deck = {
  key: string;
  label: string;
  description: string;
  fields: Field[];
  values: Record<string, string>;
};

export default function CopyEditor() {
  // One deck today. Registered in the API route, so adding a second is a config change
  // there plus a picker here rather than a new page.
  const deckKey = "impact";
  const [deck, setDeck] = useState<Deck | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/copy-editor?deck=${deckKey}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((d: Deck) => {
        if (!active) return;
        setDeck(d);
        setValues(d.values);
        setDirty(false);
      })
      .catch(() => {
        if (active) setError("Could not load copy");
      });
    return () => {
      active = false;
    };
  }, [deckKey]);

  // Warn on tab close with unsaved work.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function save() {
    setStatus("Saving...");
    setError(null);
    const res = await fetch("/api/copy-editor", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deck: deckKey, values }),
    });
    if (res.ok) {
      setDirty(false);
      setStatus("Saved");
      setTimeout(() => setStatus(null), 3000);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Save failed");
      setStatus(null);
    }
  }

  if (error && !deck) {
    return <div style={wrap}>{error}</div>;
  }
  if (!deck) {
    return <div style={wrap}>Loading...</div>;
  }

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>
          {deck.label}
        </h1>
        <p style={{ fontSize: 13, color: "#666", margin: "0 0 4px" }}>
          {deck.description}
        </p>
        <p style={{ fontSize: 12, color: "#888", margin: "0 0 24px" }}>
          Local editor. Save, then commit and deploy. Changes need a dev server
          restart to show, because the copy file is imported at build time.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <button
            onClick={save}
            disabled={!dirty}
            style={{
              background: dirty ? "#2D5016" : "#c9c4bb",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "10px 22px",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 1,
              textTransform: "uppercase",
              cursor: dirty ? "pointer" : "default",
            }}
          >
            {dirty ? "Save Changes" : "Saved"}
          </button>
          {status && <span style={{ fontSize: 13, color: "#2D5016" }}>{status}</span>}
          {error && <span style={{ fontSize: 13, color: "#b00" }}>{error}</span>}
        </div>

        {deck.fields.map((f) => (
          <div key={f.key} style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                color: "#1a1a1a",
                marginBottom: 2,
              }}
            >
              {f.label}
            </label>
            {f.hint && (
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
                {f.hint}
              </div>
            )}
            {f.multiline ? (
              <textarea
                value={values[f.key] ?? ""}
                rows={3}
                onChange={(e) => {
                  setValues({ ...values, [f.key]: e.target.value });
                  setDirty(true);
                  setStatus(null);
                }}
                style={{ ...input, resize: "vertical", lineHeight: 1.6 }}
              />
            ) : (
              <input
                value={values[f.key] ?? ""}
                onChange={(e) => {
                  setValues({ ...values, [f.key]: e.target.value });
                  setDirty(true);
                  setStatus(null);
                }}
                style={input}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  fontFamily: "system-ui, -apple-system, sans-serif",
  background: "#f0ebe2",
  minHeight: "100vh",
  padding: "48px 24px 96px",
  position: "fixed",
  inset: 0,
  overflowY: "auto",
  zIndex: 9999,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #ddd6ca",
  borderRadius: 4,
  fontSize: 14,
  fontFamily: "inherit",
  background: "#fff",
  color: "#1a1a1a",
};
