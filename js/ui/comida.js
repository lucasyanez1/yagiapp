import { el, titulo, tarjeta, estadoVacio, boton, campo } from './components.js';
import { formatearFecha, formatearNumero, parsearNumero } from '../format.js';
import { fechaLocalHoy, esFechaLocal } from '../schema.js';
import { interpretarComida, totalizar } from '../domain/nutricion.js';
import {
  MOMENTOS, cargarCatalogo, crearAlimento, listarAlimentosPropios, eliminarAlimento, guardarComida, comidasDelDia, eliminarComida,
} from '../comidas.js';

const AVISO = 'Valores aproximados de referencia (catálogo no verificado). Corrige los que conozcas; lo desconocido se muestra como "—" y no se cuenta como cero.';

const r0 = (n) => formatearNumero(n == null ? null : Math.round(n), 0);
const r1 = (n) => formatearNumero(n == null ? null : Math.round(n * 10) / 10, 1);

function textoTotales(t) {
  if (t.kcal === null && t.proteina === null) return 'Sin valores conocidos';
  return `≈ ${r0(t.kcal)} kcal · ≈ ${r1(t.proteina)} g de proteína${t.parcial ? ` (parcial: ${t.incompletos} ítem${t.incompletos === 1 ? '' : 's'} sin datos completos)` : ''}`;
}

