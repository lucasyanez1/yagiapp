// Lógica pura de fuerza. Sin DOM ni base de datos.
// Serie = { kg, reps }. Una serie cuenta solo si kg >= 0 y reps > 0 son números válidos.
import { formatearNumero } from '../format.js';

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const suma = (xs) => xs.reduce((a, b) => a + b, 0);

export const serieValida = (s) => num(s?.reps) && s.reps > 0 && num(s?.kg) && s.kg >= 0;

// Volumen = kg × repeticiones. Sin carga (peso corporal, kg = 0) no se calcula: null, no 0.
export const volumenSerie = (s) => (serieValida(s) && s.kg > 0 ? s.kg * s.reps : null);

export function volumenSeries(series) {
  const v = (series ?? []).map(volumenSerie).filter((x) => x !== null);
  return v.length ? suma(v) : null;
}

// Un entrenamiento cuenta como sesión solo si tiene al menos una serie válida (los vacíos no cuentan).
export const tieneSeriesValidas = (w) => (w?.ejercicios ?? []).some((e) => (e.series ?? []).some(serieValida));

export function volumenEntrenamiento(w) {
  const v = (w?.ejercicios ?? []).map((e) => volumenSeries(e.series)).filter((x) => x !== null);
  return v.length ? suma(v) : null;
}

// 1RM estimado (Epley). Solo fiable hasta 12 repeticiones; fuera de ese rango no se estima.
export function e1rm(s) {
  if (!serieValida(s) || s.kg <= 0 || s.reps > 12) return null;
  return s.reps === 1 ? s.kg : s.kg * (1 + s.reps / 30);
}

const maxDe = (xs) => { const v = xs.filter((x) => x !== null); return v.length ? Math.max(...v) : null; };

// Una entrada por entrenamiento que contiene el ejercicio, ordenada por fecha.
export function historialEjercicio(workouts, ejercicioId) {
  const h = [];
  for (const w of workouts) {
    // Si el ejercicio aparece más de una vez en el mismo entrenamiento, se unen sus series.
    const bloques = (w.ejercicios ?? []).filter((x) => x.ejercicioId === ejercicioId);
    const validas = bloques.flatMap((b) => b.series ?? []).filter(serieValida);
    if (!validas.length) continue;
    h.push({
      date: w.date, workoutId: w.id, series: validas,
      mejorKg: Math.max(...validas.map((s) => s.kg)),
      e1rm: maxDe(validas.map(e1rm)),
      volumen: volumenSeries(validas),
    });
  }
  return h.sort((a, b) => a.date.localeCompare(b.date) || a.workoutId.localeCompare(b.workoutId));
}

const TIPOS_RECORD = [['mejorKg', 'carga máxima'], ['e1rm', '1RM estimado'], ['volumen', 'volumen de la sesión']];

export function records(historial) {
  const r = {};
  for (const [campo] of TIPOS_RECORD) {
    let mejor = null;
    for (const s of historial) {
      if (s[campo] !== null && (mejor === null || s[campo] > mejor.valor)) mejor = { valor: s[campo], date: s.date };
    }
    r[campo] = mejor;
  }
  return r;
}

// Récords que `sesion` supera respecto de TODAS las demás sesiones. La primera sesión es línea base: no hay récord.
export function nuevosRecords(otrasSesiones, sesion) {
  if (!otrasSesiones.length || !sesion) return [];
  const previos = records(otrasSesiones);
  return TIPOS_RECORD
    .filter(([campo]) => sesion[campo] !== null && previos[campo] && sesion[campo] > previos[campo].valor)
    .map(([campo, nombre]) => nombre);
}

const kgTxt = (n) => `${formatearNumero(n, Number.isInteger(n) ? 0 : 1)} kg`;

// Progresión doble con reglas locales. `sesiones` = historialEjercicio(...) en orden cronológico.
// Siempre devuelve una explicación; nunca modifica datos (el usuario decide si aplicarla).
export function sugerirProgresion(sesiones, { repsMin = 8, repsMax = 12, incremento = 2.5 } = {}) {
  if (sesiones.length < 2) {
    return { tipo: 'insuficiente', explicacion: 'Se necesitan al menos 2 sesiones registradas de este ejercicio para sugerir una progresión.' };
  }
  const tope = (s) => {
    const kg = Math.max(...s.series.map((x) => x.kg));
    const enTope = s.series.filter((x) => x.kg === kg);
    return { kg, n: enTope.length, minReps: Math.min(...enTope.map((x) => x.reps)) };
  };
  const ult = tope(sesiones.at(-1));
  const pen = tope(sesiones.at(-2));
  const base = `En tu última sesión hiciste ${ult.n} serie${ult.n > 1 ? 's' : ''} con ${kgTxt(ult.kg)}; la menor tuvo ${ult.minReps} repeticiones.`;

  if (ult.minReps >= repsMax) {
    return { tipo: 'subir_carga', kg: ult.kg + incremento, reps: repsMin,
      explicacion: `${base} Regla: al llegar a ${repsMax} repeticiones en todas las series, sube ${kgTxt(incremento)} y vuelve a ${repsMin}.` };
  }
  if (ult.minReps >= repsMin) {
    return { tipo: 'subir_reps', kg: ult.kg, reps: ult.minReps + 1,
      explicacion: `${base} Regla: mantén la carga e intenta ${ult.minReps + 1} repeticiones antes de subir de peso (rango ${repsMin}–${repsMax}).` };
  }
  if (pen.kg === ult.kg && pen.minReps < repsMin) {
    const kg = Math.round(ult.kg * 0.95 * 2) / 2;
    return { tipo: 'bajar_carga', kg, reps: repsMin,
      explicacion: `${base} Quedaste bajo ${repsMin} repeticiones dos sesiones seguidas con esa carga. Regla: baja un 5 % (${kgTxt(kg)}) y reconstruye el rango. Puede deberse también a cansancio o poco descanso.` };
  }
  return { tipo: 'mantener', kg: ult.kg, reps: repsMin,
    explicacion: `${base} Quedó bajo ${repsMin} repeticiones. Regla: repite la misma carga una sesión más antes de cambiar nada.` };
}
