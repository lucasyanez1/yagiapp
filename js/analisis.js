// Servicio del análisis semanal: carga datos, ejecuta y guarda el último resultado en settings.
import { listar, obtener, guardar } from './db.js';
import { fechaLocalHoy } from './schema.js';
import { analizarSemana, domingoPrevio, correspondeAnalisisAutomatico } from './domain/analisis.js';

export async function ejecutarAnalisis(hasta = fechaLocalHoy(), db) {
  const [pesos, workouts, meals] = [await listar('weights', db), await listar('workouts', db), await listar('meals', db)];
  const resultado = analizarSemana({ pesos, workouts, meals, hoy: hasta });
  const registro = { hasta, ejecutadoEn: new Date().toISOString(), resultado };
  await guardar('settings', { key: 'ultimoAnalisis', value: registro }, db);
  return registro;
}

export async function ultimoAnalisis(db) {
  return (await obtener('settings', 'ultimoAnalisis', db))?.value ?? null;
}

// Se llama al abrir la app. iOS no permite tareas en segundo plano, así que el análisis dominical
// se ejecuta la primera vez que se abre la app después de un domingo no cubierto.
export async function ejecutarAutomaticoSiCorresponde(hoy = fechaLocalHoy(), db) {
  const previo = await ultimoAnalisis(db);
  if (!correspondeAnalisisAutomatico(hoy, previo?.hasta)) return null;
  const [p, w, m] = [await listar('weights', db), await listar('workouts', db), await listar('meals', db)];
  if (!p.length && !w.length && !m.length) return null; // nada que analizar: no guardar un resultado vacío
  return ejecutarAnalisis(domingoPrevio(hoy), db);
}
