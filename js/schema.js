// Esquema de datos versionado. Cada migración sube la versión en 1.
// Las fechas de registro son cadenas locales 'AAAA-MM-DD' (nunca UTC).

export const SCHEMA_VERSION = 1;
export const DB_NAME = 'fitness';

// Almacenes y su clave. Los registros llevan id (string) generado localmente.
export const STORES = {
  settings: { keyPath: 'key' },
  exercises: { keyPath: 'id' },
  workouts: { keyPath: 'id', indexes: [['date', 'date']] },
  foods: { keyPath: 'id' },
  meals: { keyPath: 'id', indexes: [['date', 'date']] },
  weights: { keyPath: 'id', indexes: [['date', 'date']] },
};

// Migraciones de IndexedDB: from -> to. Reciben la transacción de upgrade.
export const MIGRATIONS = {
  1(db) {
    for (const [name, def] of Object.entries(STORES)) {
      const store = db.createObjectStore(name, { keyPath: def.keyPath });
      for (const [idx, path] of def.indexes ?? []) store.createIndex(idx, path);
    }
  },
};

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function esFechaLocal(s) {
  if (typeof s !== 'string' || !FECHA.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function fechaLocalHoy(ahora = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}`;
}

export function nuevoId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
