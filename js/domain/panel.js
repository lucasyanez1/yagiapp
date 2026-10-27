// Resumen del panel principal. Lógica pura: recibe los datos ya cargados.
// Regla: lo que no existe es null / "sin datos"; nunca se convierte en 0.
import { sumarDias, tendenciaPeso, promediosDiarios } from './peso.js';
import { volumenEntrenamiento, historialEjercicio, records, tieneSeriesValidas } from './entrenamiento.js';
import { totalizar } from './nutricion.js';

const enRango = (f, desde, hasta) => f >= desde && f <= hasta;

function ventanaEntrenos(workouts, desde, hasta) {
  const ws = workouts.filter((w) => enRango(w.date, desde, hasta) && tieneSeriesValidas(w));
  const vols = ws.map(volumenEntrenamiento).filter((v) => v !== null);
  return { n: ws.length, volumen: vols.length ? vols.reduce((a, b) => a + b, 0) : null };
}

export function recordsRecientes(workouts, hoy, dias = 30, max = 5) {
  const desde = sumarDias(hoy, -(dias - 1));
  const ids = new Map();
  for (const w of workouts) for (const e of w.ejercicios ?? []) ids.set(e.ejercicioId, e.nombre);
  const out = [];
  for (const [id, nombre] of ids) {
    const h = historialEjercicio(workouts, id);
    if (h.length < 2) continue; // con una sola sesión no hay récord, solo línea base
    const r = records(h);
    for (const [campo, tipo] of [['mejorKg', 'carga máxima'], ['e1rm', '1RM estimado']]) {
      if (r[campo] && r[campo].date >= desde && r[campo].date <= hoy && r[campo].date !== h[0].date) {
        out.push({ nombre, tipo, valor: r[campo].valor, date: r[campo].date });
      }
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, max);
}

export function calcularPanel({ pesos = [], workouts = [], meals = [], hoy }) {
  const dias = promediosDiarios(pesos);
  const ultimo = dias.length ? { date: dias.at(-1).date, kg: dias.at(-1).kg } : null;

  const actual = ventanaEntrenos(workouts, sumarDias(hoy, -6), hoy);
  const anterior = ventanaEntrenos(workouts, sumarDias(hoy, -13), sumarDias(hoy, -7));
  const comparable = actual.n > 0 && anterior.n > 0;

  const delDia = meals.filter((m) => m.date === hoy);
  const totHoy = totalizar(delDia.flatMap((m) => m.items));

  // Promedio por día CON registro (los días sin registro no cuentan como 0).
  const porDia = new Map();
  for (const m of meals.filter((x) => enRango(x.date, sumarDias(hoy, -6), hoy))) porDia.set(m.date, [...(porDia.get(m.date) ?? []), ...m.items]);
  const totales = [...porDia.values()].map(totalizar);
  const con = (campo) => { const v = totales.map((t) => t[campo]).filter((x) => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };

  return {
    peso: { ultimo, tendencia: tendenciaPeso(pesos, hoy) },
    entrenos: { actual, anterior, comparacion: comparable ? { sesiones: actual.n - anterior.n, volumen: actual.volumen !== null && anterior.volumen !== null ? actual.volumen - anterior.volumen : null } : null },
    comida: { hoy: { ...totHoy, comidas: delDia.length }, semana: { dias: porDia.size, kcal: con('kcal'), proteina: con('proteina'), parcial: totales.some((t) => t.parcial) } },
    records: recordsRecientes(workouts, hoy),
    hayDatos: Boolean(ultimo || workouts.length || meals.length),
  };
}
