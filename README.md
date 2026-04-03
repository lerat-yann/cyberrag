# CyberRAG

**Les équipes cybersécurité perdent un temps considérable à chercher la bonne procédure dans des documents PDF éparpillés.** Quelle est la politique de contrôle d'accès ? Comment réagir à une fuite de données ? L'information existe, mais elle est enfouie dans des dizaines de pages.

**CyberRAG est un assistant documentaire qui répond instantanément à partir du corpus officiel.** Il indexe les PDF cybersécurité côté serveur, retrouve les passages pertinents via une recherche hybride (sémantique + BM25), et génère une réponse sourcée avec citations. Aucune hallucination : si l'information n'est pas dans le corpus, il le dit.

> **[Tester la démo live](https://cyberrag.vercel.app/)**

## Stack technique

| Composant | Technologies |
|:---|:---|
| **Backend** | FastAPI, LangChain, ChromaDB, HuggingFace Embeddings (`all-MiniLM-L6-v2`), Gemini 2.5 Flash |
| **Frontend** | React 18, Vite, Tailwind CSS |
| **Retrieval** | Recherche hybride : sémantique (cosine) + BM25 via EnsembleRetriever |
| **Déploiement** | Backend sur VPS OVH (Debian, Nginx, systemd) · Frontend sur Vercel |

## Fonctionnalités

- **Réponses sourcées** : chaque affirmation cite sa source entre crochets ([1], [2]...) avec le PDF et la page d'origine.
- **Contexte conversationnel court** : gère les relances comme "Et pour les visiteurs ?" ou "Peux-tu résumer en 3 points ?" en les reformulant automatiquement.
- **Tri des questions** : distingue les informations absentes du corpus, les questions hors sujet et les demandes offensives.
- **Gestion des erreurs Gemini** : quota dépassé, timeout, erreurs transitoires — le frontend affiche un message clair, jamais une stack trace.

## Architecture

```
backend/
├── main.py              # API FastAPI (endpoints /health, /status, /query)
├── docs_cybersec/       # Corpus PDF officiel (guides CNIL, ANSSI, CERT-FR)
├── requirements.txt
└── .env                 # GOOGLE_API_KEY (non versionné)

frontend/src/
├── App.jsx              # Interface React (chat, historique, sources)
├── main.jsx
└── index.css
```

## Installation rapide

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env     # Ajouter GOOGLE_API_KEY
# Placer les PDF dans docs_cybersec/
uvicorn main:app --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend
npm install
echo "VITE_API_URL=http://127.0.0.1:8000" > .env.local
npm run dev
```

## Endpoints

| Route | Méthode | Description |
|:------|:--------|:------------|
| `/health` | GET | Healthcheck |
| `/status` | GET | État du pipeline (prêt, indexation, docs, chunks) |
| `/query` | POST | Question + historique → réponse sourcée |

## Checklist qualité

- [x] **Zéro bug au démarrage** : le backend indexe et démarre proprement, le frontend se connecte automatiquement.
- [x] **Gestion des erreurs** : quota Gemini, timeout, corpus absent — messages explicites côté utilisateur.
- [x] **Secret management** : clé API via `os.getenv()` et `.env`, jamais versionnée.
- [x] **UI/UX** : interface terminal/SOC, suggestions cliquables, sources dépliables, indicateur de statut en temps réel.
- [ ] **Assets** : captures d'écran et GIF de démo (à venir).

## Limites connues

- Gemini 2.5 Flash en free tier : 20 requêtes/jour. En cas de dépassement, message explicite côté frontend.
- Le contexte conversationnel est volontairement géré par reformulation déterministe (regex) plutôt que par un second appel LLM. Raison : Gemini Flash en free tier produisait des reformulations tronquées et inutilisables (ex : "Quels sont les" au lieu d'une question complète). L'approche déterministe est instantanée, gratuite en quota, et couvre les cas de relance courants.
