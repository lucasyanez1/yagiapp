// Componentes visuales reutilizables. Todo el texto entra por textContent (sin innerHTML).
export function el(tag, atributos = {}, ...hijos) {
  const nodo = document.createElement(tag);
  for (const [k, v] of Object.entries(atributos)) {
    if (v === false || v == null) continue;
    if (k.startsWith('on') && typeof v === 'function') nodo.addEventListener(k.slice(2), v);
    else if (k === 'class') nodo.className = v;
    else nodo.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat()) {
    if (h == null || h === false) continue;
    nodo.append(h instanceof Node ? h : document.createTextNode(String(h)));
  }
  return nodo;
}

export const titulo = (texto) => el('h1', {}, texto);
export const tarjeta = (...hijos) => el('section', { class: 'tarjeta' }, ...hijos);

// Estado vacío: explica qué falta y cuándo estará disponible; no incluye botones que no funcionan.
export function estadoVacio(encabezado, detalle) {
  return el('div', { class: 'vacio' }, el('h2', {}, encabezado), el('p', { class: 'muted' }, detalle));
}

export function boton(texto, onclick, { variante = 'primario', tipo = 'button' } = {}) {
  return el('button', { class: `btn ${variante}`, type: tipo, onclick }, texto);
}

export function campo(etiqueta, input, ayuda) {
  return el('label', { class: 'campo' }, el('span', {}, etiqueta), input, ayuda && el('small', { class: 'muted' }, ayuda));
}
