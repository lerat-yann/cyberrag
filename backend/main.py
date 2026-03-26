"""RAG Cybersecurite backend."""

import logging
import os
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

SYSTEM_PROMPT = """Tu es un assistant expert en cybersécurité de l'organisation.

RÈGLES STRICTES :
1. Réponds UNIQUEMENT à partir des documents fournis dans le contexte.
2. Ne complète JAMAIS avec tes connaissances générales.
3. Si l'information n'est pas dans le contexte, réponds :
   \"Je ne trouve pas cette information dans la documentation de sécurité disponible.
    Contactez le RSSI ou le SOC pour plus de détails.\"
4. Cite la source de chaque information entre crochets [1], [2], etc.
5. Sois concis, précis et utilise le vocabulaire cybersécurité approprié."""


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
llm = None
rag_prompt = None


def get_embedding_model():
    global embedding_model
    if embedding_model is None:
        embedding_model = HuggingFaceEmbeddings(model_name=EMBED_MODEL)
    return embedding_model


def get_llm():
    global llm
    if llm is None:
        llm = ChatGoogleGenerativeAI(
            model=MODEL_NAME,
            temperature=0.2,
            top_p=0.9,
            max_output_tokens=600,
        )
    return llm


def get_rag_prompt():
    global rag_prompt
    if rag_prompt is None:
        rag_prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            ("human", "Contexte :\n---\n{context}\n---\n\nQuestion : {question}\n\nRéponse :"),
        ])
    return rag_prompt


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


class QueryRequest(BaseModel):
    question: str
    top_k: int = TOP_K


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
    retrieved_docs = state.hybrid_retriever.invoke(req.question)[: req.top_k]
    if not retrieved_docs:
        raise HTTPException(status_code=404, detail="Aucun document exploitable dans le corpus officiel.")

    context = "\n\n".join(f"[{i+1}] {doc.page_content}" for i, doc in enumerate(retrieved_docs))
    prompt_value = get_rag_prompt().invoke({"context": context, "question": req.question})
    response_text = get_llm().invoke(prompt_value).content
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
