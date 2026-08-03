"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// Simple two-pane copy editor: pick an email on the left, edit it in the middle, see the
// rendered result on the right. Saves straight to src/lib/nurture/copy.json.
//
// Paragraphs are edited as one textarea with blank lines between them, which is far less
// fiddly than managing a list of inputs, and maps cleanly onto the string array the
// template expects.

type Cta = { label: string; path: string };

type Body = {
  subject: string;
  heading: string;
  paragraphs: string[];
  cta?: Cta;
};

type Step = {
  key: string;
  dayOffset: number;
  body: Body;
};

type Track = "mentee" | "mentor";

type CopyFile = Record<Track, Step[]>;

type Selection = { track: Track; index: number };

const paragraphsToText = (p: string[]) => p.join("\n\n");
const textToParagraphs = (t: string) =>
  t
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

export default function NurtureEditor() {
  const [copy, setCopy] = useState<CopyFile | null>(null);
  const [selection, setSelection] = useState<Selection>({
    track: "mentee",
    index: 0,
  });
  const [previewHtml, setPreviewHtml] = useState("");
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The paragraph textarea holds its own raw text rather than rendering
  // paragraphsToText(textToParagraphs(...)) on every keystroke. That round trip is lossy:
  // textToParagraphs trims each paragraph, so typing a space at the end of the text had
  // it deleted before it could render, and React then reset the caret to the end. The
  // stored data is still the parsed array; only the display value is raw.
  const [paragraphText, setParagraphText] = useState("");

  useEffect(() => {
    fetch("/api/nurture-editor")
      .then((r) => r.json())
      .then(setCopy)
      .catch(() => setError("Could not load copy.json"));
  }, []);

  const step: Step | null = copy
    ? copy[selection.track][selection.index] ?? null
    : null;
  const body: Body | null = step ? step.body : null;

  // Reload the raw text only when the loaded file or the selected email changes, never on
  // an edit. Re-seeding it on every keystroke would reintroduce the caret jump.
  useEffect(() => {
    if (!copy) return;
    const s = copy[selection.track][selection.index];
    if (s) setParagraphText(paragraphsToText(s.body.paragraphs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copy === null, selection.track, selection.index]);

  // Warn on tab close with unsaved work.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const renderPreview = useCallback(async (b: Body) => {
    try {
      const res = await fetch("/api/nurture-editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: b }),
      });
      const data = await res.json();
      setPreviewHtml(data.html || "");
    } catch {
      /* preview is best effort */
    }
  }, []);

  // Debounce so every keystroke does not hit the renderer.
  useEffect(() => {
    if (!body) return;
    const t = setTimeout(() => renderPreview(body), 400);
    return () => clearTimeout(t);
  }, [body, renderPreview]);

  function updateBody(patch: Partial<Body>) {
    if (!copy || !step) return;
    const next: CopyFile = structuredClone(copy);
    Object.assign(next[selection.track][selection.index].body, patch);
    setCopy(next);
    setDirty(true);
    setStatus(null);
  }

  function updateStep(patch: Partial<Step>) {
    if (!copy || !step) return;
    const next: CopyFile = structuredClone(copy);
    Object.assign(next[selection.track][selection.index], patch);
    setCopy(next);
    setDirty(true);
    setStatus(null);
  }

  async function save() {
    if (!copy) return;
    setStatus("Saving...");
    setError(null);
    const res = await fetch("/api/nurture-editor", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(copy),
    });
    if (res.ok) {
      setDirty(false);
      setStatus("Saved to copy.json");
      setTimeout(() => setStatus(null), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Save failed");
      setStatus(null);
    }
  }

  const allSteps = useMemo(() => {
    if (!copy) return [];
    const out: { label: string; sub: string; sel: Selection }[] = [];
    (["mentee", "mentor"] as Track[]).forEach((track) => {
      copy[track].forEach((s, index) => {
        out.push({
          label: `${track} · day ${s.dayOffset}`,
          sub: s.body.subject,
          sel: { track, index },
        });
      });
    });
    return out;
  }, [copy]);

  if (error && !copy) {
    return <div style={{ padding: 40, fontFamily: "system-ui" }}>{error}</div>;
  }
  if (!copy || !step || !body) {
    return <div style={{ padding: 40, fontFamily: "system-ui" }}>Loading...</div>;
  }

  const isSelected = (s: Selection) =>
    s.track === selection.track && s.index === selection.index;

  return (
    <div
      // Fixed overlay so the site header and footer from the root layout do not bleed
      // through. This is a standalone tool, not a page of the marketing site.
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "grid",
        gridTemplateColumns: "260px minmax(360px, 1fr) minmax(420px, 1fr)",
        background: "#f0ebe2",
      }}
    >
      {/* Step list */}
      <aside
        style={{
          borderRight: "1px solid #ddd6ca",
          overflowY: "auto",
          background: "#fff",
        }}
      >
        <div style={{ padding: "18px 16px", borderBottom: "1px solid #ddd6ca" }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1a1a" }}>
            Nurture Copy
          </div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            Local editor. Save, then commit and deploy.
          </div>
        </div>
        {allSteps.map((item, i) => (
          <button
            key={i}
            onClick={() => setSelection(item.sel)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "12px 16px",
              border: "none",
              borderBottom: "1px solid #f0ebe2",
              borderLeft: isSelected(item.sel)
                ? "3px solid #2D5016"
                : "3px solid transparent",
              background: isSelected(item.sel) ? "#f7f4ee" : "#fff",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                color: "#2D5016",
                fontWeight: 700,
              }}
            >
              {item.label}
            </div>
            <div style={{ fontSize: 13, color: "#1a1a1a", marginTop: 3 }}>
              {item.sub}
            </div>
          </button>
        ))}
      </aside>

      {/* Editor */}
      <main style={{ overflowY: "auto", padding: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
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

        <Field label="Subject line" hint="What shows in the inbox">
          <input
            value={body.subject}
            onChange={(e) => updateBody({ subject: e.target.value })}
            style={inputStyle}
          />
        </Field>

        <Field label="Heading" hint="The big line at the top of the email">
          <input
            value={body.heading}
            onChange={(e) => updateBody({ heading: e.target.value })}
            style={inputStyle}
          />
        </Field>

        <Field label="Paragraphs" hint="Leave a blank line between paragraphs">
          <textarea
            value={paragraphText}
            onChange={(e) => {
              setParagraphText(e.target.value);
              updateBody({ paragraphs: textToParagraphs(e.target.value) });
            }}
            rows={16}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          />
        </Field>

        <Field label="Button" hint="Leave both blank for no button">
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Button text"
              value={body.cta?.label || ""}
              onChange={(e) =>
                updateBody({
                  cta:
                    e.target.value || body.cta?.path
                      ? { label: e.target.value, path: body.cta?.path || "/events" }
                      : undefined,
                })
              }
              style={{ ...inputStyle, flex: 2 }}
            />
            <input
              placeholder="/events"
              value={body.cta?.path || ""}
              onChange={(e) =>
                updateBody({
                  cta:
                    body.cta?.label || e.target.value
                      ? {
                          label: body.cta?.label || "Learn More",
                          path: e.target.value,
                        }
                      : undefined,
                })
              }
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </Field>

        <Field
          label="Send timing"
          hint="Days after they apply. Day 0 sends immediately."
        >
          <input
            type="number"
            min={0}
            value={step.dayOffset}
            onChange={(e) =>
              updateStep({ dayOffset: Number(e.target.value) || 0 })
            }
            style={{ ...inputStyle, width: 120 }}
          />
        </Field>

        <p style={{ fontSize: 12, color: "#888", marginTop: 24, lineHeight: 1.6 }}>
          Internal id: <code>{step.key}</code>. This is how we track who has already
          received which email, so it is not editable here. Changing it would resend
          this email to everyone currently in the sequence.
        </p>
      </main>

      {/* Preview */}
      <section
        style={{
          borderLeft: "1px solid #ddd6ca",
          background: "#e8e3db",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "#666",
            borderBottom: "1px solid #ddd6ca",
          }}
        >
          Live Preview
        </div>
        <iframe
          srcDoc={previewHtml}
          style={{ flex: 1, width: "100%", border: "none", background: "#fff" }}
          title="Email preview"
        />
      </section>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #ddd6ca",
  borderRadius: 4,
  fontSize: 14,
  fontFamily: "inherit",
  background: "#fff",
  color: "#1a1a1a",
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
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
        {label}
      </label>
      {hint && (
        <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{hint}</div>
      )}
      {children}
    </div>
  );
}
