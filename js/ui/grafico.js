// Gráfico de líneas en SVG, sin librerías. Los puntos ausentes simplemente no se dibujan (nunca como 0).
import { el } from './components.js';
import { formatearFecha, formatearNumero } from '../format.js';

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};
const tiempo = (f) => { const [y, m, d] = f.split('-').map(Number); return Date.UTC(y, m - 1, d); };

// puntos: [{ x: 'AAAA-MM-DD', y: número }]
export function graficoLinea(puntos, { titulo = 'Gráfico', decimales = 1 } = {}) {
  const pts = puntos.filter((p) => p && typeof p.y === 'number' && Number.isFinite(p.y)).sort((a, b) => a.x.localeCompare(b.x));
  if (!pts.length) return el('p', { class: 'muted' }, 'Sin datos para graficar.');
  const W = 320, H = 170, ml = 44, mr = 12, mt = 12, mb = 26;
  let [x0, x1] = [tiempo(pts[0].x), tiempo(pts.at(-1).x)];
  if (x0 === x1) { x0 -= 864e5; x1 += 864e5; }
  let [y0, y1] = [Math.min(...pts.map((p) => p.y)), Math.max(...pts.map((p) => p.y))];
  const pad = (y1 - y0) * 0.1 || Math.max(1, Math.abs(y0) * 0.05);
  y0 -= pad; y1 += pad;
  const X = (f) => ml + ((tiempo(f) - x0) / (x1 - x0)) * (W - ml - mr);
  const Y = (v) => mt + (1 - (v - y0) / (y1 - y0)) * (H - mt - mb);

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': titulo, class: 'grafico' });
  svg.append(Object.assign(s('title'), { textContent: titulo }));
  for (const v of [y0 + pad, y1 - pad]) {
    svg.append(s('line', { x1: ml, x2: W - mr, y1: Y(v), y2: Y(v), class: 'guia' }));
    const t = s('text', { x: ml - 4, y: Y(v) + 3, 'text-anchor': 'end' });
    t.textContent = formatearNumero(v, decimales);
    svg.append(t);
  }
  if (pts.length > 1) svg.append(s('polyline', { class: 'linea', points: pts.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ') }));
  for (const p of pts) {
    const c = s('circle', { cx: X(p.x), cy: Y(p.y), r: 3.5, class: 'punto' });
    c.append(Object.assign(s('title'), { textContent: `${formatearFecha(p.x)}: ${formatearNumero(p.y, decimales)}` }));
    svg.append(c);
  }
  const corto = { day: 'numeric', month: 'short' };
  [[pts[0].x, 'start', ml], [pts.at(-1).x, 'end', W - mr]].forEach(([f, anchor, x], i) => {
    if (i === 1 && pts.length === 1) return;
    const t = s('text', { x, y: H - 8, 'text-anchor': pts.length === 1 ? 'middle' : anchor });
    if (pts.length === 1) t.setAttribute('x', X(f));
    t.textContent = formatearFecha(f, corto);
    svg.append(t);
  });
  return svg;
}
