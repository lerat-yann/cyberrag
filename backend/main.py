"""
RAG Cybersécurité — Backend FastAPI — Portfolio Demo
"""
import os, sys, time, logging, shutil, uuid
from pathlib import Path
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader
from langchain_community.retrievers import BM25Retriever
from langchain_classic.retrievers import EnsembleRetriever
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    logger.error("GOOGLE_API_KEY manquante dans .env")
    sys.exit(1)

PDF_FOLDER    = "./docs_cybersec/"
MODEL_NAME    = "gemini-2.5-flash"
EMBED_MODEL   = "all-MiniLM-L6-v2"
CHUNK_SIZE    = 800
CHUNK_OVERLAP = 100
RETRIEVER_K   = 6
TOP_K         = 3

SYSTEM_PROMPT = """Tu es un assistant expert en cybersécurité de l'organisation.

RÈGLES STRICTES :
1. Réponds UNIQUEMENT à partir des documents fournis dans le contexte.
2. Ne complète JAMAIS avec tes connaissances générales.
3. Si l'information n'est pas dans le contexte, réponds :
   "Je ne trouve pas cette information dans la documentation de sécurité disponible.
    Contactez le RSSI ou le SOC pour plus de détails."
4. Cite la source de chaque information entre crochets [1], [2], etc.
5. Sois concis, précis et utilise le vocabulaire cybersécurité approprié."""

# ── Global state ────────────────────────────────────────────────
class RAGState:
    vectorstore = None
    hybrid_retriever = None
    llm = None
    rag_prompt = None
    documents: list = []
    pdf_count: int = 0
    ready: bool = False
    indexing: bool = False

state = RAGState()

def build_pipeline(pdf_folder: str = PDF_FOLDER):
    pdf_path = Path(pdf_folder)
    pdf_path.mkdir(parents=True, exist_ok=True)
    pdfs = list(pdf_path.glob("**/*.pdf"))

    if not pdfs:
        logger.warning("Aucun PDF — pipeline en attente.")
        state.ready = False
        state.pdf_count = 0
        return

    logger.info(f"Indexation de {len(pdfs)} PDF(s)…")
    loader = DirectoryLoader(pdf_folder, glob="**/*.pdf", loader_cls=PyPDFLoader)
    raw_docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\nR", "\n", " ", ""], keep_separator=True,
    )
    documents = splitter.split_documents(raw_docs)
    for i, doc in enumerate(documents):
        doc.metadata["chunk_id"] = i

    embedding_model = HuggingFaceEmbeddings(model_name=EMBED_MODEL)
    if state.vectorstore:
        state.vectorstore.delete_collection()

    vectorstore = Chroma.from_documents(
        documents=documents, embedding=embedding_model,
        collection_name="rag_cybersecurite",
        collection_metadata={"hnsw:space": "cosine"},
    )

    semantic_retriever = vectorstore.as_retriever(search_kwargs={"k": RETRIEVER_K})
    bm25_retriever = BM25Retriever.from_documents(documents, k=RETRIEVER_K)
    hybrid_retriever = EnsembleRetriever(
        retrievers=[semantic_retriever, bm25_retriever], weights=[0.5, 0.5],
    )

    llm = ChatGoogleGenerativeAI(model=MODEL_NAME, temperature=0.2, top_p=0.9, max_output_tokens=600)
    rag_prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", "Contexte :\n---\n{context}\n---\n\nQuestion : {question}\n\nRéponse :"),
    ])

    state.vectorstore      = vectorstore
    state.hybrid_retriever = hybrid_retriever
    state.llm              = llm
    state.rag_prompt       = rag_prompt
    state.documents        = documents
    state.pdf_count        = len(pdfs)
    state.ready            = True
    logger.info(f"Pipeline prêt — {len(pdfs)} PDF(s), {len(documents)} chunks.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    build_pipeline()
    yield

app = FastAPI(title="RAG Cybersécurité API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Schemas ─────────────────────────────────────────────────────
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

# ── Routes ───────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/status", response_model=StatusResponse)
def get_status():
    return StatusResponse(
        ready=state.ready, indexing=state.indexing,
        pdf_count=state.pdf_count, chunk_count=len(state.documents), model=MODEL_NAME,
    )

@app.post("/query", response_model=QueryResponse)
def query(req: QueryRequest):
    if not state.ready:
        raise HTTPException(status_code=503, detail="Pipeline non prêt. Indexez d'abord des PDFs.")
    start = time.time()
    retrieved_docs = state.hybrid_retriever.invoke(req.question)[:req.top_k]

    def format_docs(docs):
        return "\n\n".join(f"[{i+1}] {doc.page_content}" for i, doc in enumerate(docs))

    context      = format_docs(retrieved_docs)
    prompt_value = state.rag_prompt.invoke({"context": context, "question": req.question})
    response_text = state.llm.invoke(prompt_value).content
    duration_ms  = int((time.time() - start) * 1000)

    sources = [
        SourceChunk(
            content=doc.page_content,
            source=Path(doc.metadata.get("source", "Inconnu")).name,
            page=doc.metadata.get("page"),
            chunk_id=doc.metadata.get("chunk_id"),
        ) for doc in retrieved_docs
    ]
    return QueryResponse(question=req.question, response=response_text,
                         sources=sources, model=MODEL_NAME, duration_ms=duration_ms)

@app.post("/upload")
async def upload_pdfs(background_tasks: BackgroundTasks, files: List[UploadFile] = File(...)):
    pdf_path = Path(PDF_FOLDER)
    pdf_path.mkdir(parents=True, exist_ok=True)
    saved = []
    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"{file.filename} n'est pas un PDF.")
        dest = pdf_path / file.filename
        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)
        saved.append(file.filename)

    state.indexing = True
    def reindex():
        try: build_pipeline()
        finally: state.indexing = False
    background_tasks.add_task(reindex)
    return {"uploaded": saved, "message": "Réindexation en cours…"}

@app.get("/documents")
def list_documents():
    pdf_path = Path(PDF_FOLDER)
    pdfs = [{"name": p.name, "size_kb": round(p.stat().st_size / 1024, 1)} for p in pdf_path.glob("**/*.pdf")]
    return {"documents": pdfs, "count": len(pdfs)}

@app.delete("/documents/{filename}")
def delete_document(filename: str, background_tasks: BackgroundTasks):
    p = Path(PDF_FOLDER) / filename
    if not p.exists():
        raise HTTPException(status_code=404, detail="Fichier introuvable.")
    p.unlink()
    state.indexing = True
    def reindex():
        try: build_pipeline()
        finally: state.indexing = False
    background_tasks.add_task(reindex)
    return {"deleted": filename, "message": "Réindexation en cours…"}
