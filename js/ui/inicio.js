import { el, titulo, tarjeta, estadoVacio, boton } from './components.js';
import { ejecutarAnalisis, ultimoAnalisis } from '../analisis.js';
import { formatearFecha, formatearKg, formatearNumero } from '../format.js';
import { fechaLocalHoy } from '../schema.js';
import { listar, obtener } from '../db.js';
import { cargarRecordatorios } from '../recordatorios.js';
import { avisosPendientes } from '../domain/recordatorios.js';
import { calcularPanel } from '../domain/panel.js';

const signo = (n, dec = 0) => `${n > 0 ? '+' : ''}${formatearNumero(n, dec)}`;
const r0 = (n) => formatearNumero(n === null ? null : Math.round(n), 0);
const r1 = (n) => formatearNumero(n === null ? null : Math.round(n * 10) / 10, 1);

function bloqueAnalisis(registro) {
  if (!registro) return el('p', { class: 'muted' }, 'Todavía no se ha ejecutado ningún análisis.');
  const r = registro.resultado;
  return el('div', {},
    el('p', { class: 'muted' }, `Período: ${formatearFecha(r.desde, { day: 'numeric', month: 'short' })} – ${formatearFecha(r.hasta, { day: 'numeric', month: 'short', year: 'numeric' })}`),
    ...r.secciones.map((s) => el('div', { class: 'analisis-sec' },
      el('h3', {}, s.titulo, s.estado === 'insuficiente' ? el('span', { class: 'muted' }, ' · datos insuficientes') : ''),
      ...s.hallazgos.map((h) => el('details', {}, el('summary', {}, h.texto), el('p', { class: 'muted' }, h.explicacion))))),
    r.recomendaciones.length
      ? el('div', { class: 'analisis-sec' }, el('h3', {}, 'Recomendaciones'),
          el('p', { class: 'muted' }, 'Solo informativas: no cambian tus datos ni tus rutinas.'),
          ...r.recomendaciones.map((x) => el('details', {}, el('summary', {}, x.texto), el('p', { class: 'muted' }, x.porque))))
      : el('p', { class: 'muted' }, 'Sin recomendaciones por ahora.'));
}

async function tarjetaAnalisis() {
  const cont = el('div', {}, bloqueAnalisis(await ultimoAnalisis()));
  const msg = el('p', { class: 'muted', role: 'status' }, '');
  return tarjeta(el('h2', {}, 'Análisis semanal'),
    el('p', { class: 'muted' }, 'Se calcula en tu dispositivo, sin Internet. Se ejecuta solo al abrir la app tras un domingo, o cuando tú quieras.'),
    cont,
    boton('Ejecutar análisis ahora', async () => {
      try { cont.replaceChildren(bloqueAnalisis(await ejecutarAnalisis())); msg.textContent = 'Análisis actualizado.'; }
      catch (e) { msg.textContent = `No se pudo ejecutar: ${e.message}`; msg.className = 'error'; }
    }, { variante: 'secundario' }), msg);
}

export async function vistaInicio() {
  const hoy = fechaLocalHoy();
  const [pesos, workouts, meals] = [await listar('weights'), await listar('workouts'), await listar('meals')];
  const p = calcularPanel({ pesos, workouts, meals, hoy });

  const ahora = new Date();
  const avisos = avisosPendientes({
    config: await cargarRecordatorios(), pesos, workouts, meals, ultimoRespaldo: (await obtener('settings', 'ultimoRespaldo'))?.value ?? null,
    ahora: { hoy, diaSemana: ahora.getDay(), minutos: ahora.getHours() * 60 + ahora.getMinutes() },
  });
  const cabecera = [titulo('Inicio'), el('p', { class: 'muted' }, formatearFecha(hoy)),
    avisos.length ? tarjeta(el('h2', {}, 'Pendiente'), ...avisos.map((a) => el('p', { class: 'aviso' }, a.texto, ' ', el('a', { href: a.enlace }, 'Ir')))) : null];
  if (!p.hayDatos) {
    return el('div', {}, ...cabecera, tarjeta(estadoVacio('Aún no hay datos', 'Registra un peso, un entrenamiento o una comida y aquí verás tu resumen.')),
      el('p', {}, el('a', { href: '#/peso' }, 'Registrar peso'), ' · ', el('a', { href: '#/entrenar' }, 'Entrenar'), ' · ', el('a', { href: '#/comida' }, 'Comida')));
  }

  const { peso, entrenos, comida } = p;
  const cmp = entrenos.comparacion;
  return el('div', {}, ...cabecera,
    tarjeta(el('h2', {}, 'Peso'),
      peso.ultimo
        ? [el('p', {}, el('strong', {}, formatearKg(peso.ultimo.kg)), el('span', { class: 'muted' }, ` · ${formatearFecha(peso.ultimo.date)}`)),
           el('p', { class: 'muted' }, peso.tendencia.tipo === 'insuficiente' ? 'Tendencia: datos insuficientes.' : peso.tendencia.explicacion)]
        : el('p', { class: 'muted' }, 'Sin registros de peso.'),
      el('a', { href: '#/peso' }, 'Ver peso')),
    tarjeta(el('h2', {}, 'Entrenamiento · últimos 7 días'),
      entrenos.actual.n
        ? el('p', {}, el('strong', {}, `${entrenos.actual.n} sesion${entrenos.actual.n === 1 ? '' : 'es'}`), ` · volumen ${formatearKg(entrenos.actual.volumen, 0)}`)
        : el('p', { class: 'muted' }, 'Sin entrenamientos esta semana.'),
      el('p', { class: 'muted' }, cmp
        ? `Frente a los 7 días previos: ${signo(cmp.sesiones)} sesiones${cmp.volumen !== null ? `, ${signo(cmp.volumen)} kg de volumen` : ''}.`
        : 'Sin referencia de los 7 días previos para comparar.'),
      p.records.length
        ? [el('h2', {}, 'Récords recientes'), ...p.records.map((r) => el('p', { class: 'record' }, `${r.nombre}: ${r.tipo} ${formatearNumero(r.valor, 1)} kg`, el('span', { class: 'muted' }, ` · ${formatearFecha(r.date, { day: 'numeric', month: 'short' })}`)))]
        : null,
      el('a', { href: '#/entrenar' }, 'Ver entrenamientos')),
    tarjeta(el('h2', {}, 'Alimentación'),
      comida.hoy.comidas
        ? el('p', {}, el('strong', {}, `≈ ${r0(comida.hoy.kcal)} kcal · ≈ ${r1(comida.hoy.proteina)} g de proteína`), el('span', { class: 'muted' }, comida.hoy.parcial ? ' · parcial (hay ítems sin datos)' : ''))
        : el('p', { class: 'muted' }, 'Sin comidas registradas hoy.'),
      el('p', { class: 'muted' }, comida.semana.dias
        ? `Últimos 7 días: promedio de ≈ ${r0(comida.semana.kcal)} kcal y ≈ ${r1(comida.semana.proteina)} g de proteína por día registrado (${comida.semana.dias} día${comida.semana.dias === 1 ? '' : 's'} con datos).`
        : 'Sin registros en los últimos 7 días.'),
      el('a', { href: '#/comida' }, 'Ver comidas')),
    await tarjetaAnalisis());
}
