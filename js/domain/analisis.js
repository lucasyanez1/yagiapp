// Análisis semanal local. Lógica pura: no usa red ni modelos remotos y NUNCA modifica datos.
// Cada hallazgo y cada recomendación llevan su explicación; con pocos datos se declara "insuficiente".
import { aFecha, sumarDias, tendenciaPeso, promediosDiarios } from './peso.js';
import { volumenEntrenamiento, historialEjercicio, sugerirProgresion, tieneSeriesValidas } from './entrenamiento.js';
import { totalizar } from './nutricion.js';
import { formatearNumero, formatearFecha } from '../format.js';

const MIN_DIAS_NUTRICION = 3;
const fe = (s) => formatearFecha(s, { day: 'numeric', month: 'short' });
const n0 = (n) => formatearNumero(n, 0);
const n1 = (n) => formatearNumero(Math.round(n * 10) / 10, 1);
const signo = (n, f = n1) => `${n > 0 ? '+' : ''}${f(n)}`;
const enRango = (f, d, h) => f >= d && f <= h;
const suma = (xs) => xs.reduce((a, b) => a + b, 0);

// Último domingo (o hoy si es domingo): fin de la semana que se analiza automáticamente.
export const domingoPrevio = (hoy) => sumarDias(hoy, -aFecha(hoy).getDay());

// ¿Toca ejecutar el análisis automático? Sí si ya pasó un domingo que el último análisis no cubre.
export const correspondeAnalisisAutomatico = (hoy, ultimoHasta) => !ultimoHasta || ultimoHasta < domingoPrevio(hoy);

