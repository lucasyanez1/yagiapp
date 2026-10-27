// Manejo global de errores: muestra un mensaje en español sin enviar nada fuera del dispositivo.

const registro = [];

export function errores() {
  return registro.slice();
}

export function mostrarError(el, mensaje) {
  const div = document.createElement('div');
  div.className = 'error';
  div.setAttribute('role', 'alert');
  div.textContent = mensaje;
  el.prepend(div);
}

export function instalarManejadorGlobal(el) {
  const manejar = (err) => {
    const msg = err?.message ?? String(err);
    registro.push({ cuando: new Date().toISOString(), msg });
    if (registro.length > 50) registro.shift();
    mostrarError(el, `Ocurrió un error: ${msg}`);
  };
  window.addEventListener('error', (e) => manejar(e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => manejar(e.reason));
}
