# CyberRAG

Assistant RAG orienté cybersécurité permettant de poser des questions sur un corpus de PDF, d’indexer des documents et d’exposer le tout via une API FastAPI et une interface React/Vite. Les routes backend incluent notamment `/health`, `/status`, `/query`, `/upload` et `/documents`. fileciteturn3file3turn3file10

🚀 **Démo live** : [Voir le site](https://cyberrag.vercel.app/)

## Le problème

La documentation cybersécurité est souvent dispersée dans plusieurs PDF et difficile à interroger rapidement. Retrouver une procédure, un extrait ou une information précise prend du temps.

## La solution

CyberRAG centralise un corpus documentaire PDF, l’indexe avec une approche hybride et permet ensuite de poser des questions à une interface web reliée à une API FastAPI. Le backend combine ChromaDB, BM25, LangChain et Gemini pour restituer une réponse courte accompagnée de sources documentaires. fileciteturn3file10turn3file12

## Déploiement

- **Frontend** : déployé sur Vercel via une application React + Vite. `package.json` expose les scripts `dev`, `build` et `preview`, et `vercel.json` configure le build Vite et la réécriture SPA. fileciteturn3file6turn3file15
- **Backend** : déployé sur un VPS Debian avec FastAPI derrière Nginx et HTTPS.

## Stack technique

### Backend

- FastAPI
- Uvicorn
- LangChain
- ChromaDB
- sentence-transformers
- Gemini via `langchain-google-genai`
- PyPDF

### Frontend

- React
- Vite
- Tailwind CSS

Les dépendances backend et frontend sont définies dans `backend/requirements.txt` et `frontend/package.json`. fileciteturn3file6turn3file2

## Structure du dépôt

```text
cyberrag/
├── backend/
│   ├── docs_cybersec/
│   ├── .env.example
│   ├── .gitignore
│   ├── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vercel.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

Cette structure reprend les éléments réellement suivis dans le dépôt, sans `assets/`, et sans les fichiers de déploiement devenus inutiles (`backend/Procfile`, `backend/railway.json`, `frontend/netlify.toml`). Le README précédent mentionnait encore Railway et Netlify. fileciteturn3file0turn3file1turn3file11turn3file9

## Fonctionnalités principales

- Health check de l’API
- Statut du pipeline RAG
- Upload de PDF
- Liste des documents indexés
- Suppression d’un document
- Question/réponse sur le corpus avec sources

Ces fonctionnalités sont exposées dans `main.py`. fileciteturn3file3

## API

| Méthode | Route                   | Description                     |
| ------- | ----------------------- | ------------------------------- |
| GET     | `/health`               | Vérifie que l’API répond        |
| GET     | `/status`               | Retourne l’état du pipeline     |
| POST    | `/query`                | Pose une question au moteur RAG |
| POST    | `/upload`               | Upload de PDF                   |
| GET     | `/documents`            | Liste les documents indexés     |
| DELETE  | `/documents/{filename}` | Supprime un document            |
| GET     | `/docs`                 | Documentation Swagger           |

Routes extraites du backend FastAPI. fileciteturn3file3

## Lancer le projet en local

### 1) Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Ajouter ensuite dans `.env` :

```env
GOOGLE_API_KEY=your_api_key
```

Puis lancer l’API :

```bash
uvicorn main:app --reload --port 8000
```

Le backend lit les PDF depuis `backend/docs_cybersec/`. fileciteturn3file10

### 2) Frontend

```bash
cd frontend
npm install
```

Créer un fichier `.env.local` avec :

```env
VITE_API_URL=http://127.0.0.1:8000
```

Puis lancer le frontend :

```bash
npm run dev
```

Scripts frontend confirmés par `package.json`. fileciteturn3file6

## Tests rapides en local

- Frontend : `http://localhost:5173`
- Backend : `http://127.0.0.1:8000`
- Health check : `http://127.0.0.1:8000/health`
- Documentation API : `http://127.0.0.1:8000/docs`

## Variables d’environnement

### Backend

- `GOOGLE_API_KEY`

### Frontend

- `VITE_API_URL`

Ne jamais versionner les vrais secrets. Le backend charge la variable `GOOGLE_API_KEY` via `.env` et s’arrête si elle est absente. fileciteturn3file10

## Notes

- Le backend accepte actuellement `allow_origins=["*"]`, ce qui est pratique pour une démo portfolio mais devrait être restreint en production plus stricte. fileciteturn3file8
- Le projet a été simplifié pour refléter le déploiement réellement utilisé : Vercel pour le frontend, VPS pour le backend.

## Auteur

Projet réalisé par Yann comme démonstration technique d’un système RAG orienté cybersécurité, utilisable localement et déployé en ligne.
