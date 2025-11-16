import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import SiliconLabsLogo from "./assets/silicon-labs-logo.svg";
import { API_BASE } from "./config";
const FN_URL = API_BASE; // use this for fetch(`${FN_URL}/rag`, ...)

// Types
type Source = { id: string; key: string };
type BackendOut = { answer?: string; sources?: Source[]; error?: string };

type ChatMsg =
  | { id: string; role: "user"; text: string; ts: number }
  | {
      id: string;
      role: "assistant";
      text: string;
      ts: number;
      sources?: Source[];
      error?: string;
    };

const LS_KEY = "siliconlabs_chat_history_v1";

export default function App() {
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? (JSON.parse(raw) as ChatMsg[]) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);

  const toHref = useMemo(
    () => (s: string) => (/^https?:\/\//i.test(s) ? s : undefined),
    []
  );

  // Persist to localStorage whenever messages change
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(msgs));
  }, [msgs]);

  // Auto-scroll to bottom on new messages
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, loading]);

  async function sendPrompt(prompt: string) {
    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: "user",
      text: prompt,
      ts: Date.now(),
    };
    setMsgs((m) => [...m, userMsg]);
    setLoading(true);

    try {
      const r = await fetch(`${FN_URL}/rag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt.trim() }),
      });
      const data = (await r.json()) as BackendOut;

      const asstMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: data.answer || "",
        ts: Date.now(),
        sources: data.sources,
        error: data.error,
      };
      setMsgs((m) => [...m, asstMsg]);
    } catch (err: any) {
      const asstMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "",
        ts: Date.now(),
        error: err?.message || "Network error",
      };
      setMsgs((m) => [...m, asstMsg]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput("");
    void sendPrompt(q);
  }

  function newChat() {
    setMsgs([]);
    localStorage.removeItem(LS_KEY);
    setInput("");
  }

  // Regenerate last answer (resend the last user query)
  function regenerate() {
    if (loading) return;
    // Find last user message
    const lastUser = [...msgs].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setLoading(true);
    // Remove trailing assistant (if any) so regenerate replaces it in flow
    setMsgs((m) => {
      const trimmed = [...m];
      // If the very last message is assistant, pop it
      if (trimmed[trimmed.length - 1]?.role === "assistant") {
        trimmed.pop();
      }
      return trimmed;
    });
    void sendPrompt(lastUser.text);
  }

  return (
    <div className="page">
      <div className="container container--chat">
        {/* Header */}
        <header className="header">
          <img src={SiliconLabsLogo} className="logo" alt="SiliconLabs" />
          <div className="header-meta">
            <span className="brand">Leading innovator in low-power wireless connectivity</span>
            <button className="new-chat" onClick={newChat} title="New chat">
              New chat
            </button>
          </div>
        </header>

        {/* Title / Subtitle */}
        {msgs.length === 0 && (
          <section className="hero hero--center">
            <h1 className="h1">SiliconLabs</h1>
            <p className="sub">Ask your queries about Silicon Labs here.</p>
          </section>
        )}

        {/* Chat area */}
        <main className="chat">
          {msgs.map((m) =>
            m.role === "user" ? (
              <UserBubble key={m.id} text={m.text} ts={m.ts} />
            ) : (
              <AssistantBubble
                key={m.id}
                text={m.text}
                ts={m.ts}
                sources={m.sources}
                error={m.error}
                toHref={toHref}
              />
            )
          )}

          {loading && <TypingBubble />}

          <div ref={bottomRef} />
        </main>

        {/* Composer */}
        <form className="composer" onSubmit={onSubmit}>
          <textarea
            className="composer-input"
            placeholder="Type your question…  (Shift+Enter for new line)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !loading) onSubmit(e);
              }
            }}
            rows={1}
          />
          <div className="composer-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={regenerate}
              disabled={loading || msgs.length === 0}
              title="Regenerate last answer"
            >
              ↻ Regenerate
            </button>
            <button
              type="submit"
              className={`btn ${loading || !input.trim() ? "btn-disabled" : ""}`}
              disabled={loading || !input.trim()}
              title="Send"
            >
              {loading ? "Sending…" : "Send"}
            </button>
          </div>
        </form>

        {/* Footer */}
        <footer className="footer">
          Unofficial demo for educational purposes. SiliconLabs® is a trademark of
          Silicon Labs Corporation.
        </footer>
      </div>
    </div>
  );
}

/* ---------------- Bubbles ---------------- */

function UserBubble({ text, ts }: { text: string; ts: number }) {
  return (
    <div className="bubble-row user">
      <div className="bubble user-bubble">
        <div className="bubble-text">{text}</div>
        <div className="bubble-meta">{formatTs(ts)}</div>
      </div>
    </div>
  );
}

function AssistantBubble({
  text,
  ts,
  sources,
  error,
  toHref,
}: {
  text: string;
  ts: number;
  sources?: Source[];
  error?: string;
  toHref: (s: string) => string | undefined;
}) {
  return (
    <div className="bubble-row assistant">
      <div className="bubble assistant-bubble">
        {error ? (
          <div className="bubble-error">Error: {error}</div>
        ) : (
          <>
            <div className="bubble-text">{text || "—"}</div>
            {!!sources?.length && (
              <div className="bubble-sources">
                <div className="sources-title">Sources</div>
                <ul className="sources-list">
                  {sources.map((s) => {
                    const href = toHref(s.key) || toHref(s.id);
                    return (
                      <li key={s.id} className="source-item">
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="source-link"
                          >
                            {s.id}
                          </a>
                        ) : (
                          <code className="code-chip">{s.id}</code>
                        )}
                        <span className="source-key">
                          {" — "}
                          <code>{s.key}</code>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <div className="bubble-meta">{formatTs(ts)}</div>
          </>
        )}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="bubble-row assistant">
      <div className="bubble assistant-bubble typing">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
}

/* ---------------- Utils ---------------- */
function formatTs(ts: number) {
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return "";
  }
}
