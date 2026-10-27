// Catálogo local de referencia. Valores por 100 g (o 100 ml × densidad), redondeados.
//
// PROCEDENCIA Y LIMITACIONES (ver docs/NUTRICION.md):
//  - Son aproximaciones escritas a mano, de memoria, SIN una fuente concreta por alimento. Varios
//    valores de alimentos comunes coinciden con tablas públicas como USDA FoodData Central
//    (dominio público), pero eso NO se comprobó uno a uno; los productos locales (marraqueta,
//    manjar, quesillo, etc.) no tienen fuente verificable. Estado: "no verificado".
//  - Marcas, cortes, cocción y porciones varían: úsalos como estimación y corrige lo que sepas.
//  - Los pesos por unidad/porción son referencias medias (p. ej. un huevo mediano ≈ 50 g).
//  - Un valor desconocido es null; nunca se rellena con 0.

export const VERSION_CATALOGO = 1;
export const ESTADO_CATALOGO = 'no verificado';

const a = (id, nombre, alias, kcal100, prot100, porciones = {}, extra = {}) =>
  ({ id, nombre, alias, kcal100, prot100, porciones, ...extra });

export const CATALOGO = [
  // Huevos y lácteos
  a('huevo', 'Huevo entero', ['huevo', 'huevo cocido', 'huevo duro'], 143, 12.6, { unidad: 50 }),
  a('leche-entera', 'Leche entera', ['leche', 'leche entera'], 61, 3.2, { vaso: 206, taza: 247 }, { densidad: 1.03 }),
  a('leche-descremada', 'Leche descremada', ['leche descremada', 'leche semidescremada', 'leche light'], 34, 3.4, { vaso: 206, taza: 247 }, { densidad: 1.03 }),
  a('yogur-natural', 'Yogur natural', ['yogur', 'yogurt', 'yogur natural'], 61, 3.5, { unidad: 125 }),
  a('yogur-griego', 'Yogur griego', ['yogur griego', 'yogurt griego'], 97, 9, { unidad: 150 }),
  a('queso-gauda', 'Queso gauda / laminado', ['queso', 'queso gauda', 'queso laminado'], 356, 25, { rebanada: 20, unidad: 20 }),
  a('queso-fresco', 'Queso fresco', ['queso fresco', 'quesillo'], 260, 17, { porcion: 50 }, { nota: 'Varía mucho según tipo y marca.' }),
  // Carnes, pescados y proteínas
  a('pollo-pechuga-cocida', 'Pechuga de pollo cocida', ['pollo', 'pechuga de pollo', 'pechuga', 'pollo cocido'], 165, 31, { filete: 120, porcion: 120 }),
  a('pollo-pechuga-cruda', 'Pechuga de pollo cruda', ['pollo crudo', 'pechuga cruda', 'pechuga de pollo cruda'], 120, 22.5, { filete: 150 }),
  a('vacuno-magro-cocido', 'Carne de vacuno magra cocida', ['carne', 'carne de vacuno', 'vacuno', 'bistec', 'lomo'], 205, 30, { filete: 130, porcion: 130 }, { nota: 'Muy variable según corte y grasa.' }),
  a('vacuno-molido-cocido', 'Carne molida de vacuno cocida', ['carne molida', 'molida'], 250, 26, { porcion: 100 }, { nota: 'Muy variable según % de grasa.' }),
  a('pavo-pechuga', 'Pechuga de pavo cocida', ['pavo', 'pechuga de pavo'], 135, 30, { rebanada: 20, porcion: 100 }),
  a('jamon', 'Jamón cocido', ['jamon', 'jamon cocido', 'jamon de pavo'], 120, 18, { rebanada: 15 }, { nota: 'Varía según tipo y marca.' }),
  a('salmon-cocido', 'Salmón cocido', ['salmon'], 206, 22, { filete: 150, porcion: 150 }),
  a('atun-agua', 'Atún en agua (escurrido)', ['atun', 'atun en agua', 'atun en lata'], 116, 25.5, { unidad: 120 }, { nota: 'Una lata típica escurrida pesa unos 120 g.' }),
  a('merluza-cocida', 'Merluza cocida', ['merluza', 'pescado', 'pescado blanco'], 105, 21, { filete: 150, porcion: 150 }),
  a('camaron-cocido', 'Camarón cocido', ['camaron', 'camarones'], 99, 24, {}),
  a('tofu', 'Tofu', ['tofu'], 76, 8, { porcion: 100 }),
  a('salchicha', 'Salchicha / vienesa', ['salchicha', 'vienesa', 'vienesas'], 300, 11, { unidad: 40 }, { nota: 'Varía mucho según marca.' }),
  a('proteina-polvo', 'Proteína en polvo (suero)', ['proteina', 'proteina en polvo', 'whey', 'scoop'], 400, 78, { porcion: 30, unidad: 30 }, { nota: 'Varía mucho por marca; mejor crea un alimento personalizado con tu etiqueta.' }),
  // Cereales, pan y legumbres
  a('arroz-cocido', 'Arroz cocido', ['arroz', 'arroz cocido', 'arroz blanco'], 130, 2.7, { taza: 160, porcion: 150 }),
  a('arroz-crudo', 'Arroz crudo', ['arroz crudo'], 360, 6.6, { taza: 185 }),
  a('fideos-cocidos', 'Fideos cocidos', ['fideos', 'fideo', 'pasta', 'tallarines', 'espagueti', 'fideos cocidos'], 158, 5.8, { taza: 140, porcion: 200 }),
  a('fideos-crudos', 'Fideos crudos', ['fideos crudos', 'pasta cruda', 'tallarines crudos'], 371, 13, { porcion: 80 }),
  a('quinoa-cocida', 'Quinoa cocida', ['quinoa', 'quinua'], 120, 4.4, { taza: 185 }),
  a('avena', 'Avena en hojuelas', ['avena', 'hojuelas de avena'], 389, 16.9, { cucharada: 10, taza: 90 }),
  a('marraqueta', 'Pan marraqueta / hallulla', ['pan', 'marraqueta', 'hallulla', 'pan frances'], 270, 9, { unidad: 90 }, { nota: 'Una marraqueta entera suele pesar 80–110 g (media = 0,5 unidad).' }),
  a('pan-molde', 'Pan de molde', ['pan de molde', 'pan molde', 'pan blanco de molde'], 265, 9, { rebanada: 28, unidad: 28 }),
  a('pan-integral', 'Pan integral de molde', ['pan integral'], 252, 12.5, { rebanada: 28, unidad: 28 }),
  a('papa-cocida', 'Papa cocida', ['papa', 'papas', 'patata', 'papa cocida'], 87, 1.9, { unidad: 150 }),
  a('camote-cocido', 'Camote cocido', ['camote', 'batata'], 90, 2, { unidad: 130 }),
  a('lentejas-cocidas', 'Lentejas cocidas', ['lenteja', 'lentejas', 'lentejas cocidas'], 116, 9, { taza: 198, porcion: 200 }),
  a('porotos-cocidos', 'Porotos cocidos', ['poroto', 'porotos', 'frijoles'], 127, 8.7, { taza: 177, porcion: 200 }),
  a('garbanzos-cocidos', 'Garbanzos cocidos', ['garbanzo', 'garbanzos'], 164, 8.9, { taza: 164, porcion: 150 }),
  // Frutas
  a('platano', 'Plátano', ['platano', 'banana', 'banano'], 89, 1.1, { unidad: 120 }),
  a('manzana', 'Manzana', ['manzana'], 52, 0.3, { unidad: 180 }),
  a('naranja', 'Naranja', ['naranja'], 47, 0.9, { unidad: 150 }),
  a('frutilla', 'Frutilla', ['frutilla', 'fresa'], 32, 0.7, { taza: 150 }),
  a('uva', 'Uva', ['uva'], 69, 0.7, { taza: 150 }),
  a('palta', 'Palta (pulpa)', ['palta', 'aguacate'], 160, 2, { unidad: 140, cucharada: 30 }, { nota: 'Peso de la pulpa; una palta mediana ronda 100–180 g.' }),
  // Verduras
  a('tomate', 'Tomate', ['tomate'], 18, 0.9, { unidad: 120 }),
  a('lechuga', 'Lechuga', ['lechuga'], 15, 1.4, { taza: 50 }),
  a('zanahoria', 'Zanahoria', ['zanahoria'], 41, 0.9, { unidad: 70 }),
  a('brocoli-cocido', 'Brócoli cocido', ['brocoli'], 35, 2.4, { taza: 156 }),
  a('cebolla', 'Cebolla', ['cebolla'], 40, 1.1, { unidad: 110 }),
  a('pepino', 'Pepino', ['pepino'], 15, 0.7, { unidad: 200 }),
  a('zapallo-italiano', 'Zapallo italiano', ['zapallo italiano', 'zapallito', 'zucchini'], 17, 1.2, { unidad: 200 }),
  // Grasas, frutos secos, dulces
  a('aceite-oliva', 'Aceite de oliva', ['aceite', 'aceite de oliva'], 884, 0, { cucharada: 14, cucharadita: 4.5 }, { densidad: 0.91 }),
  a('mantequilla', 'Mantequilla', ['mantequilla'], 717, 0.9, { cucharada: 14, cucharadita: 5 }),
  a('mani', 'Maní', ['mani', 'cacahuate'], 567, 25.8, { cucharada: 10 }),
  a('almendras', 'Almendras', ['almendra', 'almendras'], 579, 21.2, { cucharada: 10 }),
  a('nueces', 'Nueces', ['nuez', 'nueces'], 654, 15.2, { unidad: 5 }),
  a('mantequilla-mani', 'Mantequilla de maní', ['mantequilla de mani', 'crema de mani'], 588, 25, { cucharada: 16 }),
  a('azucar', 'Azúcar', ['azucar'], 387, 0, { cucharadita: 4, cucharada: 12 }),
  a('miel', 'Miel', ['miel'], 304, 0.3, { cucharadita: 7, cucharada: 21 }),
  a('manjar', 'Manjar (dulce de leche)', ['manjar', 'dulce de leche'], 315, 7, { cucharada: 20, cucharadita: 7 }),
  // Bebidas
  a('jugo-naranja', 'Jugo de naranja', ['jugo de naranja', 'jugo'], 45, 0.7, { vaso: 208, taza: 249 }, { densidad: 1.04 }),
  a('bebida-cola', 'Bebida cola', ['bebida', 'coca cola', 'bebida cola', 'gaseosa'], 42, 0, { vaso: 208 }, { densidad: 1.04 }),
  a('cafe', 'Café sin azúcar', ['cafe', 'cafe solo'], 1, 0.1, { taza: 237 }, { densidad: 1 }),
  a('te', 'Té sin azúcar', ['te', 'te negro', 'infusion'], 0, 0, { taza: 237 }, { densidad: 1 }),
];
