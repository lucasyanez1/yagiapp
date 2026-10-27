// Formato para español de Chile. Las fechas de registro son 'AAAA-MM-DD' locales.
const LOCALE = 'es-CL';

function aFecha(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatearFecha(s, opciones = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Intl.DateTimeFormat(LOCALE, opciones).format(aFecha(s));
}

export function formatearNumero(n, decimales = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'; // dato ausente, nunca 0
  return new Intl.NumberFormat(LOCALE, { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(n);
}

export const formatearKg = (n, dec = 1) => (n == null ? '—' : `${formatearNumero(n, dec)} kg`);
export const formatearKcal = (n) => (n == null ? '—' : `${formatearNumero(n)} kcal`);
export const formatearGramos = (n, dec = 0) => (n == null ? '—' : `${formatearNumero(n, dec)} g`);

// Acepta "80,5" y "80.5"; devuelve null si no es un número válido.
export function parsearNumero(texto) {
  if (typeof texto !== 'string') return null;
  const t = texto.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}
