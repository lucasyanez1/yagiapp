import { el } from './ui/components.js';
import { mostrarError } from './errors.js';
import { vistaInicio, vistaEntrenar, vistaComida, vistaPeso, vistaAjustes } from './ui/vistas.js';
export const RUTAS = [
  { ruta: '/inicio', texto: 'Inicio', vista: vistaInicio },
  { ruta: '/entrenar', texto: 'Entrenar', vista: vistaEntrenar },
  { ruta: '/comida', texto: 'Comida', vista: vistaComida },
  { ruta: '/peso', texto: 'Peso', vista: vistaPeso },
  { ruta: '/ajustes', texto: 'Ajustes', vista: vistaAjustes },
];

export function rutaActual(hash = location.hash) {
  const r = hash.replace(/^#/, '') || '/inicio';
  return RUTAS.find((x) => x.ruta === r) ?? RUTAS[0];
}

export function iniciarRouter(contenedor, nav) {
  nav.replaceChildren(...RUTAS.map((r) => el('a', { href: `#${r.ruta}`, 'data-ruta': r.ruta }, r.texto)));
  async function pintar() {
    const actual = rutaActual();
    for (const a of nav.children) {
      if (a.dataset.ruta === actual.ruta) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    try {
      contenedor.replaceChildren(await actual.vista());
    } catch (e) {
      // Un dato dañado en una pantalla no debe dejar la app inutilizable: la navegación sigue activa
      // (p. ej. para ir a Ajustes a restaurar un respaldo o borrar los datos).
      contenedor.replaceChildren();
      mostrarError(contenedor, `No se pudo mostrar esta pantalla (${e.message}). Tus otros datos no se tocaron; revisa Ajustes → Copias de seguridad.`);
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', pintar);
  return pintar();
}
