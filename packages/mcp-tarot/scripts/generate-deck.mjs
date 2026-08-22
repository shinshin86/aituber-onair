
import fs from 'node:fs';
import path from 'node:path';

const majors = [
  ['el_loco','El Loco','Inocencia, inicio, aventura','Cuidado, imprudencia, inestabilidad'],
  ['la_suma_sacerdotisa','La Suma Sacerdotisa','Misterio, intuicion, subconsciente','Secretos revelados, desconexion'],
  ['la_suma_sacerdotiza','La Suma Sacerdotiza','Autoridad, maternidad, espiritualidad','Manipulacion, rigidez'],
  ['la_emperatriz','La Emperatriz','Abundancia, fertilidad, creatividad','Dependencia, creatividad bloqueada'],
  ['el_emperador','El Emperador','Estructura, poder, estabilidad','Rigidez, tirania'],
  ['el_sacerdote','El Sacerdote','Tradiciones, guia, valores','Dogma, rebeldia contra normas'],
  ['los_enamorados','Los Enamorados','Eleccion, union, armonia','Desequilibrio, eleccion dificil'],
  ['el_carro','El Carro','Voluntad, victoria, control','Falta de direccion, agresion'],
  ['la_fortaleza','La Fortaleza','Coraje, compasion, fuerza interior','Miedo, impulsividad'],
  ['el_ermitano','El Ermitano','Introspeccion, sabiduria, soledad','Aislamiento, amargura'],
  ['la_rueda_de_la_fortuna','La Rueda de la Fortuna','Cambio, destino, ciclo','Pérdida de control, mala racha'],
  ['la_justicia','La Justicia','Equilibrio, verdad, causa-efecto','Injusticia, desequilibrio'],
  ['el_ahorcado','El Ahorcado','Perspectiva, sacrificio, pausa','Sacrificio vacuo, estancamiento'],
  ['la_muerte','La Muerte','Transformacion, fin, renacimiento','Resistencia al cambio'],
  ['la_templanza','La Templanza','Paciencia, moderacion, fe','Exceso, falta de equilibrio'],
  ['el_diablo','El Diablo','Deseo, tentacion, sombras','Liberacion, romper cadenas'],
  ['la_torre','La Torre','Caos, revelacion, cambio subito','Evitar el colapso, miedo'],
  ['la_estrella','La Estrella','Esperanza, renovacion, inspiracion','Desaliento, falta de fe'],
  ['la_luna','La Luna','Ilusion, suenos, inconsciente','Claridad, salir de la confusion'],
  ['el_sol','El Sol','Exito, alegria, vitalidad','Optimismo nublado'],
  ['el_juzgamiento','El Juicio','Despertar, llamada, renacimiento','Duda, autocritica excesiva'],
  ['el_mundo','El Mundo','Completude, logro, integracion','Falta de cierre, limitacion']
];

const suits = {
  wands: { es: 'Bastos', element: 'fuego' },
  cups: { es: 'Copas', element: 'agua' },
  swords: { es: 'Espadas', element: 'aire' },
  pentacles: { es: 'Oros', element: 'tierra' }
};
const numbers = ['as','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez'];
const numberNames = ['As','Dos','Tres','Cuatro','Cinco','Seis','Siete','Ocho','Nueve','Diez'];
const faces = [ ['caballo','Caballo'], ['rey','Rey'], ['reina','Reina'], ['jota','Jota'] ];

const cards = [];
for (const [id, name, up, rev] of majors) {
  cards.push({ id, name, arcanum: 'major', number: cards.length,
    upright_meaning: up, reversed_meaning: rev,
    keywords: up.split(',').map(s => s.trim().toLowerCase()),
    texture_front: `/cards/front/${id}.webp`, texture_back: '/cards/back.webp' });
}
for (const [suit, meta] of Object.entries(suits)) {
  for (let n = 1; n <= 14; n++) {
    let id, name;
    if (n <= 10) {
      id = `${numbers[n-1]}_de_${meta.es.toLowerCase()}`;
      name = `${numberNames[n-1]} de ${meta.es}`;
    } else {
      const [fid, fname] = faces[n-11];
      id = `${fid}_de_${meta.es.toLowerCase()}`;
      name = `${fname} de ${meta.es}`;
    }
    cards.push({ id, name, arcanum: 'minor', number: n, suit,
      upright_meaning: `Energia de ${meta.es} (${meta.element}), posicion ${n}`,
      reversed_meaning: `Sombra de ${meta.es} (${meta.element}), posicion ${n}`,
      keywords: [meta.es.toLowerCase(), meta.element, String(n)],
      texture_front: `/cards/front/${id}.webp`, texture_back: '/cards/back.webp' });
  }
}

if (cards.length !== 78) throw new Error('Expected 78, got ' + cards.length);
const ids = new Set(cards.map(c => c.id));
if (ids.size !== 78) throw new Error('Duplicate ids');

const outDir = '/home/meisoft/projects/pitonisa/aituber-onair/packages/tarot-assets/cards';
fs.mkdirSync(path.join(outDir, 'front'), { recursive: true });
fs.writeFileSync(path.join(outDir, 'metadata.json'), JSON.stringify(cards, null, 2));
console.log('OK', cards.length, 'cards written to', outDir);
