import { el, tarjeta, boton } from './components.js';
import { cargarRecordatorios, guardarRecordatorios } from '../recordatorios.js';
import { TIPOS, DIAS_CORTOS, esHoraValida, generarICS } from '../domain/recordatorios.js';
import { entregarArchivo } from '../backup.js';
import { fechaLocalHoy } from '../schema.js';

export async function seccionRecordatorios() {
  let cfg = await cargarRecordatorios();
  const msg = el('p', { role: 'status', class: 'muted' }, '');
  const aviso = (m, error = false) => { msg.textContent = m; msg.className = error ? 'error' : 'muted'; };
  const guardarCfg = async () => { cfg = await guardarRecordatorios(cfg); aviso('Guardado.'); };

  const bloques = Object.entries(TIPOS).map(([id, t]) => {
    const activo = el('input', { type: 'checkbox', checked: cfg[id].activo, 'aria-label': `Activar ${t.titulo}`,
      onchange: (e) => { cfg[id].activo = e.target.checked; guardarCfg(); } });
    const hora = el('input', { type: 'time', value: cfg[id].hora, 'aria-label': `Hora de ${t.titulo}`,
      onchange: (e) => { if (esHoraValida(e.target.value)) { cfg[id].hora = e.target.value; guardarCfg(); } else { e.target.value = cfg[id].hora; aviso('Hora no válida.', true); } } });
    const dias = el('div', { class: 'dias', role: 'group', 'aria-label': `Días de ${t.titulo}` },
      DIAS_CORTOS.map((d, i) => el('label', { class: 'dia' },
        el('input', { type: 'checkbox', checked: cfg[id].dias.includes(i), 'aria-label': `${t.titulo}: día ${d}`,
          onchange: (e) => {
            const s = new Set(cfg[id].dias);
            e.target.checked ? s.add(i) : s.delete(i);
            if (!s.size) { e.target.checked = true; return aviso('Elige al menos un día.', true); }
            cfg[id].dias = [...s].sort(); guardarCfg();
          } }), d)));
    return el('div', { class: 'recordatorio' }, el('label', { class: 'opcion' }, activo, el('strong', {}, t.titulo)), hora, dias);
  });

  return tarjeta(
    el('h2', {}, 'Recordatorios'),
    el('p', { class: 'muted' }, 'iOS no permite que una app web programe notificaciones por sí sola, y las notificaciones push requieren un servidor propio, que esta app no tiene. Por eso hay dos formas gratuitas:'),
    el('ol', { class: 'muted' },
      el('li', {}, 'Calendario: descarga un archivo .ics con alarmas y ábrelo con la app Calendario del iPhone.'),
      el('li', {}, 'Avisos al abrir la app: aparecen en Inicio cuando te falta registrar algo.')),
    ...bloques,
    boton('Descargar calendario (.ics)', async () => {
      try { await entregarArchivo('fitness-recordatorios.ics', generarICS(cfg, { hoy: fechaLocalHoy() }), 'text/calendar'); aviso('Archivo generado. Ábrelo con la app Calendario; debería ofrecerte añadir los eventos (no verificado en todos los iPhone).'); }
      catch (e) { aviso(e.message, true); }
    }, { variante: 'secundario' }),
    msg);
}
