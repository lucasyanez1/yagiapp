// Capa de datos de peso corporal.
import { guardar, obtener, listar, eliminar } from './db.js';
import { nuevoId, esFechaLocal } from './schema.js';
import { validarKg } from './domain/peso.js';

function validar(date, kg) {
  if (!esFechaLocal(date)) throw new Error('La fecha no es válida.');
  const v = validarKg(kg);
  if (!v.ok) throw new Error(v.error);
}

export async function crearPeso({ date, kg }, db) {
  validar(date, kg);
  const p = { id: nuevoId(), date, kg, creado: Date.now() };
  await guardar('weights', p, db);
  return p;
}

export async function editarPeso(id, { date, kg }, db) {
  validar(date, kg);
  const p = await obtener('weights', id, db);
  if (!p) throw new Error('El registro ya no existe.');
  await guardar('weights', { ...p, date, kg }, db);
}

export const eliminarPeso = (id, db) => eliminar('weights', id, db);

export async function listarPesos(db) {
  return (await listar('weights', db)).sort((a, b) => a.date.localeCompare(b.date) || (a.creado ?? 0) - (b.creado ?? 0));
}
