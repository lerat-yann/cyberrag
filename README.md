# CyberRAG

CyberRAG est une démo RAG orientée cybersécurité basée uniquement sur le corpus officiel backend stocké dans `backend/docs_cybersec`.

## Principe

- le backend FastAPI lit et indexe exclusivement le corpus officiel versionné dans le projet
- aucun document utilisateur ne peut être ajouté depuis l'interface
- aucun upload utilisateur n'existe côté serveur
- aucune persistance locale de documents utilisateur n'est conservée dans le frontend
- le modèle répond uniquement à partir du corpus officiel

## Comportement du modèle

Le système distingue explicitement trois cas :

- information cybersécurité absente des documents : l'assistant indique qu'elle n'est pas trouvée dans la documentation disponible
- question hors sujet : l'assistant indique qu'il est limité au périmètre cybersécurité et au corpus officiel
- demande offensive ou dangereuse : l'assistant refuse l'aide opérationnelle offensive et ne propose qu'une aide défensive, de prévention, de détection ou de protection

Quand une réponse est trouvée dans le corpus, elle reste concise et cite ses sources.

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

Le frontend sert uniquement l'interface de question/réponse sur le corpus officiel.
