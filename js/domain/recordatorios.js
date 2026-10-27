// Recordatorios gratuitos y sin servidores. Lógica pura.
// Una PWA en iOS no puede programar notificaciones locales (las push exigen un servidor),
// por eso hay dos mecanismos: (1) un archivo .ics con alarmas que importa la app Calendario
// del iPhone y (2) avisos dentro de la app cuando se abre.
import { aFecha, sumarDias } from './peso.js';

export const TIPOS = {
  entrenar: { titulo: 'Entrenar', detalle: 'Hora de entrenar. Registra tus series en la app Fitness.', hora: '19:00', dias: [1, 3, 5] },
  peso: { titulo: 'Registrar peso', detalle: 'Pésate y anótalo en la app Fitness.', hora: '08:00', dias: [0, 1, 2, 3, 4, 5, 6] },
  comida: { titulo: 'Registrar comidas', detalle: 'Anota lo que comiste hoy en la app Fitness.', hora: '21:00', dias: [0, 1, 2, 3, 4, 5, 6] },
  respaldo: { titulo: 'Respaldo de Fitness', detalle: 'Exporta un respaldo JSON desde Ajustes en la app Fitness.', hora: '20:00', dias: [0] },
};
export const DIAS_CORTOS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']; // índice = Date.getDay()
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

export const esHoraValida = (h) => typeof h === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(h);

export const PREDETERMINADOS = Object.fromEntries(Object.entries(TIPOS).map(([id, t]) => [id, { activo: false, hora: t.hora, dias: [...t.dias] }]));

// Normaliza lo guardado (posiblemente corrupto o de una versión anterior).
export function normalizarRecordatorios(v) {
  const out = {};
  for (const [id, def] of Object.entries(PREDETERMINADOS)) {
    const r = v?.[id];
    const dias = Array.isArray(r?.dias) ? [...new Set(r.dias.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : def.dias;
    out[id] = { activo: r?.activo === true, hora: esHoraValida(r?.hora) ? r.hora : def.hora, dias: dias.length ? dias : def.dias };
  }
  return out;
}

// ---------- Archivo .ics (RFC 5545) ----------
export const escapar = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const dos = (n) => String(n).padStart(2, '0');
const fechaICS = (f) => f.replaceAll('-', '');
const estampa = (d) => `${d.getUTCFullYear()}${dos(d.getUTCMonth() + 1)}${dos(d.getUTCDate())}T${dos(d.getUTCHours())}${dos(d.getUTCMinutes())}${dos(d.getUTCSeconds())}Z`;
const bytes = (s) => new TextEncoder().encode(s).length;

// Pliega líneas largas a ≤ 75 octetos sin cortar caracteres multibyte.
export function plegar(linea) {
  if (bytes(linea) <= 75) return linea;
  const partes = [];
  let actual = '';
  for (const ch of linea) {
    const limite = partes.length ? 74 : 75; // las continuaciones llevan un espacio inicial
    if (bytes(actual + ch) > limite) { partes.push(actual); actual = ''; }
    actual += ch;
  }
  partes.push(actual);
  return partes.map((p, i) => (i ? ` ${p}` : p)).join('\r\n');
}

// Primer día igual o posterior a `desde` que esté en `dias`.
export function primerDia(desde, dias) {
  for (let i = 0; i < 7; i++) {
    const f = sumarDias(desde, i);
    if (dias.includes(aFecha(f).getDay())) return f;
  }
  return desde;
}

export function generarICS(config, { hoy, ahora = new Date() }) {
  const cfg = normalizarRecordatorios(config);
  const activos = Object.entries(cfg).filter(([, r]) => r.activo);
  if (!activos.length) throw new Error('Activa al menos un recordatorio para generar el calendario.');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fitness personal//ES', 'CALSCALE:GREGORIAN'];
  for (const [id, r] of activos) {
    const t = TIPOS[id];
    const inicio = `${fechaICS(primerDia(hoy, r.dias))}T${r.hora.replace(':', '')}00`; // hora local flotante
    const regla = r.dias.length === 7 ? 'FREQ=DAILY' : `FREQ=WEEKLY;BYDAY=${r.dias.map((d) => BYDAY[d]).join(',')}`;
    L.push('BEGIN:VEVENT', `UID:recordatorio-${id}@fitness-personal.local`, `DTSTAMP:${estampa(ahora)}`, `DTSTART:${inicio}`, 'DURATION:PT15M',
      `RRULE:${regla}`, `SUMMARY:${escapar(t.titulo)}`, `DESCRIPTION:${escapar(t.detalle)}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapar(t.titulo)}`, 'TRIGGER:PT0S', 'END:VALARM', 'END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return `${L.map(plegar).join('\r\n')}\r\n`;
}

// ---------- Avisos dentro de la app ----------
export const DIAS_SIN_RESPALDO = 7;

function diasEntre(a, b) { return Math.round((aFecha(b) - aFecha(a)) / 864e5); }

// `ahora` = { hoy: 'AAAA-MM-DD', diaSemana: 0-6, minutos: minutos desde medianoche }
export function avisosPendientes({ config, ahora, pesos = [], workouts = [], meals = [], ultimoRespaldo = null }) {
  const cfg = normalizarRecordatorios(config);
  const avisos = [];
  const toca = (r) => r.activo && r.dias.includes(ahora.diaSemana) && ahora.minutos >= Number(r.hora.slice(0, 2)) * 60 + Number(r.hora.slice(3));
  if (toca(cfg.entrenar) && !workouts.some((w) => w.date === ahora.hoy && (w.ejercicios ?? []).some((e) => (e.series ?? []).length))) avisos.push({ id: 'entrenar', texto: 'Hoy te toca entrenar según tu horario y aún no hay un entrenamiento registrado.', enlace: '#/entrenar' });
  if (toca(cfg.peso) && !pesos.some((p) => p.date === ahora.hoy)) avisos.push({ id: 'peso', texto: 'Aún no has registrado tu peso hoy.', enlace: '#/peso' });
  if (toca(cfg.comida) && !meals.some((m) => m.date === ahora.hoy)) avisos.push({ id: 'comida', texto: 'Aún no has registrado comidas hoy.', enlace: '#/comida' });
  // El aviso de respaldo no depende de la configuración: iOS puede borrar los datos de la app.
  if (pesos.length || workouts.length || meals.length) {
    const dias = ultimoRespaldo ? diasEntre(ultimoRespaldo, ahora.hoy) : null;
    if (dias === null) avisos.push({ id: 'respaldo', texto: 'Aún no has hecho ningún respaldo. Tus datos solo existen en este iPhone.', enlace: '#/ajustes' });
    else if (dias >= DIAS_SIN_RESPALDO) avisos.push({ id: 'respaldo', texto: `Llevas ${dias} días sin hacer un respaldo.`, enlace: '#/ajustes' });
  }
  return avisos;
}
