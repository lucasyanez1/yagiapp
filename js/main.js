import { abrirDB, pedirPersistencia } from './db.js';
import { instalarManejadorGlobal, mostrarError } from './errors.js';
import { cargarApariencia } from './settings.js';
import { aplicarApariencia } from './theme.js';
import { iniciarRouter } from './router.js';
import { ejecutarAutomaticoSiCorresponde } from './analisis.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');
instalarManejadorGlobal(app);

async function iniciar() {
  try {
    await abrirDB();
    const prefs = await cargarApariencia();
    aplicarApariencia(prefs);
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', async () => aplicarApariencia(await cargarApariencia()));
    await pedirPersistencia();
    try { await ejecutarAutomaticoSiCorresponde(); } catch { /* el análisis nunca debe impedir abrir la app */ }
    await iniciarRouter(app, nav);
  } catch (e) {
    app.replaceChildren();
    mostrarError(app, `No se pudo abrir el almacenamiento local: ${e.message}`);
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

iniciar();
