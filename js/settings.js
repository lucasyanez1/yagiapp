import { obtener, guardar } from './db.js';
import { normalizarApariencia } from './theme.js';

export async function cargarApariencia() {
  return normalizarApariencia((await obtener('settings', 'apariencia'))?.value);
}

export async function guardarApariencia(prefs) {
  const value = normalizarApariencia(prefs);
  await guardar('settings', { key: 'apariencia', value });
  return value;
}
