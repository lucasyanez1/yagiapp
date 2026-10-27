import { el, tarjeta, boton, campo } from './components.js';
import { exportarJSON, exportarCSV, parsearRespaldo, resumir, restaurar, borrarTodo, entregarArchivo, MAX_BYTES } from '../backup.js';
import { obtener, guardar } from '../db.js';
import { fechaLocalHoy } from '../schema.js';
import { formatearFecha } from '../format.js';
import { cargarApariencia } from '../settings.js';
import { aplicarApariencia } from '../theme.js';

const ETIQUETAS = { settings: 'Ajustes', exercises: 'Ejercicios', workouts: 'Entrenamientos', foods: 'Alimentos', meals: 'Comidas', weights: 'Pesos' };
const CSV_DISPONIBLES = ['workouts', 'exercises', 'meals', 'foods', 'weights'];

export async function seccionRespaldos(alRestaurar = () => {}) {
  const estado = el('p', { role: 'status' }, '');
  const ultimo = el('p', { class: 'muted' }, '');
  const zonaImport = el('div', {});
  const say = (m, error = false) => { estado.textContent = m; estado.className = error ? 'error' : 'muted'; };

  async function pintarUltimo() {
    const r = (await obtener('settings', 'ultimoRespaldo'))?.value;
    ultimo.textContent = r ? `Último respaldo: ${formatearFecha(r)}` : 'Aún no has hecho ningún respaldo. Los datos solo existen en este dispositivo.';
  }
  await pintarUltimo();

  const tipoCSV = el('select', { 'aria-label': 'Datos a exportar en CSV' },
    CSV_DISPONIBLES.map((k) => el('option', { value: k }, ETIQUETAS[k])));

  // Dos pasos: primero se prepara el archivo y luego un segundo toque lo comparte. Así la hoja de
  // compartir se abre dentro de un gesto reciente del usuario (iOS lo exige) y no se marca el respaldo
  // como hecho hasta saber que el archivo salió.
  const entrega = el('div', {});
  async function terminarRespaldo() {
    await guardar('settings', { key: 'ultimoRespaldo', value: fechaLocalHoy() });
    await pintarUltimo();
    entrega.replaceChildren();
    say('Respaldo registrado. Guarda el archivo en un lugar seguro (Archivos, iCloud Drive, etc.).');
  }
  function ofrecer(nombre, texto, mime, esRespaldo) {
    say('');
    entrega.replaceChildren(
      el('p', { class: 'muted' }, `Archivo listo: ${nombre}`),
      boton('Compartir o guardar archivo', async () => {
        const r = await entregarArchivo(nombre, texto, mime);
        if (r === 'cancelado') return say('Cancelado. El archivo sigue listo.');
        if (r === 'compartido') return esRespaldo ? terminarRespaldo() : (entrega.replaceChildren(), say('Listo.'));
        entrega.replaceChildren(
          el('p', { class: 'muted' }, 'Se inició una descarga. Comprueba que el archivo quedó guardado (Archivos o Descargas); esta app no puede confirmarlo.'),
          esRespaldo ? boton('Ya guardé el archivo', terminarRespaldo, { variante: 'secundario' }) : null);
      }));
  }
  const exportarJ = boton('Preparar respaldo (JSON)', async () => {
    ofrecer(`fitness-respaldo-${fechaLocalHoy()}.json`, await exportarJSON(), 'application/json', true);
  });
  const exportarC = boton('Preparar CSV', async () => {
    ofrecer(`fitness-${tipoCSV.value}-${fechaLocalHoy()}.csv`, await exportarCSV(tipoCSV.value), 'text/csv', false);
  }, { variante: 'secundario' });
  const persistencia = el('p', { class: 'muted' }, '');
  navigator.storage?.persisted?.().then((p) => {
    persistencia.textContent = p
      ? 'Almacenamiento persistente: activo.'
      : 'Almacenamiento persistente: no garantizado. iOS podría borrar los datos si falta espacio o dejas de usar la app; haz respaldos con frecuencia.';
  }).catch(() => {});

  const archivo = el('input', { type: 'file', accept: 'application/json,.json', 'aria-label': 'Archivo de respaldo',
    onchange: async (e) => {
      zonaImport.replaceChildren();
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > MAX_BYTES) return say('El archivo es demasiado grande.', true);
      const r = parsearRespaldo(await f.text());
      if (!r.ok) {
        say('Archivo rechazado. No se modificó nada.', true);
        zonaImport.append(el('ul', { class: 'error' }, r.errores.map((x) => el('li', {}, x))));
        return;
      }
      say('');
      const cuentas = resumir(r.respaldo);
      zonaImport.append(
        el('p', {}, 'Respaldo válido. Contiene: ', Object.entries(cuentas).filter(([, n]) => n).map(([k, n]) => `${ETIQUETAS[k]}: ${n}`).join(', ') || 'sin registros', '.'),
        el('p', { class: 'muted' }, 'Restaurar REEMPLAZA todos los datos actuales de este dispositivo.'),
        boton('Restaurar y reemplazar mis datos', async (ev) => {
          ev.target.disabled = true;
          try {
            await restaurar(r.respaldo);
            aplicarApariencia(await cargarApariencia());
            zonaImport.replaceChildren();
            archivo.value = '';
            say('Respaldo restaurado.');
            alRestaurar();
          } catch (err) { say(`No se pudo restaurar: ${err.message}. Tus datos no cambiaron.`, true); ev.target.disabled = false; }
        }));
    } });

  const confirmacion = el('input', { type: 'text', autocomplete: 'off', placeholder: 'BORRAR', 'aria-label': 'Escribe BORRAR para confirmar' });
  const borrar = boton('Borrar todos mis datos', async () => {
    if (confirmacion.value.trim() !== 'BORRAR') return say('Escribe BORRAR para confirmar.', true);
    await borrarTodo();
    confirmacion.value = '';
    aplicarApariencia(await cargarApariencia());
    await pintarUltimo();
    say('Todos los datos fueron eliminados de este dispositivo.');
    alRestaurar();
  }, { variante: 'secundario' });

  return tarjeta(
    el('h2', {}, 'Copias de seguridad'),
    ultimo, persistencia,
    exportarJ,
    campo('Exportar como CSV', tipoCSV), exportarC,
    entrega,
    el('p', { class: 'muted' }, 'Los respaldos son archivos de texto SIN cifrar: quien los abra podrá leer tus datos. Si los guardas en iCloud u otra nube, tú decides ese traspaso.'),
    campo('Importar respaldo (JSON)', archivo, 'Se valida antes de tocar tus datos.'),
    zonaImport,
    el('hr', {}),
    el('h2', {}, 'Borrar datos'),
    el('p', { class: 'muted' }, 'Elimina todo de este dispositivo. No se puede deshacer; exporta un respaldo antes.'),
    campo('Confirmación', confirmacion), borrar,
    estado);
}
