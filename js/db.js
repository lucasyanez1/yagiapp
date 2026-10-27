import { DB_NAME, SCHEMA_VERSION, MIGRATIONS, STORES } from './schema.js';

let dbPromise = null;

export function abrirDB(nombre = DB_NAME) {
  if (nombre !== DB_NAME) return abrir(nombre);
  dbPromise ??= abrir(nombre);
  return dbPromise;
}

function abrir(nombre) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(nombre, SCHEMA_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = req.result;
      for (let v = ev.oldVersion + 1; v <= SCHEMA_VERSION; v++) MIGRATIONS[v](db);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Base de datos bloqueada por otra pestaña.'));
  });
}

function validarStore(store) {
  if (!Object.hasOwn(STORES, store)) throw new Error(`Almacén desconocido: ${store}`);
}

function pedir(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(store, modo, db) {
  validarStore(store);
  const d = db ?? (await abrirDB());
  return d.transaction(store, modo).objectStore(store);
}

export async function guardar(store, valor, db) {
  return pedir((await tx(store, 'readwrite', db)).put(valor));
}

export async function obtener(store, clave, db) {
  return pedir((await tx(store, 'readonly', db)).get(clave));
}

export async function listar(store, db) {
  return pedir((await tx(store, 'readonly', db)).getAll());
}

export async function eliminar(store, clave, db) {
  return pedir((await tx(store, 'readwrite', db)).delete(clave));
}

export async function vaciar(store, db) {
  return pedir((await tx(store, 'readwrite', db)).clear());
}

// Pide almacenamiento persistente; devuelve true/false/null (no soportado).
export async function pedirPersistencia() {
  try {
    return navigator.storage?.persist ? await navigator.storage.persist() : null;
  } catch {
    return null;
  }
}
