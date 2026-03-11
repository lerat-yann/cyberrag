import { useState, useEffect, useRef, useCallback } from "react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://marylynn-hyperpyretic-peg.ngrok-free.dev";

const NGROK_HEADERS = {
  "ngrok-skip-browser-warning": "true",
};

const apiFetch = (url, options = {}) => {
  const isFormData = options.body instanceof FormData;
  return fetch(url, {
    ...options,
    headers: {
      ...NGROK_HEADERS,
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });
};

/* ─── Typewriter hook ────────────────────────────────────────── */
function useTypewriter(text, speed = 18, active = true) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!active || !text) {
      setDisplayed(text);
      setDone(true);
      return;
    }
    setDisplayed("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, active]);
  return { displayed, done };
}

/* ─── Scramble text hook ─────────────────────────────────────── */
function useScramble(finalText, duration = 600) {
  const [text, setText] = useState(finalText);
  const chars =
    "!<>-_\\/[]{}—=+*^?#@$%&ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef0123456789";
  useEffect(() => {
    let frame = 0;
    const total = Math.floor(duration / 16);
    const id = setInterval(() => {
      frame++;
      const progress = frame / total;
      const revealed = Math.floor(progress * finalText.length);
      const scrambled = finalText
        .split("")
        .map((ch, i) => {
          if (i < revealed) return ch;
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join("");
      setText(scrambled);
      if (frame >= total) {
        setText(finalText);
        clearInterval(id);
      }
    }, 16);
    return () => clearInterval(id);
  }, [finalText]);
  return text;
}

/* ─── SVG Icons ──────────────────────────────────────────────── */
const Icon = ({ d, size = 16, vb = "0 0 24 24" }) => (
  <svg
    width={size}
    height={size}
    viewBox={vb}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);
const IconShield = () => (
  <Icon d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" />
);
const IconSend = () => <Icon d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />;
const IconFile = () => (
  <Icon d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" />
);
const IconTrash = () => (
  <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
);
const IconUpload = () => (
  <Icon d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
);
const IconChevron = ({ open }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transform: open ? "rotate(180deg)" : "rotate(0deg)",
      transition: "transform 0.2s",
    }}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);
const IconSpinner = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    style={{ animation: "spin 1s linear infinite" }}
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
      strokeOpacity="0.2"
    />
    <path
      d="M12 2a10 10 0 0110 10"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);
const IconX = () => <Icon d="M18 6L6 18M6 6l12 12" size={12} />;

/* ─── Animated background grid ──────────────────────────────── */
function CyberGrid() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        backgroundImage: `
        linear-gradient(rgba(0,255,65,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,255,65,0.03) 1px, transparent 1px)
      `,
        backgroundSize: "40px 40px",
      }}
    />
  );
}

/* ─── Scanline overlay ───────────────────────────────────────── */
function Scanlines() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
        background:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
      }}
    />
  );
}

