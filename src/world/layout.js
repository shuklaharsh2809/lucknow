// Real positions in old Lucknow, from OpenStreetMap footprints. Local metres: origin at Rumi
// Darwaza, +X east, -Z north. `yaw` turns a landmark's local frame (three.js Y rotation):
// local +X maps to world (cos yaw, -sin yaw), local +Z (the main facade) to (sin yaw, cos yaw).
export const RUMI = { x: -2, z: 1, yaw: -1.897 };
export const BARA = { x: 47, z: 310, yaw: 2.82 };
export const CLOCK = { x: -418, z: -308, yaw: 0.454 };
export const TANK = { x: -495, z: -343, w: 66, d: 72, yaw: 0.454, depth: 3.4 };
export const GALLERY = { x: -464, z: -419, yaw: 0.454 };
export const SATKHANDA = { x: -612, z: -365 };
export const CHOTA = { x: -807, z: -222, yaw: 1.867 };
export const AKBARI = { x: -489, z: 1002, yaw: -0.453 };
export const BAZAAR = { x: -512, z: 1050, r: 120 };
export const JAMA = { x: -1105, z: -186, yaw: Math.PI / 2 };

export function toWorld(L, lx, lz) {
  const c = Math.cos(L.yaw), s = Math.sin(L.yaw);
  return [L.x + lx * c + lz * s, L.z - lx * s + lz * c];
}

// A rotated rectangle in a landmark's frame, as a flat [x, z, ...] world polygon.
export function rectPoly(L, cx, cz, w, d) {
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].flatMap(([x, z]) => toWorld(L, cx + x, cz + z));
}

export const PLACES = [
  {
    key: 'bara',
    name: 'Bara Imambara',
    local: 'बड़ा इमामबाड़ा · بڑا امام باڑہ',
    year: '1784',
    text: 'Built by Nawab Asaf-ud-Daula as a famine-relief project, so that people had paid work through years of drought. Its central hall is one of the largest arched halls in the world with no beams holding up the roof. Take the stairs on the east side up to the Bhool Bhulaiya, the maze. The white Asfi Mosque stands on the west side of the court.',
    spawn: toWorld(BARA, 0, 118), look: toWorld(BARA, 0, 0),
    center: toWorld(BARA, 0, 120), radius: 150,
  },
  {
    key: 'rumi',
    name: 'Rumi Darwaza',
    local: 'रूमी दरवाज़ा · رومی دروازہ',
    year: '1784',
    text: 'A 60-foot gateway, also built under Asaf-ud-Daula and sometimes called the Turkish Gate. Its tall arch is crowned with carved flower buds and flanked by slender minarets, and it has become the symbol of Lucknow. Traffic still passes through it on Husainabad Road.',
    // east side by day (front-lit), west side in the evening light
    spawn: toWorld(RUMI, 0, -48), spawnEvening: toWorld(RUMI, 0, 48), look: [RUMI.x, RUMI.z],
    center: [RUMI.x, RUMI.z], radius: 75,
  },
  {
    key: 'clock',
    name: 'Husainabad Clock Tower',
    local: 'घंटा घर · گھنٹہ گھر',
    year: '1881',
    text: 'At 67 m (221 ft), one of the tallest clock towers in India, designed by Richard Roskell Bayne. It stands beside the stepped Ghanta Ghar Talab (tank), the Picture Gallery baradari and the unfinished Satkhanda watchtower.',
    spawn: toWorld(TANK, 95, 18), look: [CLOCK.x, CLOCK.z],
    center: [-470, -350], radius: 140,
  },
  {
    key: 'chota',
    name: 'Chota Imambara',
    local: 'छोटा इमामबाड़ा · چھوٹا امام باڑہ',
    year: '1838',
    text: 'Built by Muhammad Ali Shah, third King of Awadh, as his mausoleum. It is known as the Palace of Lights for its Belgian glass chandeliers. Its white facade is covered in black-and-white calligraphy panels, under a gilded dome, with a long water channel in front.',
    spawn: toWorld(CHOTA, 0, 72), look: toWorld(CHOTA, 0, 0),
    center: toWorld(CHOTA, 0, 40), radius: 100,
  },
  {
    key: 'chowk',
    name: 'Chowk Bazaar',
    local: 'चौक बाज़ार · چوک بازار',
    year: 'since the 1700s',
    text: 'The old heart of Lucknow, entered through the Akbari Darwaza. The lanes are full of chikankari embroidery, attar (perfume) sellers and kulfi. Tunday Kababi, a few steps south of the gate, has been grilling galouti kebabs since 1905.',
    spawn: toWorld(AKBARI, 0, -30), look: [AKBARI.x, AKBARI.z],
    center: [BAZAAR.x, BAZAAR.z], radius: 130,
  },
];
