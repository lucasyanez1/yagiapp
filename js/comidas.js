// Capa de datos de comidas y alimentos personalizados.
import { guardar, listar, eliminar } from './db.js';
import { nuevoId, esFechaLocal } from './schema.js';
import { CATALOGO } from './data/alimentos.js';
import { normalizar } from './domain/nutricion.js';

export const MOMENTOS = ['desayuno', 'almuerzo', 'once', 'cena', 'colación'];

const numOpcional = (v, nombre, { positivo = false } = {}) => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || (positivo && v === 0)) throw new Error(`${nombre} no es válido.`);
  return v;
};

// Catálogo = alimentos personalizados + base. Un personalizado reemplaza a uno base con el mismo id.
export async function cargarCatalogo(db) {
  const propios = await listar('foods', db);
  return [...propios, ...CATALOGO.filter((f) => !propios.some((p) => p.id === f.id))];
}

export async function crearAlimento({ nombre, kcal100, prot100, gramosUnidad }, db) {
  const n = String(nombre ?? '').trim();
  if (!n) throw new Error('El nombre no puede estar vacío.');
  if (n.length > 60) throw new Error('El nombre es demasiado largo (máximo 60 caracteres).');
  const k = numOpcional(kcal100, 'Las calorías');
  if (k === null) throw new Error('Indica las calorías por 100 g.');
  const f = {
    id: nuevoId(), nombre: n, alias: [n], kcal100: k, prot100: numOpcional(prot100, 'Las proteínas'),
    porciones: {}, personalizado: true, creado: Date.now(),
  };
  const u = numOpcional(gramosUnidad, 'El peso por unidad', { positivo: true });
  if (u !== null) f.porciones.unidad = u;
  const clave = normalizar(n);
  if ((await listar('foods', db)).some((x) => normalizar(x.nombre) === clave)) throw new Error('Ya existe un alimento tuyo con ese nombre.');
  await guardar('foods', f, db);
  return f;
}

export const listarAlimentosPropios = (db) => listar('foods', db);
export const eliminarAlimento = (id, db) => eliminar('foods', id, db);

// Los ítems se guardan con los valores finales (ya corregidos por el usuario); null = desconocido.
export async function guardarComida({ date, momento, texto, items }, db) {
  if (!esFechaLocal(date)) throw new Error('La fecha no es válida.');
  if (!items?.length) throw new Error('Agrega al menos un alimento.');
  const limpios = items.map((i) => ({
    nombre: String(i.nombre ?? '').trim() || 'Sin nombre',
    gramos: numOpcional(i.gramos, 'Los gramos'),
    kcal: numOpcional(i.kcal, 'Las calorías'),
    proteina: numOpcional(i.proteina, 'Las proteínas'),
    origen: ['catalogo', 'personalizado', 'manual'].includes(i.origen) ? i.origen : 'manual',
    foodId: i.foodId ?? null,
  }));
  const m = { id: nuevoId(), date, momento: MOMENTOS.includes(momento) ? momento : null, texto: String(texto ?? ''), items: limpios, creado: Date.now() };
  await guardar('meals', m, db);
  return m;
}

export async function comidasDelDia(date, db) {
  return (await listar('meals', db)).filter((m) => m.date === date).sort((a, b) => a.creado - b.creado);
}

export const eliminarComida = (id, db) => eliminar('meals', id, db);