/* ─── Status badge ───────────────────────────────────────────── */
function StatusBadge({ status }) {
  const color = status.indexing
    ? "#f59e0b"
    : status.ready
      ? "#00ff41"
      : "#ef4444";
  const label = status.indexing
    ? "INDEXING"
    : status.ready
      ? "ONLINE"
      : "OFFLINE";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "inherit",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 6px ${color}, 0 0 12px ${color}44`,
          animation: "pulse 2s ease-in-out infinite",
        }}
      />
      <span
        style={{
          fontSize: 11,
          color,
          letterSpacing: "0.12em",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      {status.ready && (
        <span
          style={{
            fontSize: 10,
            color: "rgba(0,255,65,0.4)",
            letterSpacing: "0.08em",
          }}
        >
          [{status.pdf_count} DOC{status.pdf_count !== 1 ? "S" : ""} /{" "}
          {status.chunk_count} CHUNKS]
        </span>
      )}
    </div>
  );
}

/* ─── Source card ────────────────────────────────────────────── */
function SourceCard({ src, index }) {
  return (
    <div
      style={{
        background: "rgba(0,255,65,0.03)",
        border: "1px solid rgba(0,255,65,0.12)",
        borderRadius: 6,
        padding: "10px 12px",
        marginBottom: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#00ff41",
            background: "rgba(0,255,65,0.1)",
            border: "1px solid rgba(0,255,65,0.3)",
            padding: "1px 6px",
            borderRadius: 3,
            letterSpacing: "0.06em",
          }}
        >
          SRC_{String(index + 1).padStart(2, "0")}
        </span>
        <span
          style={{
            fontSize: 10,
            color: "rgba(0,255,65,0.5)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <IconFile /> {src.source}
          {src.page != null && (
            <span style={{ color: "rgba(0,255,65,0.3)" }}>
              · P.{src.page + 1}
            </span>
          )}
        </span>
      </div>
      <p
        style={{
          fontSize: 10,
          color: "rgba(0,255,65,0.4)",
          lineHeight: 1.6,
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {src.content}
      </p>
    </div>
  );
}

/* ─── Message ────────────────────────────────────────────────── */
function Message({ msg, isLatest }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const isBot = msg.role === "assistant";
  const { displayed } = useTypewriter(msg.content, 12, isBot && isLatest);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isBot ? "flex-start" : "flex-end",
        gap: 6,
        marginBottom: 20,
        animation: "fadeSlideIn 0.3s ease forwards",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.15em",
          fontWeight: 700,
          color: isBot ? "rgba(0,255,65,0.5)" : "rgba(0,180,255,0.5)",
          paddingInline: 4,
        }}
      >
        {isBot ? "◈ SYSTEM" : "◈ OPERATOR"}
      </div>

      <div
        style={{
          maxWidth: "82%",
          background: isBot ? "rgba(0,255,65,0.04)" : "rgba(0,180,255,0.06)",
          border: `1px solid ${isBot ? "rgba(0,255,65,0.15)" : "rgba(0,180,255,0.2)"}`,
          borderRadius: isBot ? "2px 12px 12px 12px" : "12px 2px 12px 12px",
          padding: "12px 16px",
          fontSize: 13,
          lineHeight: 1.75,
          color: isBot ? "rgba(0,255,65,0.9)" : "rgba(0,180,255,0.9)",
          fontFamily: "inherit",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {isBot && isLatest ? displayed : msg.content}
        {isBot && isLatest && displayed !== msg.content && (
          <span
            style={{
              animation: "blink 0.8s step-end infinite",
              color: "#00ff41",
            }}
          >
            ▌
          </span>
        )}
      </div>

      {isBot && msg.sources && msg.sources.length > 0 && (
        <div style={{ width: "82%", paddingInline: 4 }}>
          <button
            onClick={() => setSourcesOpen(!sourcesOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10,
              color: "rgba(0,255,65,0.4)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.1em",
              padding: "4px 0",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.color = "rgba(0,255,65,0.8)")}
            onMouseLeave={(e) => (e.target.style.color = "rgba(0,255,65,0.4)")}
          >
            <IconChevron open={sourcesOpen} />
            {sourcesOpen ? "MASQUER" : "AFFICHER"} {msg.sources.length} SOURCE
            {msg.sources.length > 1 ? "S" : ""}
            {msg.duration_ms && (
              <span
                style={{ marginLeft: "auto", color: "rgba(0,255,65,0.25)" }}
              >
                {msg.duration_ms}ms
              </span>
            )}
          </button>
          {sourcesOpen && (
            <div style={{ marginTop: 8 }}>
              {msg.sources.map((src, i) => (
                <SourceCard key={i} src={src} index={i} />
              ))}
            </div>
          )}
        </div>
      )}

      {msg.error && (
        <div
          style={{
            fontSize: 10,
            color: "#ef4444",
            paddingInline: 4,
            letterSpacing: "0.06em",
          }}
        >
          ⚠ {msg.content}
        </div>
      )}
    </div>
  );
}

/* ─── Upload panel ───────────────────────────────────────────── */
function UploadPanel({ onRefresh }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState([]);
  const [hiddenDocs, setHiddenDocs] = useState([]);
  const [msg, setMsg] = useState("");
  const inputRef = useRef();

  const fetchDocs = useCallback(async () => {
    try {
      const r = await apiFetch(`${API_URL}/documents`);
      const d = await r.json();
      const hiddenDocNames = new Set(hiddenDocs);
      setDocs((d.documents || []).filter((doc) => !hiddenDocNames.has(doc.name)));
    } catch {
      setDocs([]);
    }
  }, [hiddenDocs]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleFiles = async (files) => {
    const pdfs = [...files].filter((f) =>
      f.name.toLowerCase().endsWith(".pdf"),
    );
    if (!pdfs.length) {
      setMsg("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    setUploading(true);
    setMsg("");
    const form = new FormData();
    pdfs.forEach((f) => form.append("files", f));
    try {
      await apiFetch(`${API_URL}/upload`, { method: "POST", body: form });
      setHiddenDocs((currentHiddenDocs) =>
        currentHiddenDocs.filter(
          (name) => !pdfs.some((file) => file.name === name),
        ),
      );
      setMsg(`✓ ${pdfs.length} fichier(s) uploadé(s) — réindexation en cours…`);
      setTimeout(() => {
        fetchDocs();
        onRefresh();
        setMsg("");
      }, 3000);
    } catch {
      setMsg("Erreur lors de l'upload.");
    }
    setUploading(false);
  };

  const handleDelete = async (name) => {
    setHiddenDocs((currentHiddenDocs) =>
      currentHiddenDocs.includes(name)
        ? currentHiddenDocs
        : [...currentHiddenDocs, name],
    );
    setDocs((currentDocs) => currentDocs.filter((doc) => doc.name !== name));
    setMsg(`✓ ${name} masqué jusqu'au prochain rafraîchissement.`);
    setTimeout(() => setMsg(""), 3000);
  };

  return (
    <div
      style={{
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "100%",
      }}
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `1px dashed ${dragging ? "#00ff41" : "rgba(0,255,65,0.2)"}`,
          borderRadius: 8,
          padding: "24px 16px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "rgba(0,255,65,0.06)" : "transparent",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.borderColor = "rgba(0,255,65,0.4)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor = dragging
            ? "#00ff41"
            : "rgba(0,255,65,0.2)")
        }
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div
          style={{
            color: "rgba(0,255,65,0.5)",
            marginBottom: 6,
            display: "flex",
            justifyContent: "center",
          }}
        >
          {uploading ? <IconSpinner /> : <IconUpload />}
        </div>
        <p
          style={{
            fontSize: 11,
            color: "rgba(0,255,65,0.5)",
            letterSpacing: "0.1em",
          }}
        >
          {uploading ? "UPLOAD EN COURS…" : "DROP PDF ICI"}
        </p>
        <p style={{ fontSize: 10, color: "rgba(0,255,65,0.25)", marginTop: 3 }}>
          ou cliquer pour sélectionner
        </p>
      </div>

      {msg && (
        <div
          style={{
            fontSize: 10,
            color: msg.startsWith("✓") ? "#00ff41" : "#ef4444",
            background: msg.startsWith("✓")
              ? "rgba(0,255,65,0.06)"
              : "rgba(239,68,68,0.06)",
            border: `1px solid ${msg.startsWith("✓") ? "rgba(0,255,65,0.2)" : "rgba(239,68,68,0.2)"}`,
            borderRadius: 6,
            padding: "8px 12px",
            letterSpacing: "0.04em",
          }}
        >
          {msg}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto" }}>
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.15em",
            color: "rgba(0,255,65,0.3)",
            marginBottom: 10,
            fontWeight: 700,
          }}
        >
          CORPUS [{docs.length}]
        </p>
        <p
          style={{
            fontSize: 9,
            color: "rgba(0,255,65,0.22)",
            marginBottom: 10,
            lineHeight: 1.5,
          }}
        >
          Masquer retire seulement le document de ce navigateur. Le serveur et
          le corpus restent inchanges.
        </p>
        {docs.length === 0 ? (
          <p
            style={{
              fontSize: 10,
              color: "rgba(0,255,65,0.2)",
              textAlign: "center",
              padding: "20px 0",
            }}
          >
            — aucun document indexé —
          </p>
        ) : (
          docs.map((doc) => (
            <div
              key={doc.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                marginBottom: 4,
                background: "rgba(0,255,65,0.03)",
                border: "1px solid rgba(0,255,65,0.08)",
                borderRadius: 6,
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "rgba(0,255,65,0.2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "rgba(0,255,65,0.08)")
              }
            >
              <span style={{ color: "rgba(0,255,65,0.4)" }}>
                <IconFile />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 11,
                    color: "rgba(0,255,65,0.8)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {doc.name}
                </p>
                <p
                  style={{
                    fontSize: 9,
                    color: "rgba(0,255,65,0.3)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {doc.size_kb} Ko
                </p>
              </div>
              <button
                onClick={() => handleDelete(doc.name)}
                title="Masquer dans ce navigateur"
                aria-label={`Masquer ${doc.name} dans ce navigateur`}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(0,255,65,0.2)",
                  transition: "color 0.2s",
                  padding: 2,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(0,255,65,0.2)")
                }
              >
                <IconTrash />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Suggested questions ────────────────────────────────────── */
const SUGGESTIONS = [
  "Quelle est la politique de gestion des incidents ?",
  "Quels sont les contrôles d'accès recommandés ?",
  "Comment gérer une fuite de données ?",
  "Quelles sont les exigences de chiffrement ?",
];

/* ─── Main App ───────────────────────────────────────────────── */
export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({
    ready: false,
    indexing: false,
    pdf_count: 0,
    chunk_count: 0,
    model: "",
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef();
  const inputRef = useRef();
  const title = useScramble("CYBERRAG", 900);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await apiFetch(`${API_URL}/status`);
      const d = await r.json();
      setStatus(d);
    } catch {
      setStatus((s) => ({ ...s, ready: false }));
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 4000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (question = input) => {
    const q = question.trim();
    if (!q || loading || !status.ready) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);

    try {
      const r = await apiFetch(`${API_URL}/query`, {
        method: "POST",
        body: JSON.stringify({ question: q, top_k: 3 }),
      });
      if (!r.ok) {
        const err = await r.json();
        setMessages((m) => [
          ...m,
          { role: "assistant", content: err.detail, sources: [], error: true },
        ]);
      } else {
        const d = await r.json();
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: d.response,
            sources: d.sources,
            duration_ms: d.duration_ms,
          },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Connexion au backend impossible.",
          error: true,
        },
      ]);
    }
    setLoading(false);
  };

  const isEmpty = messages.length === 0;

  return (
    <div
      style={{
        height: "100vh",
        background: "#0a0a0a",
        color: "#00ff41",
        fontFamily: "'Share Tech Mono', 'Courier New', monospace",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap"
        rel="stylesheet"
      />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glitch {
          0%,100%{clip-path:inset(0 0 98% 0)} 10%{clip-path:inset(40% 0 50% 0)}
          20%{clip-path:inset(80% 0 5% 0)} 30%{clip-path:inset(25% 0 70% 0)}
          40%{clip-path:inset(65% 0 20% 0)} 50%{clip-path:inset(10% 0 85% 0)}
        }
        * { scrollbar-width: thin; scrollbar-color: rgba(0,255,65,0.2) transparent; }
        *::-webkit-scrollbar { width: 4px; }
        *::-webkit-scrollbar-thumb { background: rgba(0,255,65,0.2); border-radius: 2px; }
        textarea,input { caret-color: #00ff41; }
      `}</style>

      <CyberGrid />
      <Scanlines />

      {/* ── Header ── */}
      <header
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 20px",
          borderBottom: "1px solid rgba(0,255,65,0.12)",
          background: "rgba(10,10,10,0.9)",
          backdropFilter: "blur(8px)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: "1px solid rgba(0,255,65,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,255,65,0.08)",
              color: "#00ff41",
            }}
          >
            <IconShield />
          </div>
          <div>
            <h1
              style={{
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "0.25em",
                color: "#00ff41",
                margin: 0,
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontSize: 9,
                color: "rgba(0,255,65,0.35)",
                letterSpacing: "0.15em",
                margin: 0,
              }}
            >
              RAG SECURITY ASSISTANT v1.0
            </p>
          </div>
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <StatusBadge status={status} />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: "none",
              border: "1px solid rgba(0,255,65,0.2)",
              color: "rgba(0,255,65,0.6)",
              cursor: "pointer",
              padding: "5px 10px",
              fontSize: 10,
              letterSpacing: "0.1em",
              fontFamily: "inherit",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,255,65,0.6)";
              e.currentTarget.style.color = "#00ff41";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,255,65,0.2)";
              e.currentTarget.style.color = "rgba(0,255,65,0.6)";
            }}
          >
            {sidebarOpen ? "HIDE CORPUS" : "SHOW CORPUS"}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
          zIndex: 5,
        }}
      >
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
            {isEmpty && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  gap: 24,
                  animation: "fadeSlideIn 0.6s ease forwards",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    border: "1px solid rgba(0,255,65,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,255,65,0.05)",
                    color: "rgba(0,255,65,0.6)",
                    fontSize: 28,
                  }}
                >
                  <IconShield />
                </div>
                <div style={{ textAlign: "center" }}>
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(0,255,65,0.7)",
                      letterSpacing: "0.15em",
                      marginBottom: 6,
                    }}
                  >
                    SYSTÈME PRÊT
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "rgba(0,255,65,0.3)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {status.ready
                      ? `Corpus chargé — ${status.pdf_count} document(s) indexé(s)`
                      : "Uploadez des PDFs pour initialiser le corpus"}
                  </p>
                </div>
                {status.ready && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      justifyContent: "center",
                      maxWidth: 560,
                    }}
                  >
                    {SUGGESTIONS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(s)}
                        style={{
                          background: "rgba(0,255,65,0.04)",
                          border: "1px solid rgba(0,255,65,0.15)",
                          color: "rgba(0,255,65,0.6)",
                          cursor: "pointer",
                          padding: "7px 14px",
                          fontSize: 10,
                          letterSpacing: "0.06em",
                          fontFamily: "inherit",
                          borderRadius: 4,
                          transition: "all 0.2s",
                          lineHeight: 1.5,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "rgba(0,255,65,0.4)";
                          e.currentTarget.style.color = "#00ff41";
                          e.currentTarget.style.background = "rgba(0,255,65,0.08)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "rgba(0,255,65,0.15)";
                          e.currentTarget.style.color = "rgba(0,255,65,0.6)";
                          e.currentTarget.style.background = "rgba(0,255,65,0.04)";
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <Message
                key={i}
                msg={msg}
                isLatest={i === messages.length - 1 && msg.role === "assistant"}
              />
            ))}

            {loading && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  marginBottom: 20,
                  animation: "fadeSlideIn 0.3s ease forwards",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.15em",
                    color: "rgba(0,255,65,0.4)",
                    fontWeight: 700,
                  }}
                >
                  ◈ SYSTEM
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    background: "rgba(0,255,65,0.04)",
                    border: "1px solid rgba(0,255,65,0.12)",
                    borderRadius: "2px 12px 12px 12px",
                    padding: "10px 16px",
                    fontSize: 11,
                    color: "rgba(0,255,65,0.6)",
                    letterSpacing: "0.08em",
                  }}
                >
                  <IconSpinner /> ANALYSE VECTORIELLE EN COURS…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {!status.ready && !status.indexing && (
            <div
              style={{
                margin: "0 28px 8px",
                padding: "8px 14px",
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: 4,
                fontSize: 10,
                color: "rgba(245,158,11,0.8)",
                letterSpacing: "0.08em",
              }}
            >
              ⚠ CORPUS VIDE — Uploadez des PDFs dans le panneau CORPUS pour
              activer le système
            </div>
          )}

          <div
            style={{
              padding: "12px 28px 20px",
              borderTop: "1px solid rgba(0,255,65,0.08)",
              background: "rgba(10,10,10,0.6)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
                background: "rgba(0,255,65,0.03)",
                border: `1px solid ${input ? "rgba(0,255,65,0.3)" : "rgba(0,255,65,0.12)"}`,
                borderRadius: 4,
                padding: "10px 10px 10px 14px",
                transition: "border-color 0.2s",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(0,255,65,0.4)",
                  paddingBottom: 2,
                  letterSpacing: "0.06em",
                  flexShrink: 0,
                }}
              >
                &gt;_
              </span>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={
                  status.ready
                    ? "Entrez votre requête… (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)"
                    : "Système hors ligne…"
                }
                disabled={!status.ready || loading}
                rows={1}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  outline: "none",
                  color: "#00ff41",
                  fontFamily: "inherit",
                  fontSize: 13,
                  resize: "none",
                  lineHeight: 1.6,
                  padding: 0,
                  opacity: !status.ready || loading ? 0.35 : 1,
                  minHeight: 22,
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || !status.ready || loading}
                style={{
                  background:
                    input.trim() && status.ready && !loading
                      ? "rgba(0,255,65,0.15)"
                      : "transparent",
                  border: `1px solid ${input.trim() && status.ready && !loading ? "rgba(0,255,65,0.4)" : "rgba(0,255,65,0.1)"}`,
                  color:
                    input.trim() && status.ready && !loading
                      ? "#00ff41"
                      : "rgba(0,255,65,0.2)",
                  cursor:
                    input.trim() && status.ready && !loading
                      ? "pointer"
                      : "not-allowed",
                  padding: "6px 10px",
                  borderRadius: 3,
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.2s",
                  flexShrink: 0,
                }}
              >
                <IconSend />
              </button>
            </div>
            <p
              style={{
                fontSize: 9,
                color: "rgba(0,255,65,0.2)",
                marginTop: 6,
                letterSpacing: "0.08em",
              }}
            >
              HYBRID RETRIEVER · BM25 + SEMANTIC · {status.model || "—"} ·
              CONTEXT-ONLY MODE
            </p>
          </div>
        </main>

        {sidebarOpen && (
          <aside
            style={{
              width: 280,
              flexShrink: 0,
              borderLeft: "1px solid rgba(0,255,65,0.1)",
              background: "rgba(10,10,10,0.7)",
              backdropFilter: "blur(4px)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "fadeSlideIn 0.2s ease forwards",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid rgba(0,255,65,0.1)",
                fontSize: 10,
                letterSpacing: "0.2em",
                color: "rgba(0,255,65,0.5)",
                fontWeight: 700,
              }}
            >
              ◈ CORPUS MANAGER
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              <UploadPanel onRefresh={fetchStatus} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
