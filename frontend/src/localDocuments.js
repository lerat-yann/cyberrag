const DB_NAME = "cyberrag-local-documents";
const DB_VERSION = 1;
const STORE_NAME = "documents";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by_name", "name", { unique: false });
        store.createIndex("by_saved_at", "savedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB unavailable"));
  });
}

function runTransaction(mode, handler) {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);

        let result;
        try {
          result = handler(store);
        } catch (error) {
          db.close();
          reject(error);
          return;
        }

        transaction.oncomplete = () => {
          db.close();
          resolve(result);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error || new Error("IndexedDB transaction failed"));
        };
        transaction.onabort = () => {
          db.close();
          reject(transaction.error || new Error("IndexedDB transaction aborted"));
        };
      }),
  );
}

function fileToRecord(file) {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: file.name,
    size: file.size,
    type: file.type || "application/pdf",
    savedAt: new Date().toISOString(),
    file,
  };
}

export async function listLocalDocuments() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const documents = (request.result || [])
        .map(({ id, name, size, type, savedAt }) => ({
          id,
          name,
          size,
          type,
          savedAt,
        }))
        .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      resolve(documents);
    };
    request.onerror = () => reject(request.error || new Error("Unable to list local documents"));

    transaction.oncomplete = () => db.close();
    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error("Unable to list local documents"));
    };
  });
}

export async function saveLocalDocuments(files) {
  const pdfFiles = files.filter(
    (file) =>
      file &&
      typeof file.name === "string" &&
      file.name.toLowerCase().endsWith(".pdf"),
  );

  const records = pdfFiles.map(fileToRecord);
  await runTransaction("readwrite", (store) => {
    records.forEach((record) => store.put(record));
    return records.length;
  });
  return records.length;
}

export async function deleteLocalDocument(id) {
  await runTransaction("readwrite", (store) => store.delete(id));
}
