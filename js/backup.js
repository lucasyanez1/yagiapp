// Respaldos: exportación JSON/CSV, validación estricta, restauración atómica y borrado.
import { STORES, SCHEMA_VERSION, esFechaLocal } from './schema.js';
import { abrirDB } from './db.js';

export const APP_ID = 'fitness-personal';
export const MAX_BYTES = 20 * 1024 * 1024;
// Claves de settings que no forman parte del respaldo.
const CLAVES_EXCLUIDAS = new Set(['ultimoRespaldo', 'ultimoAnalisis']);

// Migraciones de datos de respaldos antiguos: MIGRACIONES_DATOS[v] lleva datos de v-1 a v.
export const MIGRACIONES_DATOS = {};

function esperar(t) {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error('Transacción cancelada.'));
  });
}

function pedir(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function exportarDatos(db) {
  const d = db ?? (await abrirDB());
  const nombres = Object.keys(STORES);
  const t = d.transaction(nombres, 'readonly');
  const datos = {};
  for (const n of nombres) datos[n] = await pedir(t.objectStore(n).getAll());
  datos.settings = datos.settings.filter((s) => !CLAVES_EXCLUIDAS.has(s.key));
  return { app: APP_ID, schemaVersion: SCHEMA_VERSION, exportadoEn: new Date().toISOString(), datos };
}

export const exportarJSON = async (db) => JSON.stringify(await exportarDatos(db), null, 2);

function celdaCSV(v) {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  // Evita que una hoja de cálculo interprete texto como fórmula.
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function aCSV(registros) {
  const cols = [...new Set(registros.flatMap((r) => Object.keys(r)))].sort();
  const filas = registros.map((r) => cols.map((c) => celdaCSV(r[c])).join(','));
  return '﻿' + [cols.map(celdaCSV).join(','), ...filas].join('\r\n') + '\r\n';
}

export async function exportarCSV(store, db) {
  if (!Object.hasOwn(STORES, store)) throw new Error(`Almacén desconocido: ${store}`);
  const { datos } = await exportarDatos(db);
  return aCSV(datos[store]);
}

// Forma mínima de cada registro: si falta algo, la app dejaría de funcionar tras restaurar.
const esNum = (v) => typeof v === 'number' && Number.isFinite(v);
const numONull = (v) => v === null || v === undefined || esNum(v);
const esTexto = (v) => typeof v === 'string' && v.length > 0;
const esObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const FORMAS = {
  settings: (r) => (CLAVES_EXCLUIDAS.has(r.key) ? `la clave "${r.key}" no se importa` : null),
  exercises: (r) => (esTexto(r.nombre) ? null : 'falta el nombre'),
  weights: (r) => (esNum(r.kg) ? null : 'peso inválido'),
  foods: (r) => (esTexto(r.nombre) && esNum(r.kcal100) && numONull(r.prot100) ? null : 'alimento inválido'),
  meals: (r) => (Array.isArray(r.items) && r.items.every((i) => esObj(i) && esTexto(i.nombre) && numONull(i.kcal) && numONull(i.proteina) && numONull(i.gramos))
    ? null : 'ítems de comida inválidos'),
  workouts: (r) => (Array.isArray(r.ejercicios) && r.ejercicios.every((e) => esObj(e) && esTexto(e.ejercicioId) && esTexto(e.nombre)
    && Array.isArray(e.series) && e.series.every((s) => esObj(s) && numONull(s.kg) && numONull(s.reps)))
    ? null : 'ejercicios inválidos'),
};

// Valida un objeto ya parseado. No modifica nada. Devuelve {ok, errores, respaldo}.
export function validarRespaldo(obj) {
  const errores = [];
  const falla = (m) => { errores.push(m); return { ok: false, errores }; };
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return falla('El archivo no es un respaldo válido.');
  if (obj.app !== APP_ID) return falla('El archivo no pertenece a esta aplicación.');
  if (!Number.isInteger(obj.schemaVersion) || obj.schemaVersion < 1) return falla('Versión de respaldo inválida.');
  if (obj.schemaVersion > SCHEMA_VERSION) return falla('El respaldo es de una versión más nueva de la aplicación.');
  if (obj.datos === null || typeof obj.datos !== 'object' || Array.isArray(obj.datos)) return falla('Faltan los datos del respaldo.');

  let datos = obj.datos;
  for (const nombre of Object.keys(datos)) {
    if (!Object.hasOwn(STORES, nombre)) errores.push(`Sección desconocida: ${nombre}`);
  }
  for (const [nombre, def] of Object.entries(STORES)) {
    const regs = datos[nombre] ?? [];
    if (!Array.isArray(regs)) { errores.push(`${nombre}: debe ser una lista.`); continue; }
    const vistos = new Set();
    regs.forEach((r, i) => {
      if (r === null || typeof r !== 'object' || Array.isArray(r)) return errores.push(`${nombre}[${i}]: registro inválido.`);
      const clave = r[def.keyPath];
      if (typeof clave !== 'string' || !clave) return errores.push(`${nombre}[${i}]: falta ${def.keyPath}.`);
      if (vistos.has(clave)) errores.push(`${nombre}[${i}]: clave repetida.`);
      vistos.add(clave);
      if (def.indexes?.some(([, p]) => p === 'date') && !esFechaLocal(r.date)) errores.push(`${nombre}[${i}]: fecha inválida.`);
      const forma = FORMAS[nombre]?.(r);
      if (forma) errores.push(`${nombre}[${i}]: ${forma}.`);
    });
  }
  if (errores.length) return { ok: false, errores: errores.slice(0, 20) };

  for (let v = obj.schemaVersion + 1; v <= SCHEMA_VERSION; v++) datos = MIGRACIONES_DATOS[v](datos);
  const completo = {};
  for (const n of Object.keys(STORES)) completo[n] = datos[n] ?? [];
  return { ok: true, errores: [], respaldo: { ...obj, schemaVersion: SCHEMA_VERSION, datos: completo } };
}

export function parsearRespaldo(texto) {
  if (typeof texto !== 'string' || texto.length > MAX_BYTES) {
    return { ok: false, errores: ['El archivo está vacío o es demasiado grande.'] };
  }
  let obj;
  try { obj = JSON.parse(texto); } catch { return { ok: false, errores: ['El archivo no es JSON válido.'] }; }
  return validarRespaldo(obj);
}

export const resumir = (respaldo) =>
  Object.fromEntries(Object.entries(respaldo.datos).map(([k, v]) => [k, v.length]));

// Reemplaza todos los datos en UNA transacción: si algo falla, no cambia nada.
export async function restaurar(respaldo, db) {
  const v = validarRespaldo(respaldo);
  if (!v.ok) throw new Error(v.errores[0]);
  const d = db ?? (await abrirDB());
  const nombres = Object.keys(STORES);
  const t = d.transaction(nombres, 'readwrite');
  const fin = esperar(t);
  for (const n of nombres) {
    const s = t.objectStore(n);
    s.clear();
    for (const r of v.respaldo.datos[n]) s.put(r);
  }
  await fin;
}

export async function borrarTodo(db) {
  const d = db ?? (await abrirDB());
  const t = d.transaction(Object.keys(STORES), 'readwrite');
  const fin = esperar(t);
  for (const n of Object.keys(STORES)) t.objectStore(n).clear();
  await fin;
}

// Entrega un archivo: hoja de compartir si existe (iOS), si no, descarga directa.
export async function entregarArchivo(nombre, texto, mime) {
  const archivo = new File([texto], nombre, { type: mime });
  if (navigator.canShare?.({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: nombre }); return 'compartido'; }
    catch (e) { if (e.name === 'AbortError') return 'cancelado'; }
  }
  const url = URL.createObjectURL(archivo);
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'descargado';
}
