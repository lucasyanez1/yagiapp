// Cálculos de peso corporal. Lógica pura; fechas locales 'AAAA-MM-DD'.
import { fechaLocalHoy } from '../schema.js';
import { formatearNumero } from '../format.js';

export const PESO_MIN = 20;
export const PESO_MAX = 500;

export const aFecha = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export function sumarDias(s, n) { const d = aFecha(s); d.setDate(d.getDate() + n); return fechaLocalHoy(d); }
export const lunesDe = (s) => sumarDias(s, -((aFecha(s).getDay() + 6) % 7));

export function validarKg(kg) {
  if (typeof kg !== 'number' || !Number.isFinite(kg)) return { ok: false, error: 'Escribe un peso válido (por ejemplo 80,5).' };
  if (kg < PESO_MIN || kg > PESO_MAX) return { ok: false, error: `El peso debe estar entre ${PESO_MIN} y ${PESO_MAX} kg.` };
  return { ok: true };
}

const media = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const validos = (pesos) => pesos.filter((p) => validarKg(p.kg).ok);

// Un valor por día (promedio si hay varias mediciones), ordenado por fecha.
export function promediosDiarios(pesos) {
  const porDia = new Map();
  for (const p of validos(pesos)) porDia.set(p.date, [...(porDia.get(p.date) ?? []), p.kg]);
  return [...porDia].map(([date, v]) => ({ date, kg: media(v), n: v.length })).sort((a, b) => a.date.localeCompare(b.date));
}

// Semanas lunes–domingo. `dias` = cantidad de días con dato (no de mediciones).
export function promediosSemanales(pesos) {
  const porSemana = new Map();
  for (const d of promediosDiarios(pesos)) {
    const s = lunesDe(d.date);
    porSemana.set(s, [...(porSemana.get(s) ?? []), d.kg]);
  }
  return [...porSemana].map(([semana, v]) => ({ semana, promedio: media(v), dias: v.length })).sort((a, b) => a.semana.localeCompare(b.semana));
}

export function promedioVentana(pesos, desde, hasta) {
  const d = promediosDiarios(pesos).filter((x) => x.date >= desde && x.date <= hasta);
  return { promedio: d.length ? media(d.map((x) => x.kg)) : null, dias: d.length };
}

// Compara los últimos 7 días con los 7 anteriores. Con pocos datos no concluye nada.
export function tendenciaPeso(pesos, hoy, { minDias = 3, umbral = 0.2 } = {}) {
  const act = promedioVentana(pesos, sumarDias(hoy, -6), hoy);
  const ant = promedioVentana(pesos, sumarDias(hoy, -13), sumarDias(hoy, -7));
  if (act.dias < minDias || ant.dias < minDias) {
    return { tipo: 'insuficiente', delta: null, actual: act, anterior: ant,
      explicacion: `Para comparar semanas se necesitan al menos ${minDias} días con peso en cada una (últimos 7 días: ${act.dias}; 7 días previos: ${ant.dias}).` };
  }
  const delta = act.promedio - ant.promedio;
  const tipo = Math.abs(delta) < umbral ? 'estable' : delta > 0 ? 'sube' : 'baja';
  const f = (n) => formatearNumero(n, 1);
  return { tipo, delta, actual: act, anterior: ant,
    explicacion: `Promedio de los últimos 7 días: ${f(act.promedio)} kg (${act.dias} días); de los 7 previos: ${f(ant.promedio)} kg (${ant.dias} días). Diferencia: ${delta > 0 ? '+' : ''}${f(delta)} kg. El peso varía por agua y comidas; una semana sola no es una conclusión.` };
}
