import { el, titulo, tarjeta, estadoVacio, boton, campo } from './components.js';
import { graficoLinea } from './grafico.js';
import { formatearFecha, formatearNumero, formatearKg, parsearNumero } from '../format.js';
import { esFechaLocal } from '../schema.js';
import {
  listarEjercicios, crearEjercicio, renombrarEjercicio, eliminarOArchivarEjercicio, cargarEjerciciosBasicos,
  listarEntrenamientos, crearEntrenamiento, guardarEntrenamiento, obtenerEntrenamiento, eliminarEntrenamiento,
} from '../entrenamientos.js';
import {
  volumenSeries, volumenEntrenamiento, historialEjercicio, records, nuevosRecords, sugerirProgresion,
} from '../domain/entrenamiento.js';

const NOMBRE_RECORD = { mejorKg: 'Carga máxima', e1rm: '1RM estimado', volumen: 'Volumen de sesión' };

export async function vistaEntrenar() {
  const raiz = el('div', {});
  let limpiar = () => {};
  async function ir(fn, ...args) {
    limpiar();
    limpiar = () => {};
    raiz.replaceChildren(await fn(...args));
    window.scrollTo(0, 0);
  }

  // ---------- Lista ----------
  async function lista() {
    const ws = await listarEntrenamientos();
    return el('div', {},
      titulo('Entrenar'),
      boton('Nuevo entrenamiento', async () => ir(editor, (await crearEntrenamiento()).id)),
      el('div', { class: 'fila-botones' },
        boton('Ejercicios', () => ir(ejercicios), { variante: 'secundario' }),
        boton('Progreso', () => ir(progreso), { variante: 'secundario' })),
      ws.length
        ? tarjeta(el('h2', {}, 'Historial'), ...ws.map((w) => el('button', { class: 'fila', type: 'button', onclick: () => ir(editor, w.id) },
            el('strong', {}, formatearFecha(w.date)),
            el('span', { class: 'muted' }, `${w.ejercicios.length} ejercicio${w.ejercicios.length === 1 ? '' : 's'} · volumen ${formatearKg(volumenEntrenamiento(w), 0)}`))))
        : tarjeta(estadoVacio('Sin entrenamientos', 'Crea tu primer entrenamiento para empezar a registrar series y cargas.')));
  }

  // ---------- Catálogo de ejercicios ----------
  async function ejercicios() {
    const lista_ = await listarEjercicios();
    const msg = el('p', { role: 'status', class: 'muted' }, '');
    const aviso = (m, error = false) => { msg.textContent = m; msg.className = error ? 'error' : 'muted'; };
    const nuevo = el('input', { type: 'text', maxlength: 60, placeholder: 'Nombre del ejercicio', 'aria-label': 'Nuevo ejercicio' });
    const recargar = () => ir(ejercicios);
    return el('div', {},
      titulo('Ejercicios'),
      boton('← Volver', () => ir(lista), { variante: 'secundario' }),
      tarjeta(
        campo('Nuevo ejercicio', nuevo),
        boton('Añadir ejercicio', async () => { try { await crearEjercicio(nuevo.value); await recargar(); } catch (e) { aviso(e.message, true); } }),
        msg),
      lista_.length
        ? tarjeta(...lista_.map((e) => {
            const campoNombre = el('input', { type: 'text', value: e.nombre, maxlength: 60, 'aria-label': `Nombre de ${e.nombre}` });
            return el('div', { class: 'ej-fila' }, campoNombre,
              boton('Guardar nombre', async () => { try { await renombrarEjercicio(e.id, campoNombre.value); aviso('Nombre guardado. Los entrenamientos pasados conservan el nombre original.'); } catch (x) { aviso(x.message, true); } }, { variante: 'secundario' }),
              boton('Quitar', async () => { const r = await eliminarOArchivarEjercicio(e.id); await recargar(); aviso(r === 'archivado' ? 'Archivado: tiene historial y se conserva.' : 'Eliminado.'); }, { variante: 'secundario' }));
          }))
        : tarjeta(estadoVacio('Sin ejercicios', 'Añade los tuyos o carga una lista básica.'),
            boton('Cargar ejercicios básicos', async () => { await cargarEjerciciosBasicos(); await recargar(); })));
  }

  // ---------- Progreso ----------
  async function progreso(seleccion) {
    const [ws, ejs] = [await listarEntrenamientos(), await listarEjercicios({ incluirArchivados: true })];
    const conHistorial = ejs.filter((e) => historialEjercicio(ws, e.id).length);
    const cuerpo = el('div', {});
    const sel = el('select', { 'aria-label': 'Ejercicio', onchange: () => pintar(sel.value) },
      conHistorial.map((e) => el('option', { value: e.id }, e.nombre)));
    function pintar(id) {
      const h = historialEjercicio(ws, id);
      const r = records(h);
      cuerpo.replaceChildren(
        tarjeta(el('h2', {}, 'Récords personales'),
          ...Object.entries(NOMBRE_RECORD).map(([k, n]) => el('p', {}, `${n}: `, r[k] ? el('strong', {}, `${formatearNumero(r[k].valor, k === 'volumen' ? 0 : 1)} kg`) : '—', r[k] ? el('span', { class: 'muted' }, ` (${formatearFecha(r[k].date)})`) : ''))),
        h.length < 2 ? el('p', { class: 'muted' }, 'Con una sola sesión aún no hay tendencia que mostrar.') : null,
        tarjeta(el('h2', {}, 'Carga máxima por sesión (kg)'), graficoLinea(h.map((s) => ({ x: s.date, y: s.mejorKg })), { titulo: 'Carga máxima por sesión' })),
        tarjeta(el('h2', {}, '1RM estimado (kg)'), graficoLinea(h.map((s) => ({ x: s.date, y: s.e1rm })), { titulo: '1RM estimado por sesión' }),
          el('p', { class: 'muted' }, 'Estimación (Epley) solo con series de 1 a 12 repeticiones.')));
    }
    if (!conHistorial.length) {
      return el('div', {}, titulo('Progreso'), boton('← Volver', () => ir(lista), { variante: 'secundario' }),
        tarjeta(estadoVacio('Sin datos de progreso', 'Registra series con carga y repeticiones para ver tus récords y tu evolución.')));
    }
    if (seleccion) sel.value = seleccion;
    pintar(sel.value);
    return el('div', {}, titulo('Progreso'), boton('← Volver', () => ir(lista), { variante: 'secundario' }), campo('Ejercicio', sel), cuerpo);
  }

  // ---------- Editor ----------
  async function editor(id) {
    const w = await obtenerEntrenamiento(id);
    if (!w) return el('div', {}, boton('← Volver', () => ir(lista)), el('p', { class: 'error' }, 'El entrenamiento ya no existe.'));
    const [todos, catalogo] = [await listarEntrenamientos(), await listarEjercicios()];
    const otros = todos.filter((x) => x.id !== w.id && x.date <= w.date);
    const estado = el('p', { class: 'muted', role: 'status' }, '');
    const totalEl = el('p', { class: 'muted' }, '');
    let timer;

    async function guardarYa() {
      clearTimeout(timer);
      if (eliminado) return;
      try { await guardarEntrenamiento(w); estado.textContent = 'Guardado.'; }
      catch (e) { estado.textContent = `No se pudo guardar: ${e.message}`; estado.className = 'error'; }
    }
    const programar = () => { estado.className = 'muted'; estado.textContent = 'Guardando…'; clearTimeout(timer); timer = setTimeout(guardarYa, 400); };
    let eliminado = false; // tras eliminar, nada debe volver a guardar este entrenamiento
    const alOcultar = () => {
      if (!nodo.isConnected) { document.removeEventListener('visibilitychange', alOcultar); return; } // editor abandonado
      if (document.visibilityState === 'hidden') guardarYa();
    };
    document.addEventListener('visibilitychange', alOcultar);
    limpiar = () => { document.removeEventListener('visibilitychange', alOcultar); guardarYa(); };

    const resumenes = [];
    const actualizarResumen = () => {
      resumenes.forEach((f) => f());
      totalEl.textContent = `Volumen total: ${formatearKg(volumenEntrenamiento(w), 0)}`;
    };

    function bloqueEjercicio(e) {
      const prev = historialEjercicio(otros, e.ejercicioId);
      const sug = sugerirProgresion(prev);
      const volEl = el('p', { class: 'muted' }, '');
      const recEl = el('p', { class: 'record' }, '');
      resumenes.push(() => {
        volEl.textContent = `Volumen: ${formatearKg(volumenSeries(e.series), 0)}`;
        const mia = historialEjercicio([{ ...w, ejercicios: [e] }], e.ejercicioId)[0];
        const nr = mia ? nuevosRecords(prev, mia) : [];
        recEl.textContent = nr.length ? `Nuevo récord: ${nr.join(', ')}` : '';
      });
      const filas = el('div', {});
      const pintarSeries = () => filas.replaceChildren(...e.series.map((s, i) => {
        const kg = el('input', { type: 'text', inputmode: 'decimal', value: s.kg ?? '', 'aria-label': `Serie ${i + 1}, kilos`, placeholder: 'kg' });
        const reps = el('input', { type: 'text', inputmode: 'numeric', value: s.reps ?? '', 'aria-label': `Serie ${i + 1}, repeticiones`, placeholder: 'reps' });
        const leer = (inp, aEntero) => {
          const v = parsearNumero(inp.value);
          const ok = v !== null && v >= 0 && (!aEntero || Number.isInteger(v));
          inp.classList.toggle('invalido', inp.value.trim() !== '' && !ok);
          inp.setAttribute('aria-invalid', String(inp.value.trim() !== '' && !ok));
          return ok ? v : null;
        };
        kg.addEventListener('input', () => { s.kg = leer(kg, false); actualizarResumen(); programar(); });
        reps.addEventListener('input', () => { s.reps = leer(reps, true); actualizarResumen(); programar(); });
        return el('div', { class: 'serie' }, el('span', { class: 'muted' }, `${i + 1}`), kg, el('span', {}, 'kg ×'), reps,
          el('button', { class: 'btn secundario', type: 'button', 'aria-label': `Quitar serie ${i + 1}`, onclick: () => { e.series.splice(i, 1); pintarSeries(); actualizarResumen(); programar(); } }, '✕'));
      }));
      pintarSeries();
      const sugerencia = sug.tipo === 'insuficiente'
        ? el('p', { class: 'muted' }, sug.explicacion)
        : el('div', { class: 'sugerencia' },
            el('p', {}, el('strong', {}, `Sugerencia: ${formatearNumero(sug.kg, Number.isInteger(sug.kg) ? 0 : 1)} kg × ${sug.reps}`)),
            el('p', { class: 'muted' }, sug.explicacion),
            e.series.length ? null : boton('Aplicar sugerencia (3 series)', () => {
              e.series = [0, 1, 2].map(() => ({ kg: sug.kg, reps: sug.reps }));
              pintarSeries(); actualizarResumen(); programar();
            }, { variante: 'secundario' }));
      return tarjeta(
        el('h2', {}, e.nombre), sugerencia, filas,
        boton('Añadir serie', () => {
          const ult = e.series.at(-1);
          e.series.push({ kg: ult?.kg ?? null, reps: ult?.reps ?? null });
          pintarSeries(); actualizarResumen(); programar();
        }, { variante: 'secundario' }),
        volEl, recEl,
        boton('Quitar ejercicio del entrenamiento', function () {
          if (e.series.length && !this.dataset.confirmar) { this.dataset.confirmar = '1'; this.textContent = 'Pulsa de nuevo: se borrarán sus series'; return; }
          w.ejercicios = w.ejercicios.filter((x) => x !== e);
          guardarYa().then(() => ir(editor, w.id));
        }, { variante: 'secundario' }));
    }

    const fecha = el('input', { type: 'date', value: w.date, 'aria-label': 'Fecha',
      onchange: (ev) => { if (esFechaLocal(ev.target.value)) { w.date = ev.target.value; programar(); } } });
    const notas = el('input', { type: 'text', value: w.notas ?? '', maxlength: 300, 'aria-label': 'Notas',
      oninput: (ev) => { w.notas = ev.target.value; programar(); } });
    const elegir = el('select', { 'aria-label': 'Ejercicio a añadir' },
      catalogo.map((c) => el('option', { value: c.id }, c.nombre)));

    const nodo = el('div', {},
      titulo('Entrenamiento'),
      boton('← Listo', async () => {
        if (!w.ejercicios.length && !(w.notas ?? '').trim()) { // un entrenamiento vacío no se conserva
          eliminado = true; clearTimeout(timer); await eliminarEntrenamiento(w.id);
        } else await guardarYa();
        ir(lista);
      }, { variante: 'secundario' }),
      tarjeta(campo('Fecha', fecha), campo('Notas', notas)),
      ...w.ejercicios.map(bloqueEjercicio),
      tarjeta(el('h2', {}, 'Añadir ejercicio'),
        catalogo.length
          ? [elegir, boton('Añadir al entrenamiento', () => {
              const c = catalogo.find((x) => x.id === elegir.value);
              if (!c) return;
              w.ejercicios.push({ ejercicioId: c.id, nombre: c.nombre, series: [] });
              guardarYa().then(() => ir(editor, w.id));
            })]
          : [el('p', { class: 'muted' }, 'Tu catálogo está vacío.'), boton('Ir a Ejercicios', async () => { await guardarYa(); ir(ejercicios); }, { variante: 'secundario' })]),
      totalEl, estado,
      el('hr', {}),
      boton('Eliminar este entrenamiento', function () {
        if (!this.dataset.confirmar) { this.dataset.confirmar = '1'; this.textContent = 'Pulsa de nuevo para eliminar definitivamente'; return; }
        eliminado = true;
        document.removeEventListener('visibilitychange', alOcultar);
        limpiar = () => {};
        clearTimeout(timer);
        eliminarEntrenamiento(w.id).then(() => ir(lista));
      }, { variante: 'secundario' }));
    actualizarResumen();
    return nodo;
  }

  await ir(lista);
  return raiz;
}
