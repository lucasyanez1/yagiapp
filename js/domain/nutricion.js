// Interpretación de texto en español y cálculo de calorías/proteínas. Lógica pura.
// Principio: lo que no se sabe es null y se declara; nunca se rellena con 0.

// En Chile el punto agrupa miles ("1.000 g") y la coma es decimal ("1,5 kg"). Los miles se resuelven
// ANTES de convertir la coma decimal en punto.
export const normalizar = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\b([1-9]\d{0,2})\.(\d{3})\b/g, '$1$2').replace(/(\d),(\d)/g, '$1.$2')
  .replace(/[^a-z0-9/.,;+\s]/g, ' ').replace(/\s+/g, ' ').trim();

const PALABRAS = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, medio: 0.5, media: 0.5 };
const RELLENO = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'con', 'en', 'unos', 'unas']);

const UNIDADES = {};
for (const [canon, nombres] of Object.entries({
  g: ['g', 'gr', 'grs', 'gramo', 'gramos'], kg: ['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'],
  ml: ['ml', 'cc', 'mililitro', 'mililitros'], l: ['l', 'lt', 'litro', 'litros'],
  taza: ['taza', 'tazas'], vaso: ['vaso', 'vasos'], cucharada: ['cucharada', 'cucharadas', 'cda', 'cdas'],
  cucharadita: ['cucharadita', 'cucharaditas', 'cdta', 'cdtas'], unidad: ['unidad', 'unidades'],
  rebanada: ['rebanada', 'rebanadas', 'tajada', 'tajadas', 'lonja', 'lonjas', 'loncha', 'lonchas'],
  porcion: ['porcion', 'porciones'], filete: ['filete', 'filetes'],
})) for (const n of nombres) UNIDADES[n] = canon;

export function singular(p) {
  if (p.length <= 3) return p;
  if (p.endsWith('ces')) return `${p.slice(0, -3)}z`;
  if (/[lrndj]es$/.test(p)) return p.slice(0, -2);
  if (p.endsWith('s') && !/(is|us)$/.test(p)) return p.slice(0, -1);
  return p;
}

const tokensNombre = (s) => normalizar(s).split(' ').filter((t) => t && !RELLENO.has(t)).map(singular);

const fraccion = (txt) => { const [n, d] = txt.split('/').map(Number); return d ? n / d : NaN; };

// Separa "2 huevos y 150 g de arroz, 1 vaso de leche" en segmentos.
export function dividir(texto) {
  return normalizar(texto).split(/\s*(?:,|;|\+|\n)\s*|\s+y\s+/).map((s) => s.trim()).filter(Boolean);
}

function leerCantidad(seg) {
  let m = seg.match(/^(\d+)\s+(\d+\/\d+)\s*(.*)$/);
  if (m) return { qty: Number(m[1]) + fraccion(m[2]), resto: m[3] };
  m = seg.match(/^(\d+\/\d+)\s*(.*)$/);
  if (m) return { qty: fraccion(m[1]), resto: m[2] };
  m = seg.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (m) return { qty: Number(m[1]), resto: m[2] };
  const [primero, ...otros] = seg.split(' ');
  if (primero in PALABRAS) return { qty: PALABRAS[primero], resto: otros.join(' ') };
  return { qty: null, resto: seg };
}

function buscarAlimento(nombreTokens, catalogo) {
  const set = new Set(nombreTokens);
  let mejor = null;
  const empatados = [];
  for (const f of catalogo) {
    for (const alias of [f.nombre, ...(f.alias ?? [])]) {
      const at = tokensNombre(alias);
      if (!at.length || !at.every((t) => set.has(t))) continue;
      const score = at.length * 10 + (at.length === set.size ? 5 : 0) + (f.personalizado ? 1 : 0);
      if (!mejor || score > mejor.score) { mejor = { f, score, at }; empatados.length = 0; }
      else if (score === mejor.score && f.id !== mejor.f.id && !empatados.includes(f)) empatados.push(f);
    }
  }
  return mejor && { ...mejor, empatados };
}

