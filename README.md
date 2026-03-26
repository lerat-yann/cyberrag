# CyberRAG

Assistant RAG orienté cybersécurité avec une séparation stricte entre :

- le corpus officiel serveur versionné dans `backend/docs_cybersec`
- les documents personnels utilisateur stockés uniquement dans le navigateur via IndexedDB

## Règles d'architecture

### Corpus officiel serveur

- alimenté uniquement par le développeur dans le dépôt local
- versionné via Git puis déployé
- lu et indexé uniquement par le backend FastAPI
- aucune route backend ne permet à un utilisateur navigateur d'ajouter, modifier ou supprimer des documents

### Documents personnels locaux

- ajoutés par l'utilisateur dans le frontend React
- stockés localement dans le navigateur via IndexedDB
- jamais envoyés au backend
- jamais stockés sur le serveur
- jamais copiés dans `backend/docs_cybersec`

## Stack

- Backend : FastAPI, LangChain, ChromaDB, Gemini
- Frontend : React + Vite

## API backend

| Méthode | Route     | Description |
| ------- | --------- | ----------- |
| GET     | `/health` | Vérifie que l'API répond |
| GET     | `/status` | Retourne l'état du corpus officiel serveur |
| POST    | `/query`  | Interroge le corpus officiel serveur |
| GET     | `/docs`   | Swagger |

Le backend n'expose aucun endpoint d'upload utilisateur.

## Lancement local

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Le backend lit exclusivement les PDF depuis `backend/docs_cybersec`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Le frontend conserve les documents personnels localement dans IndexedDB.
