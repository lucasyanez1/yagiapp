import { el, titulo, tarjeta, boton, campo } from './components.js';
import { aplicarApariencia, TEMAS, ACENTO_PREDETERMINADO, PREDETERMINADA, esColorHex } from '../theme.js';
import { cargarApariencia, guardarApariencia } from '../settings.js';
import { seccionRespaldos } from './respaldos.js';
import { seccionRecordatorios } from './recordatorios.js';

export { vistaInicio } from './inicio.js';
export { vistaEntrenar } from './entrenar.js';
export { vistaComida } from './comida.js';
export { vistaPeso } from './peso.js';

const ETIQUETAS_TEMA = { oscuro: 'Oscuro', claro: 'Claro', sistema: 'Según el sistema' };
const PREDEFINIDOS = ['#4ade80', '#38bdf8', '#f59e0b', '#f472b6', '#a78bfa', '#ef4444'];

export async function vistaAjustes() {
  let prefs = await cargarApariencia();
  const aviso = el('p', { class: 'muted', role: 'status' }, '');

  async function cambiar(parcial) {
    prefs = await guardarApariencia({ ...prefs, ...parcial });
    aplicarApariencia(prefs);
    aviso.textContent = 'Guardado.';
  }

  const temas = el('div', { class: 'opciones', role: 'radiogroup', 'aria-label': 'Tema' },
    TEMAS.map((t) => el('label', { class: 'opcion' },
      el('input', { type: 'radio', name: 'tema', value: t, checked: prefs.tema === t, onchange: () => cambiar({ tema: t }) }),
      ETIQUETAS_TEMA[t])));

  const selector = el('input', { type: 'color', value: prefs.acento, 'aria-label': 'Color de acento',
    onchange: (e) => { if (esColorHex(e.target.value)) cambiar({ acento: e.target.value }); } });

  const muestras = el('div', { class: 'muestras' },
    PREDEFINIDOS.map((c) => el('button', { type: 'button', class: 'muestra', style: `background:${c}`, 'aria-label': `Acento ${c}`,
      onclick: () => { selector.value = c; cambiar({ acento: c }); } })));

  return el('div', {},
    titulo('Ajustes'),
    tarjeta(el('h2', {}, 'Apariencia'),
      campo('Tema', temas),
      campo('Color de acento', selector),
      muestras,
      boton('Restablecer apariencia', async () => {
        selector.value = ACENTO_PREDETERMINADO;
        await cambiar(PREDETERMINADA);
        document.querySelector('input[name="tema"][value="oscuro"]').checked = true;
      }, { variante: 'secundario' }),
      aviso),
    await seccionRecordatorios(),
    await seccionRespaldos(() => { location.reload(); }));
}
