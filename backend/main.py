"""RAG Cybersecurite backend."""

import logging
import os
import re
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_chroma import Chroma
from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader
from langchain_community.retrievers import BM25Retriever
from langchain_classic.retrievers import EnsembleRetriever
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    logger.error("GOOGLE_API_KEY manquante dans .env")
    sys.exit(1)

BASE_PDF_FOLDER = Path("./docs_cybersec")
MODEL_NAME = "gemini-2.5-flash"
EMBED_MODEL = "all-MiniLM-L6-v2"
CHUNK_SIZE = 800
CHUNK_OVERLAP = 100
RETRIEVER_K = 6
TOP_K = 3

SYSTEM_PROMPT = """Tu es un assistant de démonstration spécialisé en cybersécurité.

RÈGLES STRICTES :
1. Réponds UNIQUEMENT à partir des documents fournis dans le contexte.
2. Ne complète JAMAIS avec des connaissances générales, même si la réponse te semble connue.
3. Si la question concerne bien la cybersécurité mais que l'information n'apparaît pas dans les documents, réponds :
   \"Je ne trouve pas cette information dans la documentation cybersécurité disponible.\"
4. Si la question est hors sujet par rapport à la cybersécurité ou au corpus officiel, réponds :
   \"Je suis limité au périmètre cybersécurité et aux documents officiels disponibles.\"
5. Si la demande est offensive, dangereuse ou vise une attaque, une intrusion, une exploitation ou un contournement, refuse poliment toute aide opérationnelle et propose uniquement une aide défensive, de prévention, de détection ou de protection.
6. Quand une réponse est effectivement trouvée dans le corpus, sois concis, précis et cite la source de chaque information entre crochets [1], [2], etc.
7. Si tu refuses ou si l'information n'est pas trouvée, n'invente rien et ne cites aucune source inexistante."""

STANDALONE_QUESTION_PROMPT = """Tu reformules une question utilisateur en question autonome.

RÈGLES :
1. Utilise uniquement l'historique récent pour lever les ambiguïtés de la question actuelle.
2. Si la question actuelle est déjà autonome, retourne-la quasiment inchangée.
3. N'ajoute aucune information qui n'apparaît pas dans l'historique.
4. Réponds uniquement par la question reformulée, sans commentaire.
"""


class PipelineState:
    def __init__(self):
        self.vectorstore = None
        self.hybrid_retriever = None
        self.documents: List = []
        self.pdf_count: int = 0
        self.ready: bool = False
        self.indexing: bool = False


state = PipelineState()
embedding_model = None
rewriter_llm = None
answer_llm = None
rag_prompt = None


def get_embedding_model():
    global embedding_model
    if embedding_model is None:
        embedding_model = HuggingFaceEmbeddings(model_name=EMBED_MODEL)
    return embedding_model


def get_rewriter_llm():
    global rewriter_llm
    if rewriter_llm is None:
        rewriter_llm = ChatGoogleGenerativeAI(
            model=MODEL_NAME,
            temperature=0,
            max_tokens=96,
            retries=0,
            request_timeout=10,
        )
    return rewriter_llm


def get_answer_llm():
    global answer_llm
    if answer_llm is None:
        answer_llm = ChatGoogleGenerativeAI(
            model=MODEL_NAME,
            temperature=0.2,
            top_p=0.9,
            max_tokens=600,
            retries=0,
            request_timeout=12,
        )
    return answer_llm


def get_rag_prompt():
    global rag_prompt
    if rag_prompt is None:
        rag_prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            ("human", "Contexte :\n---\n{context}\n---\n\nQuestion : {question}\n\nRéponse :"),
        ])
    return rag_prompt


def classify_llm_error(exc: Exception) -> tuple[int, str]:
    message = str(exc)
    message_lower = message.lower()
    status_code = getattr(exc, "status_code", None)

    if (
        status_code == 429
        or "429" in message_lower
        or "resource_exhausted" in message_lower
        or "quota" in message_lower
        or "rate limit" in message_lower
        or "rate_limit" in message_lower
    ):
        return 429, "Quota Gemini atteint pour le moment. Réessaie plus tard."

    return 502, "Erreur temporaire côté modèle. Réessaie plus tard."


def reset_pipeline():
    if state.vectorstore is not None:
        try:
            state.vectorstore.delete_collection()
        except Exception:
            logger.warning("Suppression de collection Chroma échouée.", exc_info=True)
    state.vectorstore = None
    state.hybrid_retriever = None
    state.documents = []
    state.pdf_count = 0
    state.ready = False


def build_pipeline(pdf_folder: Path, collection_name: str):
    pdf_folder.mkdir(parents=True, exist_ok=True)
    pdfs = sorted(pdf_folder.glob("**/*.pdf"))

    if not pdfs:
        logger.warning("Aucun PDF trouvé dans %s - pipeline en attente.", pdf_folder)
        reset_pipeline()
        return

    logger.info("Indexation de %s PDF(s) du corpus officiel dans %s...", len(pdfs), pdf_folder)
    loader = DirectoryLoader(str(pdf_folder), glob="**/*.pdf", loader_cls=PyPDFLoader)
    raw_docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\nR", "\n", " ", ""],
        keep_separator=True,
    )
    documents = splitter.split_documents(raw_docs)
    for i, doc in enumerate(documents):
        doc.metadata["chunk_id"] = i

    if state.vectorstore is not None:
        try:
            state.vectorstore.delete_collection()
        except Exception:
            logger.warning("Ancienne collection Chroma non supprimée proprement.", exc_info=True)

    vectorstore = Chroma.from_documents(
        documents=documents,
        embedding=get_embedding_model(),
        collection_name=collection_name,
        collection_metadata={"hnsw:space": "cosine"},
    )

    semantic_retriever = vectorstore.as_retriever(search_kwargs={"k": RETRIEVER_K})
    bm25_retriever = BM25Retriever.from_documents(documents, k=RETRIEVER_K)
    hybrid_retriever = EnsembleRetriever(
        retrievers=[semantic_retriever, bm25_retriever],
        weights=[0.5, 0.5],
    )

    state.vectorstore = vectorstore
    state.hybrid_retriever = hybrid_retriever
    state.documents = documents
    state.pdf_count = len(pdfs)
    state.ready = True
    logger.info("Pipeline prêt - %s PDF(s), %s chunks.", len(pdfs), len(documents))