export async function vistaComida() {
  const raiz = el('div', {});
  let fecha = fechaLocalHoy();

  async function principal() {
    const [catalogo, comidas] = [await cargarCatalogo(), await comidasDelDia(fecha)];
    const todos = comidas.flatMap((c) => c.items);
    const msg = el('p', { role: 'status', class: 'muted' }, '');
    const aviso = (m, error = false) => { msg.textContent = m; msg.className = error ? 'error' : 'muted'; };

    const inputFecha = el('input', { type: 'date', value: fecha, 'aria-label': 'Día',
      onchange: (e) => { if (esFechaLocal(e.target.value)) { fecha = e.target.value; mostrar(); } } });
    const texto = el('input', { type: 'text', maxlength: 300, placeholder: 'p. ej. 2 huevos y 150 g de arroz', 'aria-label': '¿Qué comiste?' });
    const momento = el('select', { 'aria-label': 'Momento' }, el('option', { value: '' }, 'Momento (opcional)'), MOMENTOS.map((m) => el('option', { value: m }, m)));
    const zona = el('div', { class: 'zona' });

    function editor(items) {
      const filas = el('div', {});
      const totalEl = el('p', { class: 'muted', role: 'status' }, '');
      const invalidos = new Set();
      const refrescar = () => { totalEl.textContent = `Esta comida: ${textoTotales(totalizar(items))}`; };

      function celda(it, campoNombre, etiqueta) {
        const inp = el('input', { type: 'text', inputmode: 'decimal', value: it[campoNombre] == null ? '' : Math.round(it[campoNombre] * 10) / 10, placeholder: '—', 'aria-label': `${etiqueta} de ${it.nombre}` });
        inp.addEventListener('input', () => {
          const bruto = inp.value.trim();
          const v = bruto === '' ? null : parsearNumero(bruto);
          const malo = bruto !== '' && (v === null || v < 0);
          inp.classList.toggle('invalido', malo);
          malo ? invalidos.add(inp) : invalidos.delete(inp);
          it[campoNombre] = malo ? null : v;
          it.origen = 'manual';
          refrescar();
        });
        return inp;
      }
      const pintar = () => {
        filas.replaceChildren(...items.map((it, idx) => el('div', { class: 'item-comida' },
          el('strong', {}, it.nombre, it.gramos != null ? el('span', { class: 'muted' }, ` · ${r0(it.gramos)} g`) : ''),
          el('div', { class: 'par' }, campo('kcal', celda(it, 'kcal', 'Calorías')), campo('Proteína (g)', celda(it, 'proteina', 'Proteína'))),
          ...it.notas.map((n) => el('small', { class: 'muted nota' }, n)),
          boton('Quitar', () => { items.splice(idx, 1); invalidos.clear(); pintar(); refrescar(); }, { variante: 'secundario' }))));
        if (!items.length) filas.replaceChildren(el('p', { class: 'muted' }, 'No hay ítems.'));
      };
      pintar(); refrescar();
      return el('div', {}, el('h2', {}, 'Revisa antes de guardar'), filas,
        boton('Añadir ítem manual', () => { items.push({ nombre: 'Ítem manual', gramos: null, kcal: null, proteina: null, origen: 'manual', foodId: null, notas: [] }); pintar(); refrescar(); }, { variante: 'secundario' }),
        totalEl,
        boton('Guardar comida', async (ev) => {
          if (invalidos.size) return aviso('Hay valores inválidos (marcados en rojo).', true);
          ev.target.disabled = true; // evita guardar dos veces con un doble toque
          try {
            await guardarComida({ date: fecha, momento: momento.value, texto: texto.value, items });
            await ir(principal);
          } catch (e) { aviso(e.message, true); ev.target.disabled = false; }
        }));
    }

    return el('div', {},
      titulo('Comida'),
      el('p', { class: 'muted' }, AVISO),
      campo('Día', inputFecha),
      tarjeta(el('h2', {}, formatearFecha(fecha)), el('p', {}, el('strong', {}, todos.length ? textoTotales(totalizar(todos)) : 'Sin comidas registradas este día'))),
      tarjeta(el('h2', {}, 'Registrar comida'),
        campo('¿Qué comiste?', texto, 'Separa con comas o "y". Ejemplos: "1 vaso de leche", "medio pan", "2 huevos".'), momento,
        boton('Analizar', () => {
          aviso('');
          if (!texto.value.trim()) return aviso('Escribe qué comiste.', true);
          zona.replaceChildren(editor(interpretarComida(texto.value, catalogo)));
        }),
        zona, msg),
      comidas.length ? tarjeta(el('h2', {}, 'Registrado'), ...comidas.map((c) => el('div', { class: 'comida-reg' },
        el('strong', {}, c.momento ?? 'Comida'),
        el('p', { class: 'muted' }, c.items.map((i) => i.nombre).join(', ')),
        el('p', {}, textoTotales(totalizar(c.items))),
        boton('Eliminar', async function () {
          if (!this.dataset.ok) { this.dataset.ok = '1'; this.textContent = 'Pulsa de nuevo para eliminar'; return; }
          await eliminarComida(c.id); await mostrar();
        }, { variante: 'secundario' })))) : null,
      boton('Mis alimentos', () => ir(misAlimentos), { variante: 'secundario' }));
  }

  async function misAlimentos() {
    const propios = await listarAlimentosPropios();
    const msg = el('p', { role: 'status', class: 'muted' }, '');
    const aviso = (m, error = false) => { msg.textContent = m; msg.className = error ? 'error' : 'muted'; };
    const f = {
      nombre: el('input', { type: 'text', maxlength: 60, 'aria-label': 'Nombre del alimento' }),
      kcal: el('input', { type: 'text', inputmode: 'decimal', 'aria-label': 'Calorías por 100 g' }),
      prot: el('input', { type: 'text', inputmode: 'decimal', 'aria-label': 'Proteínas por 100 g' }),
      unidad: el('input', { type: 'text', inputmode: 'decimal', 'aria-label': 'Gramos por unidad' }),
    };
    const num = (i) => (i.value.trim() === '' ? null : parsearNumero(i.value));
    return el('div', {}, titulo('Mis alimentos'), boton('← Volver', () => ir(principal), { variante: 'secundario' }),
      tarjeta(el('p', { class: 'muted' }, 'Copia los datos de la etiqueta nutricional (por 100 g).'),
        campo('Nombre', f.nombre), campo('Calorías por 100 g', f.kcal), campo('Proteínas por 100 g (opcional)', f.prot),
        campo('Gramos por unidad (opcional)', f.unidad, 'Para poder escribir "2 unidades de ...".'),
        boton('Guardar alimento', async () => {
          const [k, p, u] = [num(f.kcal), num(f.prot), num(f.unidad)];
          if ((f.kcal.value.trim() && k === null) || (f.prot.value.trim() && p === null) || (f.unidad.value.trim() && u === null)) return aviso('Revisa los números.', true);
          try { await crearAlimento({ nombre: f.nombre.value, kcal100: k, prot100: p, gramosUnidad: u }); await ir(misAlimentos); }
          catch (e) { aviso(e.message, true); }
        }), msg),
      propios.length
        ? tarjeta(...propios.map((p) => el('div', { class: 'ej-fila' }, el('strong', {}, p.nombre),
            el('span', { class: 'muted' }, `${r0(p.kcal100)} kcal · ${p.prot100 == null ? '—' : r1(p.prot100)} g prot / 100 g`),
            boton('Eliminar', async function () {
              if (!this.dataset.ok) { this.dataset.ok = '1'; this.textContent = 'Pulsa de nuevo para eliminar'; return; }
              await eliminarAlimento(p.id); await ir(misAlimentos);
            }, { variante: 'secundario' }))))
        : tarjeta(estadoVacio('Sin alimentos propios', 'Crea alimentos con los datos de su etiqueta para estimaciones más precisas.')));
  }

  async function ir(fn) { raiz.replaceChildren(await fn()); window.scrollTo(0, 0); }
  const mostrar = () => ir(principal);
  await mostrar();
  return raiz;
}
