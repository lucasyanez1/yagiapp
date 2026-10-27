// Capa de datos de ejercicios y entrenamientos.
import { guardar, obtener, listar, eliminar } from './db.js';
import { nuevoId, esFechaLocal, fechaLocalHoy } from './schema.js';

export const EJERCICIOS_BASICOS = ['Sentadilla', 'Press banca', 'Peso muerto', 'Press militar', 'Remo con barra', 'Dominadas'];

const igualNombre = (a, b) => a.trim().toLocaleLowerCase('es') === b.trim().toLocaleLowerCase('es');

function validarNombre(nombre) {
  const n = typeof nombre === 'string' ? nombre.trim() : '';
  if (!n) throw new Error('El nombre no puede estar vacío.');
  if (n.length > 60) throw new Error('El nombre es demasiado largo (máximo 60 caracteres).');
  return n;
}

export async function listarEjercicios({ incluirArchivados = false } = {}, db) {
  const todos = await listar('exercises', db);
  return todos.filter((e) => incluirArchivados || !e.archivado).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export async function crearEjercicio(nombre, db) {
  const n = validarNombre(nombre);
  const todos = await listar('exercises', db);
  if (todos.some((e) => !e.archivado && igualNombre(e.nombre, n))) throw new Error('Ya existe un ejercicio con ese nombre.');
  const archivado = todos.find((e) => e.archivado && igualNombre(e.nombre, n));
  const ej = archivado ? { ...archivado, archivado: false } : { id: nuevoId(), nombre: n, archivado: false, creado: Date.now() };
  await guardar('exercises', ej, db);
  return ej;
}

// Renombrar solo cambia el catálogo: los entrenamientos conservan el nombre con que se registraron.
export async function renombrarEjercicio(id, nombre, db) {
  const n = validarNombre(nombre);
  const ej = await obtener('exercises', id, db);
  if (!ej) throw new Error('El ejercicio no existe.');
  const todos = await listar('exercises', db);
  if (todos.some((e) => e.id !== id && !e.archivado && igualNombre(e.nombre, n))) throw new Error('Ya existe un ejercicio con ese nombre.');
  await guardar('exercises', { ...ej, nombre: n }, db);
}

// Si el ejercicio tiene historial se archiva (no se pierde nada); si no, se elimina.
export async function eliminarOArchivarEjercicio(id, db) {
  const ej = await obtener('exercises', id, db);
  if (!ej) throw new Error('El ejercicio no existe.');
  const usado = (await listar('workouts', db)).some((w) => w.ejercicios.some((e) => e.ejercicioId === id));
  if (usado) { await guardar('exercises', { ...ej, archivado: true }, db); return 'archivado'; }
  await eliminar('exercises', id, db);
  return 'eliminado';
}

export async function cargarEjerciciosBasicos(db) {
  for (const n of EJERCICIOS_BASICOS) {
    try { await crearEjercicio(n, db); } catch { /* ya existía */ }
  }
}

export async function listarEntrenamientos(db) {
  return (await listar('workouts', db)).sort((a, b) => b.date.localeCompare(a.date) || (b.creado ?? 0) - (a.creado ?? 0));
}

export async function crearEntrenamiento(date = fechaLocalHoy(), db) {
  const w = { id: nuevoId(), date, nombre: '', notas: '', ejercicios: [], creado: Date.now(), actualizado: Date.now() };
  await guardarEntrenamiento(w, db);
  return w;
}

export async function guardarEntrenamiento(w, db) {
  if (!esFechaLocal(w.date)) throw new Error('La fecha del entrenamiento no es válida.');
  await guardar('workouts', { ...w, actualizado: Date.now() }, db);
}

export const obtenerEntrenamiento = (id, db) => obtener('workouts', id, db);
export const eliminarEntrenamiento = (id, db) => eliminar('workouts', id, db);
