// Temas: oscuro (predeterminado), claro, sistema; color de acento personalizable.
export const ACENTO_PREDETERMINADO = '#4ade80';
export const TEMAS = ['oscuro', 'claro', 'sistema'];
export const PREDETERMINADA = { tema: 'oscuro', acento: ACENTO_PREDETERMINADO };

export const esColorHex = (c) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);

// Normaliza preferencias guardadas (posiblemente corruptas o importadas).
export function normalizarApariencia(v) {
  return {
    tema: TEMAS.includes(v?.tema) ? v.tema : PREDETERMINADA.tema,
    acento: esColorHex(v?.acento) ? v.acento.toLowerCase() : PREDETERMINADA.acento,
  };
}

function luminancia(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

// Relación de contraste WCAG entre dos colores #rrggbb (1 a 21).
export function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Texto (oscuro o blanco) con mayor contraste sobre el acento.
export const textoSobre = (hex) => (contraste(hex, '#0f1115') >= contraste(hex, '#ffffff') ? '#0f1115' : '#ffffff');

export function resolverTema(tema, sistemaOscuro) {
  if (tema === 'sistema') return sistemaOscuro ? 'oscuro' : 'claro';
  return tema === 'claro' ? 'claro' : 'oscuro';
}

export function aplicarApariencia(prefs) {
  const p = normalizarApariencia(prefs);
  const oscuro = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  const real = resolverTema(p.tema, oscuro);
  const raiz = document.documentElement;
  raiz.dataset.theme = real;
  raiz.style.setProperty('--acento', p.acento);
  raiz.style.setProperty('--acento-fg', textoSobre(p.acento));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', real === 'oscuro' ? '#0f1115' : '#f5f6f8');
}
