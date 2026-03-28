import { useCallback, useEffect, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const SUGGESTIONS = [
  "Quelle est la politique de gestion des incidents ?",
  "Quels sont les contrôles d'accès recommandés ?",
  "Comment gérer une fuite de données ?",
  "Quelles sont les exigences de chiffrement ?",
];

const apiFetch = (url, options = {}) =>
  fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

function StatusBadge({ status }) {
  const color = status.indexing ? "#f59e0b" : status.ready ? "#00ff41" : "#ef4444";
  const label = status.indexing ? "INDEXING" : status.ready ? "ONLINE" : "OFFLINE";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 10px ${color}`,
        }}
      />
      <span style={{ color, letterSpacing: "0.12em" }}>{label}</span>
      <span style={{ color: "rgba(0,255,65,0.45)", fontSize: 10 }}>
        {status.pdf_count} docs / {status.chunk_count} chunks
      </span>
    </div>
  );
}

function Message({ message }) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      style={{
        alignSelf: isAssistant ? "stretch" : "flex-end",
        maxWidth: isAssistant ? "100%" : "80%",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          color: isAssistant ? "rgba(0,255,65,0.45)" : "rgba(0,180,255,0.5)",
          marginBottom: 4,
        }}
      >
        {isAssistant ? "SYSTEM" : "OPERATOR"}
      </div>
      <div
        style={{
          background: isAssistant ? "rgba(0,255,65,0.05)" : "rgba(0,180,255,0.08)",
          border: `1px solid ${isAssistant ? "rgba(0,255,65,0.14)" : "rgba(0,180,255,0.18)"}`,
          borderRadius: 10,
          padding: 14,
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          color: isAssistant ? "rgba(0,255,65,0.9)" : "rgba(180,230,255,0.92)",
        }}
      >
        {message.content}
      </div>
      {isAssistant && message.sources?.length > 0 && (
        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
          {message.sources.map((source, index) => (
            <div
              key={`${source.source}-${index}`}
              style={{
                background: "rgba(0,255,65,0.03)",
                border: "1px solid rgba(0,255,65,0.1)",
                borderRadius: 8,
                padding: 10,
              }}
            >
              <div style={{ fontSize: 10, color: "rgba(0,255,65,0.55)", marginBottom: 4 }}>
                [{index + 1}] {source.source}
                {source.page != null ? ` · page ${source.page + 1}` : ""}
              </div>
              <div style={{ fontSize: 11, color: "rgba(0,255,65,0.42)" }}>{source.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const bottomRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await apiFetch(`${API_URL}/status`);
      const data = await response.json();
      setStatus(data);
    } catch {
      setStatus((current) => ({ ...current, ready: false }));
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const intervalId = setInterval(fetchStatus, 4000);
    return () => clearInterval(intervalId);
  }, [fetchStatus]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (question = input) => {
    const value = question.trim();
    if (!value || loading || !status.ready) return;

    setInput("");
    setMessages((current) => [...current, { role: "user", content: value }]);
    setLoading(true);

    try {
      const response = await apiFetch(`${API_URL}/query`, {
        method: "POST",
        body: JSON.stringify({ question: value, top_k: 3 }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessages((current) => [
          ...current,
          { role: "assistant", content: data.detail || "Erreur backend.", error: true },
        ]);
      } else {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: data.response,
            sources: data.sources,
          },
        ]);
      }
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "Connexion au backend impossible.", error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#08110a",
        color: "#00ff41",
        fontFamily: "'Share Tech Mono', 'Courier New', monospace",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap"
        rel="stylesheet"
      />
      <main style={{ maxWidth: 1080, margin: "0 auto", padding: 24, display: "flex", flexDirection: "column" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, letterSpacing: "0.18em" }}>CYBERRAG</h1>
            <div style={{ marginTop: 6, fontSize: 11, color: "rgba(0,255,65,0.4)" }}>
              Démo RAG centrée sur le corpus officiel backend
            </div>
          </div>
          <StatusBadge status={status} />
        </header>

        <section
          style={{
            background: "rgba(0,255,65,0.04)",
            border: "1px solid rgba(0,255,65,0.1)",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            lineHeight: 1.7,
            color: "rgba(0,255,65,0.62)",
          }}
        >
          Le backend répond uniquement à partir du corpus officiel versionné dans <strong>backend/docs_cybersec</strong>.
          Cette démo ne permet aucun ajout de document utilisateur.
        </section>

        <section style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => sendMessage(suggestion)}
              disabled={!status.ready || loading}
              style={{
                background: "rgba(0,255,65,0.04)",
                border: "1px solid rgba(0,255,65,0.14)",
                color: "rgba(0,255,65,0.72)",
                borderRadius: 999,
                padding: "8px 12px",
                cursor: status.ready && !loading ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              {suggestion}
            </button>
          ))}
        </section>

        <section
          style={{
            marginBottom: 16,
            background: "rgba(0,255,65,0.04)",
            border: "1px solid rgba(0,255,65,0.1)",
            borderRadius: 12,
            padding: 14,
            color: "rgba(0,255,65,0.65)",
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          Corpus officiel : {status.pdf_count} document(s) indexé(s) côté serveur.
        </section>

        <section
          style={{
            flex: 1,
            minHeight: 320,
            background: "rgba(0,0,0,0.22)",
            border: "1px solid rgba(0,255,65,0.08)",
            borderRadius: 12,
            padding: 16,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {messages.length === 0 && (
            <div style={{ color: "rgba(0,255,65,0.34)", lineHeight: 1.8 }}>
              {status.ready
                ? `Corpus officiel prêt avec ${status.pdf_count} document(s) serveur.`
                : "Corpus officiel indisponible. Ajoutez des PDF dans backend/docs_cybersec puis redéployez."}
            </div>
          )}
          {messages.map((message, index) => (
            <Message key={`${message.role}-${index}`} message={message} />
          ))}
          {loading && <div style={{ color: "rgba(0,255,65,0.45)" }}>Analyse du corpus officiel...</div>}
          <div ref={bottomRef} />
        </section>

        <section style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: "rgba(0,255,65,0.4)", marginBottom: 8 }}>
            Pose une question sur le corpus officiel cybersécurité.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={status.ready ? "Posez une question sur le corpus officiel..." : "Corpus officiel indisponible..."}
              disabled={!status.ready || loading}
              rows={3}
              style={{
                flex: 1,
                background: "rgba(0,255,65,0.03)",
                border: "1px solid rgba(0,255,65,0.14)",
                borderRadius: 10,
                color: "#00ff41",
                padding: 12,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!status.ready || loading || !input.trim()}
              style={{
                alignSelf: "stretch",
                background: "rgba(0,255,65,0.12)",
                border: "1px solid rgba(0,255,65,0.24)",
                color: "#00ff41",
                borderRadius: 10,
                padding: "0 18px",
                cursor: status.ready && !loading && input.trim() ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              Envoyer
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
