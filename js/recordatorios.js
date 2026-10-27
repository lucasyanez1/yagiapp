import { obtener, guardar } from './db.js';
import { normalizarRecordatorios } from './domain/recordatorios.js';

export async function cargarRecordatorios(db) {
  return normalizarRecordatorios((await obtener('settings', 'recordatorios', db))?.value);
}

export async function guardarRecordatorios(cfg, db) {
  const value = normalizarRecordatorios(cfg);
  await guardar('settings', { key: 'recordatorios', value }, db);
  return value;
}
