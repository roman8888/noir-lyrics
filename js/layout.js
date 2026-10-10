// The city's fixed geography, shared by the builders (city, props), the storyboard (route) and the lyrics.
// The main street runs along -z. x in [-8, 8] is the road; facades of the first row stand at |x| = 9.
export const STREET_HALF = 8;          // road half-width
export const FACADE = 9;               // first-row facade plane |x|
export const ROW2 = 27;                // second row starts here
export const Z_START = 50, Z_END = -330;
export const CELL = { w: 1.7, h: 2.6 };  // window grid (must match the building shader)

// side alleys cut through the first row; each runs along x from the street to the second row
export const ALLEYS = [
  { z: -62,  side: -1, w: 4.6 },
  { z: -112, side: 1,  w: 4.6 },
  { z: -208, side: -1, w: 4.6 },
  { z: -268, side: 1,  w: 4.6 },
];

// the hero building (right side) holds the apartment the chorus is sung in
export const HERO = { x: FACADE, z: -160, depth: 20, width: 12, height: 36 };
export const ROOM = {                  // apartment behind the hero facade, floor at y = 13
  x0: FACADE, x1: FACADE + 5.2, z0: -162.1, z1: -157.9, y0: 13, y1: 16.3,
  win: { y: 14.9, z: -160, w: 2.2, h: 2.0 },   // window centre + size (in the facade plane)
};

export const BRIDGE = { z: -232, y: 8.6, thick: 0.9, span: 44 };   // overpass across the street
export const CHURCH = { z: -352 };                                  // closes the street; the sun rises behind it
export const LAMP_H = 6.6, LAMP_X = 7.6;
export const lampZs = () => { const a = []; for (let z = 34; z > -320; z -= 18) a.push(z); return a; };