def rebuild_base_pipeline():
    state.indexing = True
    try:
        build_pipeline(BASE_PDF_FOLDER, "rag_cybersecurite_base")
    finally:
        state.indexing = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    BASE_PDF_FOLDER.mkdir(parents=True, exist_ok=True)
    rebuild_base_pipeline()
    yield


app = FastAPI(title="RAG Cybersécurité API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class HistoryMessage(BaseModel):
    role: str
    content: str


class QueryRequest(BaseModel):
    question: str
    top_k: int = TOP_K
    history: Optional[List[HistoryMessage]] = None


class SourceChunk(BaseModel):
    content: str
    source: str
    page: Optional[int] = None
    chunk_id: Optional[int] = None


class QueryResponse(BaseModel):
    question: str
    response: str
    sources: List[SourceChunk]
    model: str
    duration_ms: int


class StatusResponse(BaseModel):
    ready: bool
    indexing: bool
    pdf_count: int
    chunk_count: int
    model: str
    corpus_scope: str


def format_history(history: Optional[List[HistoryMessage]]) -> str:
    if not history:
        return ""

    lines = []
    for item in history:
        role = "Utilisateur" if item.role == "user" else "Assistant"
        content = item.content.strip()
        if content:
            lines.append(f"{role}: {content}")
    return "\n".join(lines)


def should_rewrite_question(question: str, history: Optional[List[HistoryMessage]]) -> bool:
    if not history:
        return False

    normalized = " ".join(question.lower().strip().split())
    if not normalized:
        return False

    ambiguous_patterns = [
        r"^(et|mais|alors|donc)\b",
        r"^(et|qu'en est-il)\s+(pour|côté)\b",
        r"^(peux-tu|peut-tu|tu peux)\s+(préciser|développer)\b",
        r"^précise\b",
        r"^et\s+que\b",
        r"^et\s+quoi\b",
        r"^et\s+à\s+quelle\b",
        r"^(pour|côté)\s+(eux|elles|les visiteurs|les admins|les administrateurs)\b",
        r"\bfaut-il\s+les\s+(revoir|éviter)\b",
    ]

    if any(re.search(pattern, normalized) for pattern in ambiguous_patterns):
        return True

    short_pronoun_follow_up = (" eux", " elles", " ils", " cela", " ça", " ce point", " ce sujet")
    return len(normalized) <= 40 and any(term in f" {normalized}" for term in short_pronoun_follow_up)


def build_standalone_question(question: str, history: Optional[List[HistoryMessage]]) -> str:
    if not should_rewrite_question(question, history):
        return question

    formatted_history = format_history(history)
    if not formatted_history:
        return question

    prompt = (
        f"{STANDALONE_QUESTION_PROMPT}\n"
        f"Historique récent :\n{formatted_history}\n\n"
        f"Question actuelle : {question}\n\n"
        "Question autonome :"
    )

    try:
        response = get_rewriter_llm().invoke(prompt)
        reformulated = getattr(response, "content", "")
        if isinstance(reformulated, str) and reformulated.strip():
            return reformulated.strip()
    except Exception:
        logger.warning("Reformulation conversationnelle impossible, fallback immédiat sur la question originale.", exc_info=True)

    return question


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/status", response_model=StatusResponse)
def get_status():
    return StatusResponse(
        ready=state.ready,
        indexing=state.indexing,
        pdf_count=state.pdf_count,
        chunk_count=len(state.documents),
        model=MODEL_NAME,
        corpus_scope="official_server_corpus",
    )


@app.post("/query", response_model=QueryResponse)
def query(req: QueryRequest):
    if not state.ready:
        raise HTTPException(
            status_code=503,
            detail="Corpus officiel non prêt. Ajoutez des PDFs dans backend/docs_cybersec puis redéployez.",
        )

    start = time.time()
    standalone_question = build_standalone_question(req.question, req.history)
    retrieved_docs = state.hybrid_retriever.invoke(standalone_question)[: req.top_k]
    if not retrieved_docs:
        raise HTTPException(status_code=404, detail="Aucun document exploitable dans le corpus officiel.")

    context = "\n\n".join(f"[{i+1}] {doc.page_content}" for i, doc in enumerate(retrieved_docs))
    prompt_value = get_rag_prompt().invoke({"context": context, "question": standalone_question})
    try:
        response_text = get_answer_llm().invoke(prompt_value).content
    except Exception as exc:
        status_code, detail = classify_llm_error(exc)
        logger.exception("Erreur lors de l'appel Gemini.")
        raise HTTPException(status_code=status_code, detail=detail) from exc
    duration_ms = int((time.time() - start) * 1000)

    sources = [
        SourceChunk(
            content=doc.page_content,
            source=Path(doc.metadata.get("source", "Inconnu")).name,
            page=doc.metadata.get("page"),
            chunk_id=doc.metadata.get("chunk_id"),
        )
        for doc in retrieved_docs
    ]
    return QueryResponse(
        question=req.question,
        response=response_text,
        sources=sources,
        model=MODEL_NAME,
        duration_ms=duration_ms,
    )