export function analizarSemana({ pesos = [], workouts = [], meals = [], hoy }) {
  const desde = sumarDias(hoy, -6);
  const [prevDesde, prevHasta] = [sumarDias(hoy, -13), sumarDias(hoy, -7)];
  const recomendaciones = [];
  const secciones = [];

  // ---- Peso ----
  {
    const t = tendenciaPeso(pesos, hoy);
    if (t.tipo === 'insuficiente') {
      secciones.push({ id: 'peso', titulo: 'Peso', estado: 'insuficiente', hallazgos: [{ texto: 'Datos insuficientes para evaluar la tendencia del peso.', explicacion: t.explicacion }] });
      if (t.actual.dias < 3) recomendaciones.push({ texto: 'Registra tu peso al menos 3 días por semana, a una hora parecida.', porque: `Esta semana tienes ${t.actual.dias} día(s) con peso; con menos de 3 el promedio no es fiable.` });
    } else {
      const frase = { sube: 'Tu peso promedio subió', baja: 'Tu peso promedio bajó', estable: 'Tu peso promedio se mantuvo estable' }[t.tipo];
      secciones.push({ id: 'peso', titulo: 'Peso', estado: 'ok', hallazgos: [{ texto: `${frase} (${signo(t.delta)} kg frente a la semana previa).`, explicacion: t.explicacion }] });
    }
  }

  // ---- Constancia de entrenamiento ----
  const ventana = (d, h) => workouts.filter((w) => enRango(w.date, d, h) && tieneSeriesValidas(w));
  const act = ventana(desde, hoy);
  const ant = ventana(prevDesde, prevHasta);
  {
    if (!act.length && !ant.length) {
      secciones.push({ id: 'constancia', titulo: 'Constancia', estado: 'insuficiente', hallazgos: [{ texto: 'Sin entrenamientos registrados en las últimas 2 semanas.', explicacion: 'No hay sesiones en los últimos 14 días, así que no se puede evaluar la constancia.' }] });
    } else {
      const dias = new Set(act.map((w) => w.date)).size;
      const diasAnt = new Set(ant.map((w) => w.date)).size;
      const h = [{ texto: `Entrenaste ${dias} día${dias === 1 ? '' : 's'} esta semana (${act.length} sesión${act.length === 1 ? '' : 'es'}).`, explicacion: `Se cuentan los días distintos con un entrenamiento entre el ${fe(desde)} y el ${fe(hoy)}.` }];
      if (ant.length) h.push({ texto: `La semana previa fueron ${diasAnt} día${diasAnt === 1 ? '' : 's'}.`, explicacion: `Ventana comparada: del ${fe(prevDesde)} al ${fe(prevHasta)}.` });
      secciones.push({ id: 'constancia', titulo: 'Constancia', estado: 'ok', hallazgos: h });
      if (!act.length && ant.length) recomendaciones.push({ texto: 'No registraste entrenamientos esta semana. Si fue una pausa planeada, ignora este aviso.', porque: `La semana previa registraste ${diasAnt} día(s) y en los últimos 7 días ninguno.` });
    }
  }

  // ---- Cargas y volumen ----
  {
    const hallazgos = [];
    const ids = new Map();
    for (const w of act) for (const e of w.ejercicios ?? []) ids.set(e.ejercicioId, e.nombre);
    for (const [id, nombre] of ids) {
      const h = historialEjercicio(workouts.filter((w) => w.date <= hoy), id);
      const enVentana = h.filter((s) => enRango(s.date, desde, hoy));
      if (!enVentana.length) continue;
      const previa = h.filter((s) => s.date < desde).at(-1);
      const mejor = Math.max(...enVentana.map((s) => s.mejorKg));
      if (previa) {
        const d = mejor - previa.mejorKg;
        hallazgos.push({ texto: `${nombre}: carga máxima ${n1(mejor)} kg (${d === 0 ? 'igual que' : `${signo(d)} kg frente a`} la sesión previa, ${n1(previa.mejorKg)} kg).`, explicacion: `Se compara la mayor carga con series válidas de esta semana con la de tu última sesión anterior (${fe(previa.date)}).` });
      } else {
        hallazgos.push({ texto: `${nombre}: primera referencia (${n1(mejor)} kg), aún sin sesión previa para comparar.`, explicacion: 'Se necesita al menos una sesión anterior al período para medir cambios.' });
      }
      if (h.length >= 2) {
        const s = sugerirProgresion(h);
        if (s.tipo !== 'insuficiente') recomendaciones.push({ texto: `${nombre}: próxima vez prueba ${n1(s.kg)} kg × ${s.reps}.`, porque: s.explicacion });
      }
    }
    const volA = suma(act.map(volumenEntrenamiento).filter((v) => v !== null));
    const volP = suma(ant.map(volumenEntrenamiento).filter((v) => v !== null));
    const hayA = act.some((w) => volumenEntrenamiento(w) !== null);
    const hayP = ant.some((w) => volumenEntrenamiento(w) !== null);
    if (hayA && hayP) {
      hallazgos.push({ texto: `Volumen total: ${n0(volA)} kg frente a ${n0(volP)} kg la semana previa (${signo(((volA - volP) / volP) * 100, n0)} %).`, explicacion: 'Volumen = suma de kg × repeticiones de las series con carga. Las series sin carga o sin repeticiones no se cuentan.' });
    }
    secciones.push(hallazgos.length
      ? { id: 'fuerza', titulo: 'Fuerza', estado: 'ok', hallazgos }
      : { id: 'fuerza', titulo: 'Fuerza', estado: 'insuficiente', hallazgos: [{ texto: 'Datos insuficientes para evaluar cambios de carga o volumen.', explicacion: 'No hay series con carga y repeticiones registradas esta semana.' }] });
  }

  // ---- Nutrición ----
  {
    const porDia = new Map();
    for (const m of meals.filter((x) => enRango(x.date, desde, hoy))) porDia.set(m.date, [...(porDia.get(m.date) ?? []), ...m.items]);
    const totales = [...porDia.values()].map(totalizar);
    const dias = porDia.size;
    if (dias < MIN_DIAS_NUTRICION) {
      secciones.push({ id: 'nutricion', titulo: 'Alimentación', estado: 'insuficiente', hallazgos: [{ texto: `Registraste comida ${dias} de 7 días: datos insuficientes para promediar.`, explicacion: `Se necesitan al menos ${MIN_DIAS_NUTRICION} días con registro; los días sin registro no se cuentan como 0.` }] });
      recomendaciones.push({ texto: 'Registra tus comidas más días de la semana para poder evaluar tu alimentación.', porque: `Solo hay ${dias} día(s) con registro; mínimo ${MIN_DIAS_NUTRICION}.` });
    } else {
      const prom = (c) => { const v = totales.map((t) => t[c]).filter((x) => x !== null); return v.length ? suma(v) / v.length : null; };
      const [kcal, prot] = [prom('kcal'), prom('proteina')];
      const parcial = totales.some((t) => t.parcial);
      const h = [{ texto: `Promedio por día registrado: ≈ ${kcal === null ? '—' : n0(kcal)} kcal y ≈ ${prot === null ? '—' : n1(prot)} g de proteína (${dias} días).`,
        explicacion: `Estimaciones con valores de referencia aproximados.${parcial ? ' Algunos ítems no tenían datos y no se sumaron, así que los valores reales pueden ser mayores.' : ''}` }];
      const pesoKg = promediosDiarios(pesos).filter((d) => d.date <= hoy).at(-1)?.kg ?? null;
      if (prot !== null && pesoKg !== null) {
        const gkg = prot / pesoKg;
        h.push({ texto: `Proteína ≈ ${formatearNumero(Math.round(gkg * 100) / 100, 2)} g por kg de peso.`, explicacion: `Se divide el promedio diario (${n1(prot)} g) por tu último peso (${n1(pesoKg)} kg). Orientación general en deporte de fuerza: alrededor de 1,4–2,0 g/kg; no es consejo médico ni dietético.` });
        if (gkg < 1.0 && !parcial) recomendaciones.push({ texto: 'Tu proteína registrada es baja respecto de tu peso; revisa si falta registrar alimentos o consulta a un profesional.', porque: `≈ ${formatearNumero(Math.round(gkg * 100) / 100, 2)} g/kg con ${dias} días completos registrados.` });
      }
      secciones.push({ id: 'nutricion', titulo: 'Alimentación', estado: 'ok', hallazgos: h });
    }
  }

  return { desde, hasta: hoy, secciones, recomendaciones, hayConclusiones: secciones.some((s) => s.estado === 'ok') };
}
