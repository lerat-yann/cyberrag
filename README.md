# CyberRAG — Guide de déploiement production

**Frontend** → Vercel ou Netlify  
**Backend** → Railway  

---

## Structure du repo

```
cyberrag/
├── backend/          ← FastAPI — déployé sur Railway
│   ├── main.py
│   ├── requirements.txt
│   ├── Procfile
│   ├── railway.json
│   └── .env.example
│
└── frontend/         ← React/Vite — déployé sur Vercel ou Netlify
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── vercel.json
    ├── netlify.toml
    └── .env.local.example
```

---

## 1. Préparer le repo Git

```bash
git init
git add .
git commit -m "feat: cyberrag initial"

# Créer un repo sur GitHub puis :
git remote add origin https://github.com/TON_USER/cyberrag.git
git push -u origin main
```

> ⚠️ Ne jamais committer `.env` ou `.env.local`. Les `.gitignore` sont déjà configurés.

---

## 2. Déployer le backend sur Railway

### 2.1 Créer le projet Railway

1. Aller sur [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → sélectionner votre repo
3. Railway détecte automatiquement le `Procfile` et `requirements.txt`
4. Dans **Settings → Root Directory** : mettre `backend`

### 2.2 Configurer les variables d'environnement

Dans Railway → votre service → **Variables** → ajouter :

| Clé | Valeur |
|-----|--------|
| `GOOGLE_API_KEY` | `votre_clé_google_gemini` |

Railway injecte automatiquement `$PORT` — le `Procfile` l'utilise déjà.

### 2.3 Récupérer l'URL du backend

Dans Railway → **Settings → Networking → Generate Domain**  
Vous obtenez une URL de la forme :  
```
https://cyberrag-backend-production.up.railway.app
```
**Copiez cette URL** — vous en aurez besoin pour le frontend.

### 2.4 Vérifier le déploiement

```bash
curl https://votre-url.railway.app/health
# → {"status":"ok"}

curl https://votre-url.railway.app/status
# → {"ready":false,"indexing":false,"pdf_count":0,...}
```

---

## 3. Déployer le frontend

### Option A — Vercel (recommandé)

1. Aller sur [vercel.com](https://vercel.com) → **Add New Project**
2. Importer le repo GitHub
3. Dans **Root Directory** : mettre `frontend`
4. Framework Preset : **Vite** (détecté automatiquement)
5. Dans **Environment Variables** → ajouter :

| Clé | Valeur |
|-----|--------|
| `VITE_API_URL` | `https://votre-url.railway.app` |

6. **Deploy** → Vercel build et déploie automatiquement

---

### Option B — Netlify

1. Aller sur [netlify.com](https://netlify.com) → **Add new site → Import from Git**
2. Sélectionner le repo GitHub
3. **Base directory** : `frontend`
4. **Build command** : `npm run build`  
5. **Publish directory** : `dist`
6. Dans **Site configuration → Environment variables** → ajouter :

| Clé | Valeur |
|-----|--------|
| `VITE_API_URL` | `https://votre-url.railway.app` |

7. **Deploy site**

---

## 4. Développement local

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # remplir GOOGLE_API_KEY
mkdir -p docs_cybersec        # mettre vos PDFs ici
uvicorn main:app --reload --port 8000

# Frontend (autre terminal)
cd frontend
npm install
cp .env.local.example .env.local   # VITE_API_URL=http://localhost:8000
npm run dev                         # → http://localhost:3000
```

---

## 5. Déploiements continus (CI/CD)

Une fois le repo connecté, chaque `git push origin main` déclenche automatiquement :
- Railway : re-build et re-déploiement du backend
- Vercel/Netlify : re-build et re-déploiement du frontend

---

## 6. Notes importantes pour la démo

### CORS
Le backend est configuré avec `allow_origins=["*"]` — suffisant pour un portfolio.  
En production réelle, remplacer par l'URL Vercel/Netlify exacte.

### Stockage PDFs sur Railway
Railway utilise un **filesystem éphémère** : les PDFs uploadés depuis l'UI sont perdus au redémarrage.  
Pour un portfolio démo c'est acceptable. Pour persister les données → ajouter un volume Railway ou un bucket S3.

### Cold start
- Railway tier gratuit : le service peut dormir après inactivité → premier appel ~30s
- Netlify/Vercel : pas de cold start (statique)

### Variables d'env côté frontend
`VITE_API_URL` est injectée **au moment du build**, pas au runtime.  
Si vous changez l'URL Railway, il faut rebuild le frontend.

---

## API Reference

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/status` | État pipeline (ready, chunks, model…) |
| `POST` | `/query` | `{question, top_k}` → réponse + sources |
| `POST` | `/upload` | Upload PDFs (multipart/form-data) |
| `GET` | `/documents` | Liste des PDFs indexés |
| `DELETE` | `/documents/{name}` | Supprime + réindexe |
| `GET` | `/docs` | Swagger UI interactif |
