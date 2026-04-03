# CyberRAG

> Démo RAG cybersécurité simple, centrée sur un corpus officiel versionné côté backend.

## Le problème

Dans beaucoup de projets RAG, la démonstration devient vite confuse :
- mélange entre documents système et documents utilisateur,
- logique d’upload qui alourdit l’application,
- réponses difficiles à cadrer,
- comportements d’erreur peu lisibles quand le modèle ou le quota échoue.

## La solution

**CyberRAG** est une démo volontairement resserrée :

- **corpus officiel uniquement** côté backend ;
- **aucun upload utilisateur** ;
- **aucune persistance locale de documents** dans le frontend ;
- réponses ancrées dans les documents disponibles ;
- gestion explicite des cas :
  - information absente du corpus,
  - question hors sujet,
  - demande offensive ou dangereuse ;
- **contexte conversationnel court** pour mieux gérer certaines relances ;
- **gestion plus propre des erreurs Gemini**, notamment quand le quota est atteint.

## Ce que fait le projet

- interroger un corpus PDF cybersécurité stocké dans `backend/docs_cybersec`
- retrouver les passages les plus pertinents
- générer une réponse concise avec sources
- conserver un **court contexte conversationnel** pour certaines questions de suivi
- renvoyer un message clair si Gemini est temporairement indisponible ou en quota dépassé

## Ce que le projet ne fait pas

- pas d’upload utilisateur
- pas de base documentaire personnelle
- pas d’IndexedDB ou de stockage local de fichiers
- pas de mémoire persistante
- pas d’assistant généraliste hors périmètre du corpus cybersécurité

---

## Points forts du projet

- **Démo claire** : périmètre réduit, comportement lisible
- **Architecture simple** : frontend React/Vite + backend FastAPI
- **RAG cadré** : réponses basées sur le corpus officiel backend
- **Contexte court contrôlé** : meilleure gestion de certaines relances sans mémoire longue
- **Fail-fast plus propre sur Gemini** : message utilisateur explicite si le quota est atteint

---

## Stack technique

### Frontend
- React
- Vite

### Backend
- FastAPI
- LangChain
- ChromaDB
- Sentence Transformers
- Gemini

---

## Architecture

```text
frontend (React + Vite)
        ↓
backend FastAPI
        ↓
retrieval sur le corpus officiel
        ↓
génération de réponse avec Gemini
```

Le backend lit exclusivement les PDF situés dans :

```text
backend/docs_cybersec
```

---

## API backend

| Méthode | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Vérifie que l’API répond |
| GET | `/status` | Retourne l’état du corpus officiel serveur |
| POST | `/query` | Interroge le corpus officiel |
| GET | `/docs` | Swagger / documentation interactive |

Le backend **n’expose aucun endpoint d’upload utilisateur**.

---

## Comportement du modèle

Le système distingue explicitement ces cas :

- **Réponse trouvée dans le corpus**  
  L’assistant répond de manière concise et cite ses sources.

- **Information absente du corpus**  
  L’assistant indique qu’elle n’est pas trouvée dans la documentation disponible.

- **Question hors sujet**  
  L’assistant indique qu’il est limité au périmètre cybersécurité et au corpus officiel.

- **Demande offensive ou dangereuse**  
  L’assistant refuse l’aide offensive opérationnelle et se limite à une aide défensive, de prévention, de détection ou de protection.

- **Quota Gemini atteint**  
  L’application renvoie un message clair du type :  
  `Quota Gemini atteint pour le moment. Réessaie plus tard.`

---

## Contexte conversationnel court

Le projet gère désormais un **contexte conversationnel court** pour mieux comprendre certaines relances du type :

- `Et pour les visiteurs ?`
- `Et à quelle fréquence faut-il les revoir ?`
- `Peux-tu résumer en 3 points ?`

Le but n’est **pas** d’ajouter une mémoire persistante, mais simplement d’améliorer la compréhension des suivis immédiats tout en gardant la réponse finale ancrée dans le corpus.

---

## Démo en ligne

Ajoute ici ton lien frontend Vercel réel :

```md
[Tester la démo](URL_FRONTEND_VERCEL)
```

> Ne pas réutiliser automatiquement un ancien domaine backend si celui-ci a changé.

---

## Installation rapide

### 1) Cloner le projet

```bash
git clone <URL_DU_REPO>
cd cyberrag
```

### 2) Lancer le backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3) Lancer le frontend

```bash
cd ../frontend
npm install
npm run dev
```

---

## Variables d’environnement

Exemple minimal côté backend :

```env
GOOGLE_API_KEY=your_api_key_here
```

Créer un fichier `.env` côté backend à partir d’un futur `.env.example`.

---

## Structure du dépôt

```text
cyberrag/
├── backend/
│   ├── docs_cybersec/
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   └── src/
├── assets/
│   └── (captures ou GIF de démonstration à ajouter)
└── README.md
```

---

## Pourquoi ce projet est utile dans un portfolio

CyberRAG montre plusieurs compétences utiles en contexte réel :

- cadrer un projet RAG pour éviter la complexité inutile ;
- construire une API FastAPI simple et exploitable ;
- relier frontend et backend proprement ;
- gérer les erreurs utilisateur et les erreurs modèle de façon explicite ;
- faire évoluer le comportement conversationnel sans basculer dans une “fausse mémoire” complexe.

---

## Limites actuelles

- dépendance au quota Gemini
- contexte conversationnel court uniquement
- corpus statique géré par le développeur
- pas encore de démonstration exhaustive de tous les cas conversationnels

---

## Améliorations possibles

- ajouter un vrai `.env.example`
- ajouter un dossier `assets/` avec capture ou GIF
- ajouter une section “déploiement” plus détaillée
- ajouter des tests automatisés backend
- améliorer encore la synthèse des relances conversationnelles les plus ambiguës

---

## Lancement en production

Le projet est pensé pour une architecture simple :

- **frontend** : Vercel
- **backend** : VPS Debian + Nginx + FastAPI

---

## Auteur

Projet réalisé par Yann dans une logique de démonstration portfolio autour du RAG cybersécurité.
