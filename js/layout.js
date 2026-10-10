// The city's fixed geography, shared by the builders (city, props), the storyboard (route) and the lyrics.
// The main street runs along -z. x in [-8, 8] is the road; facades of the first row stand at |x| = 9.
export const STREET_HALF = 8;          // road half-width
export const FACADE = 9;               // first-row facade plane |x|
export const ROW2 = 27;                // second row starts here
export const ZS = 3;                   // the street is stretched 3x: the walk is 3x faster, every set piece 3x further
export const Z_START = 50, Z_END = -330 * ZS;
export const CELL = { w: 1.7, h: 2.6 };  // window grid (must match the building shader)

// side alleys cut through the first row; each runs along x from the street to the second row
export const ALLEYS = [
  { z: -62 * ZS,  side: -1, w: 4.6 },
  { z: -140 * ZS, side: 1,  w: 4.6 },
  { z: -224 * ZS, side: -1, w: 4.6 },
  { z: -284 * ZS, side: 1,  w: 4.6 },
];

// the hero building (right side) holds the apartment the chorus is sung in
export const HERO = { x: FACADE, z: -110 * ZS, depth: 20, width: 12, height: 36 };
export const ROOM = {                  // a ground-floor apartment behind the hero facade: you walk up to its window
  x0: FACADE, x1: FACADE + 5.2, z0: HERO.z - 2.1, z1: HERO.z + 2.1, y0: 0.02, y1: 3.3,
  win: { y: 1.65, z: HERO.z, w: 2.2, h: 2.0 },    // window centre + size (in the facade plane); sill at 0.65
};

export const BRIDGE = { z: -200 * ZS, y: 8.6, thick: 0.9, span: 44 };   // overpass across the street
export const CHURCH = { z: -330 * ZS };                             // the gateway that closes the street
export const TOWER = { z: -330 * ZS - 95 };                         // the spire with the R, beyond the gateway
export const LAMP_H = 6.6, LAMP_X = 7.6;
export const lampZs = () => { const a = []; for (let z = 34; z > Z_END + 10; z -= 18) a.push(z); return a; };
