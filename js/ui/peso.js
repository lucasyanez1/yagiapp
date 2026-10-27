import { el, titulo, tarjeta, estadoVacio, boton, campo } from './components.js';
import { graficoLinea } from './grafico.js';
import { formatearFecha, formatearKg, formatearNumero, parsearNumero } from '../format.js';
import { fechaLocalHoy, esFechaLocal } from '../schema.js';
import { crearPeso, editarPeso, eliminarPeso, listarPesos } from '../pesos.js';
import { promediosDiarios, promediosSemanales, tendenciaPeso, sumarDias } from '../domain/peso.js';

export async function vistaPeso() {
  const raiz = el('div', {});

  async function pintar() {
    const pesos = await listarPesos();
    const hoy = fechaLocalHoy();
    const msg = el('p', { role: 'status', class: 'muted' }, '');
    const aviso = (m, error = false) => { msg.textContent = m; msg.className = error ? 'error' : 'muted'; };
    const fecha = el('input', { type: 'date', value: hoy, 'aria-label': 'Fecha del peso' });
    const kg = el('input', { type: 'text', inputmode: 'decimal', placeholder: 'p. ej. 80,5', 'aria-label': 'Peso en kilos' });

    const tend = tendenciaPeso(pesos, hoy);
    const desde = sumarDias(hoy, -89);
    const serie = promediosDiarios(pesos).filter((d) => d.date >= desde);
    const semanas = promediosSemanales(pesos).slice(-8).reverse();

    const filas = [...pesos].reverse().slice(0, 30).map((p) => {
      const f = el('input', { type: 'date', value: p.date, 'aria-label': 'Fecha' });
      const k = el('input', { type: 'text', inputmode: 'decimal', value: String(p.kg).replace('.', ','), 'aria-label': 'Peso en kilos' });
      return el('div', { class: 'ej-fila fila-2' }, f, k,
        boton('Guardar cambios', async () => {
          try { await editarPeso(p.id, { date: f.value, kg: parsearNumero(k.value) }); await recargar(); }
          catch (e) { aviso(e.message, true); }
        }, { variante: 'secundario' }),
        boton('Eliminar', async function () {
          if (!this.dataset.ok) { this.dataset.ok = '1'; this.textContent = 'Pulsa de nuevo para eliminar'; return; }
          await eliminarPeso(p.id); await recargar();
        }, { variante: 'secundario' }));
    });

    return el('div', {},
      titulo('Peso'),
      tarjeta(campo('Fecha', fecha), campo('Peso (kg)', kg),
        boton('Guardar peso', async () => {
          if (!esFechaLocal(fecha.value)) return aviso('Elige una fecha válida.', true);
          try { await crearPeso({ date: fecha.value, kg: parsearNumero(kg.value) }); await recargar(); }
          catch (e) { aviso(e.message, true); }
        }), msg),
      pesos.length ? [
        tarjeta(el('h2', {}, 'Tendencia'), el('p', {}, el('strong', {}, { insuficiente: 'Datos insuficientes', estable: 'Estable', sube: 'Al alza', baja: 'A la baja' }[tend.tipo])), el('p', { class: 'muted' }, tend.explicacion)),
        tarjeta(el('h2', {}, 'Últimos 90 días (kg)'), graficoLinea(serie.map((d) => ({ x: d.date, y: d.kg })), { titulo: 'Peso diario' })),
        tarjeta(el('h2', {}, 'Promedios semanales'), ...semanas.map((s) => el('p', {}, `Semana del ${formatearFecha(s.semana, { day: 'numeric', month: 'short' })}: `, el('strong', {}, formatearKg(s.promedio)), el('span', { class: 'muted' }, ` · ${s.dias} día${s.dias === 1 ? '' : 's'} con dato`)))),
        tarjeta(el('h2', {}, 'Registros'), ...filas),
      ] : tarjeta(estadoVacio('Sin registros de peso', 'Anota tu primer peso arriba para ver tu tendencia y tus promedios.')));
  }

  const recargar = async () => raiz.replaceChildren(await pintar());
  await recargar();
  return raiz;
}
