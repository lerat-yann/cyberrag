import { useCallback, useEffect, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const SUGGESTIONS = [
  "Quelle est la politique de gestion des incidents ?",
  "Quels sont les contrôles d'accès recommandés ?",
  "Comment gérer une fuite de données ?",
  "Quelles sont les exigences de chiffrement ?",
];

const HISTORY_LIMIT = 6;

const DEMO_TIPS = [
  "Pose des questions précises sur les procédures, contrôles ou politiques décrits dans le corpus.",
  "Le modèle répond uniquement depuis les documents officiels indexés côté backend.",
  "Les demandes hors sujet ou offensives sont refusées proprement.",
];

const apiFetch = (url, options = {}) =>
  fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

const getErrorMessage = async (response) => {
  try {
    const rawText = await response.text();
    if (!rawText?.trim()) {
      return null;
    }

    try {
      const data = JSON.parse(rawText);
      if (typeof data?.detail === "string" && data.detail.trim()) {
        return data.detail;
      }
      if (typeof data?.message === "string" && data.message.trim()) {
        return data.message;
      }
    } catch {
      return rawText.trim();
    }

    return null;
  } catch {
    return null;
  }
};

const buildHistory = (messages) =>
  messages
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim(),
    )
    .slice(-HISTORY_LIMIT)
    .map(({ role, content }) => ({ role, content }));

function StatusBadge({ status }) {
  const color = status.indexing ? "#f59e0b" : status.ready ? "#00ff41" : "#ef4444";
  const label = status.indexing ? "INDEXING" : status.ready ? "ONLINE" : "OFFLINE";

  return (
    <div className="status-badge">
      <span className="status-dot" style={{ background: color, boxShadow: `0 0 18px ${color}` }} />
      <span className="status-label" style={{ color }}>{label}</span>
      <span className="status-meta">{status.pdf_count} docs / {status.chunk_count} chunks</span>
    </div>
  );
}

function Message({ message }) {
  const isAssistant = message.role === "assistant";

  return (
    <article className={`message ${isAssistant ? "message-assistant" : "message-user"}`}>
      <div className="message-role">{isAssistant ? "SYSTEM" : "OPERATOR"}</div>
      <div className="message-bubble">{message.content}</div>
      {isAssistant && message.sources?.length > 0 && (
        <div className="source-list">
          {message.sources.map((source, index) => (
            <div key={`${source.source}-${index}`} className="source-card">
              <div className="source-title">
                [{index + 1}] {source.source}
                {source.page != null ? ` · page ${source.page + 1}` : ""}
              </div>
              <div className="source-content">{source.content}</div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function EmptyState({ status }) {
  return (
    <div className="empty-state">
      <div className="empty-chip">OFFICIAL CORPUS · CYBER RAG</div>
      <h2 className="empty-title">Assistant documentaire cybersécurité orienté SOC</h2>
      <p className="empty-copy">
        {status.ready
          ? `Le corpus officiel est prêt avec ${status.pdf_count} document(s) et ${status.chunk_count} chunks indexés.`
          : "Le corpus officiel n'est pas encore disponible. Ajoutez vos PDF dans backend/docs_cybersec puis redéployez le backend."}
      </p>
      <div className="empty-grid">
        <div className="empty-card">
          <div className="empty-card-title">Capacités</div>
          <p>Réponses factuelles à partir du corpus officiel, avec extraits de sources et citations visibles.</p>
        </div>
        <div className="empty-card">
          <div className="empty-card-title">Limites</div>
          <p>Pas de connaissances ajoutées hors corpus, pas de réponse hors sujet, pas d'aide offensive.</p>
        </div>
        <div className="empty-card">
          <div className="empty-card-title">Conseil</div>
          <p>Privilégie des questions ciblées sur des politiques, mesures défensives, incidents ou procédures.</p>
        </div>
      </div>
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const sendMessage = async (question = input) => {
    const value = question.trim();
    if (!value || loading || !status.ready) return;

    const history = buildHistory(messages);
    setInput("");
    setMessages((current) => [...current, { role: "user", content: value }]);
    setLoading(true);

    try {
      const response = await apiFetch(`${API_URL}/query`, {
        method: "POST",
        body: JSON.stringify({ question: value, top_k: 3, history }),
      });

      if (!response.ok) {
        const errorMessage = await getErrorMessage(response);
        setMessages((current) => [
          ...current,
          { role: "assistant", content: errorMessage || "Erreur backend.", error: true },
        ]);
      } else {
        const data = await response.json();
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
    <div className="app-shell">
      <link
        href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap"
        rel="stylesheet"
      />

      <div className="app-grid">
        <main className="chat-panel">
          <header className="topbar-card">
            <div className="brand-block">
              <div className="hero-kicker">OFFICIAL CORPUS MODE</div>
              <h1 className="hero-title">CYBERRAG</h1>
              <p className="hero-subtitle">
                Démo RAG cyber / terminal centrée uniquement sur le corpus officiel backend.
              </p>
            </div>
            <StatusBadge status={status} />
          </header>

          <section className="conversation-card">
            <div className="conversation-scroll">
              {messages.length === 0 ? (
                <EmptyState status={status} />
              ) : (
                messages.map((message, index) => (
                  <Message key={`${message.role}-${index}`} message={message} />
                ))
              )}
              {loading && <div className="loading-line">Analyse du corpus officiel...</div>}
              <div ref={bottomRef} />
            </div>
          </section>

          <section className="suggestions-row">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => sendMessage(suggestion)}
                disabled={!status.ready || loading}
                className="suggestion-pill"
              >
                {suggestion}
              </button>
            ))}
          </section>

          <section className="composer-card">
            <div className="composer-label">Pose une question sur le corpus officiel cybersécurité.</div>
            <div className="composer-row">
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
                rows={2}
                className="composer-input"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!status.ready || loading || !input.trim()}
                className="composer-button"
              >
                Envoyer
              </button>
            </div>
          </section>
        </main>

        <aside className="info-panel">
          <section className="info-card info-card-compact">
            <div className="info-title">PÉRIMÈTRE</div>
            <p>Corpus officiel uniquement : <strong>backend/docs_cybersec</strong>.</p>
          </section>

          <section className="info-card info-grid-card">
            <div>
              <div className="info-metric-label">Documents</div>
              <div className="info-metric-value">{status.pdf_count}</div>
            </div>
            <div>
              <div className="info-metric-label">Chunks</div>
              <div className="info-metric-value">{status.chunk_count}</div>
            </div>
            <div>
              <div className="info-metric-label">Modèle</div>
              <div className="info-metric-text">{status.model || "—"}</div>
            </div>
            <div>
              <div className="info-metric-label">Mode</div>
              <div className="info-metric-text">Context only</div>
            </div>
          </section>

          <section className="info-card info-card-compact">
            <div className="info-title">RÈGLES ASSISTANT</div>
            <ul className="info-list">
              <li>Réponses uniquement depuis le corpus officiel.</li>
              <li>Information absente : l'assistant le dit clairement.</li>
              <li>Hors sujet : refus poli.</li>
              <li>Demandes offensives : refus et redirection défensive.</li>
            </ul>
          </section>

          <section className="info-card info-card-compact info-card-fill">
            <div className="info-title">CONSEILS</div>
            <ul className="info-list">
              {DEMO_TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
