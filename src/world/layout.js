// City plan in metres. +X is east, -Z is north. Husainabad Road runs east-west along z = 0.
export const ROAD = { x0: -330, x1: 360, z: 0, width: 14 };

export const SITES = {
  baraImambara: { x: -115, z: -14, width: 124, depth: 150 },
  rumiDarwaza: { x: -28, z: 0 },
  clockTower: { x: 58, z: -42 },
  satkhanda: { x: 100, z: -34 },
  tank: { x: 82, z: -96, w: 52, d: 36, depth: 3.2 },
  chotaImambara: { x: 218, z: -14, width: 96, depth: 150 },
  chowk: { x: 22, z0: 10, z1: 196, width: 7 },
  river: { z0: -330, z1: -262 },
};

// Areas where no filler houses or random trees may go.
export const RESERVED = [
  // road + pavements
  { x0: ROAD.x0 - 40, x1: ROAD.x1 + 40, z0: -12, z1: 12 },
  // Bara Imambara compound + forecourt
  { x0: -182, x1: -48, z0: -170, z1: -8 },
  // Rumi Darwaza plaza
  { x0: -48, x1: -6, z0: -40, z1: 40 },
  // Clock tower, Satkhanda, tank, baradari
  { x0: 30, x1: 125, z0: -140, z1: -8 },
  // Chota Imambara compound
  { x0: 165, x1: 272, z0: -170, z1: -8 },
  // Chowk bazaar (buildings placed by the bazaar itself)
  { x0: 8, x1: 36, z0: 8, z1: 205 },
  // river + ghats
  { x0: -700, x1: 700, z0: -345, z1: -236 },
];

export function isReserved(x, z, pad = 0) {
  for (const r of RESERVED) {
    if (x > r.x0 - pad && x < r.x1 + pad && z > r.z0 - pad && z < r.z1 + pad) return true;
  }
  return false;
}

export const PLACES = [
  {
    key: 'bara',
    name: 'Bara Imambara',
    local: 'बड़ा इमामबाड़ा · بڑا امام باڑہ',
    year: '1784',
    text: 'Built by Nawab Asaf-ud-Daula as a famine-relief project, so that people had paid work through years of drought. Its central hall is one of the largest arched halls in the world with no beams holding up the roof. Climb the stairs on the east side to reach the rooftop Bhool Bhulaiya, the maze.',
    spawn: [-115, -76], look: [-115, -124],
    center: [-115, -80], radius: 70,
  },
  {
    key: 'rumi',
    name: 'Rumi Darwaza',
    local: 'रूमी दरवाज़ा · رومی دروازہ',
    year: '1784',
    text: 'A 60-foot gateway, also built under Asaf-ud-Daula and sometimes called the Turkish Gate. Its huge half-domed arch with a ring of carved flower buds has become the symbol of Lucknow. The road still passes right through it.',
    spawn: [-78, 0], look: [-28, 0],
    center: [-40, 0], radius: 50,
  },
  {
    key: 'clock',
    name: 'Husainabad Clock Tower',
    local: 'घंटा घर · گھنٹہ گھر',
    year: '1881',
    text: 'At 67 m (221 ft), one of the tallest clock towers in India. It was designed by Richard Roskell Bayne in Victorian-Gothic style. Beside it are the unfinished Satkhanda watchtower and the Husainabad tank with its baradari.',
    spawn: [40, -8], look: [58, -42],
    center: [70, -60], radius: 55,
  },
  {
    key: 'chota',
    name: 'Chota Imambara',
    local: 'छोटा इमामबाड़ा · چھوٹا امام باڑہ',
    year: '1838',
    text: 'Built by Muhammad Ali Shah, third King of Awadh, as his own mausoleum. It is called the Palace of Lights for its Belgian glass chandeliers and its lamp-lit festivals. The gilded dome shines over a long garden channel lined with two small copies of the Taj Mahal.',
    spawn: [218, -30], look: [218, -130],
    center: [218, -80], radius: 70,
  },
  {
    key: 'chowk',
    name: 'Chowk Bazaar',
    local: 'चौक बाज़ार · چوک بازار',
    year: 'since the 1700s',
    text: 'The old heart of Lucknow, entered through the Akbari Darwaza. The lanes are full of chikankari embroidery, attar (perfume) sellers, kulfi and the smell of galouti kebabs. Tunday Kababi has been grilling here since 1905.',
    spawn: [22, 18], look: [22, 90],
    center: [22, 100], radius: 95,
  },
];