function aGramos(qty, unidad, f) {
  if (unidad === 'g') return { g: qty, precision: 'gramos' };
  if (unidad === 'kg') return { g: qty * 1000, precision: 'gramos' };
  if (unidad === 'ml' || unidad === 'l') {
    const ml = unidad === 'l' ? qty * 1000 : qty;
    return f.densidad ? { g: ml * f.densidad, precision: 'porcion' } : null;
  }
  const por = f.porciones?.[unidad];
  return por ? { g: qty * por, precision: 'porcion' } : null;
}

const calc = (g, por100) => (g == null || por100 == null ? null : (g / 100) * por100);

// Interpreta un texto libre. Cada ítem trae sus avisos en `notas`.
export function interpretarComida(texto, catalogo) {
  return dividir(texto).map((seg) => {
    const { qty: q0, resto } = leerCantidad(seg);
    let toks = resto.split(' ').filter(Boolean);
    let unidad = null;
    if (toks.length && UNIDADES[toks[0]]) { unidad = UNIDADES[toks.shift()]; }
    while (toks.length && RELLENO.has(toks[0]) && toks[0] !== 'un') toks.shift();
    const nombre = toks.join(' ');
    const notas = [];
    const item = { texto: seg, nombre: nombre || seg, foodId: null, origen: null, cantidad: q0, unidad, gramos: null, kcal: null, proteina: null, precision: null, estado: 'ok', notas };

    const hallado = nombre ? buscarAlimento(tokensNombre(nombre), catalogo) : null;
    if (!hallado) {
      item.estado = 'sin_alimento';
      notas.push('No está en el catálogo: escribe los valores a mano o crea un alimento personalizado.');
      return item;
    }
    const f = hallado.f;
    Object.assign(item, { nombre: f.nombre, foodId: f.id, origen: f.personalizado ? 'personalizado' : 'catalogo' });
    const extra = tokensNombre(nombre).filter((t) => !hallado.at.includes(t));
    if (extra.length) notas.push(`Se interpretó como "${f.nombre}"; no se consideró: ${extra.join(' ')}. Revisa los valores.`);
    if (hallado.empatados.length) notas.push(`También podría ser: ${hallado.empatados.map((x) => x.nombre).join(', ')}.`);
    if (f.nota) notas.push(f.nota);

    let qty = q0;
    let supuesto = false;
    if (qty === null) { qty = 1; supuesto = !unidad; }
    const u = unidad ?? 'unidad';
    const conv = aGramos(qty, u, f);
    if (!conv) {
      item.estado = 'sin_cantidad';
      notas.push(q0 === null && !unidad
        ? 'No indicaste la cantidad: escribe gramos (p. ej. "150 g de ...") o completa los valores a mano.'
        : `No sé cuántos gramos son "${u}" de ${f.nombre.toLowerCase()}: usa gramos o completa a mano.`);
      return item;
    }
    if (supuesto) notas.push('Sin cantidad: se supuso 1 unidad.');
    item.cantidad = qty;
    item.unidad = u;
    item.gramos = conv.g;
    item.precision = supuesto ? 'supuesto' : conv.precision;
    item.kcal = calc(conv.g, f.kcal100);
    item.proteina = calc(conv.g, f.prot100);
    if (item.precision !== 'gramos') notas.push('Estimado a partir de un peso medio por porción; pesa el alimento para más precisión.');
    return item;
  });
}

// Suma solo lo conocido. `parcial` indica que algún ítem no tiene valor y NO se contó (no es 0).
export function totalizar(items) {
  const suma = (campo) => {
    const v = items.map((i) => i[campo]).filter((x) => typeof x === 'number' && Number.isFinite(x));
    return v.length ? v.reduce((a, b) => a + b, 0) : null;
  };
  const incompletos = items.filter((i) => !Number.isFinite(i.kcal) || !Number.isFinite(i.proteina)).length;
  return { kcal: suma('kcal'), proteina: suma('proteina'), incompletos, parcial: incompletos > 0 };
}
