// One entry per song. songs/<slug>/timing.json (built by tools/align.py) gives lines, word times and sections.
// Each section has a "look" — the scene blends into it when the section starts:
//   rain 0..1.5 · warm 0..1 (cold → gold light) · red 0..1 (red accents, harsher) · beam 0..1 (light from above)
//   dawn 0..1 (sky opens) · cut 0|1 (hard cuts, words slam in) · fog
export const LOOKS = {
  'Intro':        { rain: 0.8, warm: 0,  red: 0.15, beam: 0.0,  dawn: 0,    cut: 0, fog: 0.05 },
  'Verse 1':      { rain: 1.1, warm: 0, red: 0.3,  beam: 0.0,  dawn: 0,    cut: 0, fog: 0.045 },
  'Rap 1':        { rain: 1.4, warm: 0,  red: 1.0,  beam: 0.0,  dawn: 0,    cut: 1, fog: 0.04 },
  'Pre-Chorus':   { rain: 0.7, warm: 0,  red: 0.1,  beam: 0.7,  dawn: 0,    cut: 0, fog: 0.04 },
  'Chorus':       { rain: 0.35, warm: 0, red: 0.05, beam: 1.0,  dawn: 0,  cut: 0, fog: 0.035 },
  'Verse 2':      { rain: 0.8, warm: 0, red: 0.25, beam: 0.1,  dawn: 0,    cut: 0, fog: 0.045 },
  'Rap 2':        { rain: 1.5, warm: 0, red: 1.0,  beam: 0.0,  dawn: 0,    cut: 1, fog: 0.04 },
  'Bridge':       { rain: 0.3, warm: 0,  red: 0.1,  beam: 0.5,  dawn: 0, cut: 0, fog: 0.045 },
  'Final Chorus': { rain: 0.1, warm: 0,  red: 0.0,  beam: 0.7,  dawn: 0, cut: 0, fog: 0.03 },
  'Outro':        { rain: 0.0, warm: 0,  red: 0.0,  beam: 0.8,  dawn: 0,  cut: 0, fog: 0.022 },
  'End':          { rain: 0.0, warm: 0,  red: 0.0,  beam: 0.5,  dawn: 0,  cut: 0, fog: 0.02 },
};

export const SONGS = [
  {
    slug: 'when-god-wants-to-make-you-stronger',
    title: 'When God Wants to Make You Stronger',
    accents: ['god', 'rise', 'fall', 'fly', 'rain', 'pain', 'light', 'fade', 'alone', 'strength', 'drown', 'bleed',
      'lies', 'pretend', 'trust', 'defeat', 'standing', 'silence', 'call', 'sun', 'breathe', 'cost', 'flame', 'shame',
      'break', 'scars', 'hell', 'chain', 'beats', 'home', 'broken', 'hope', 'soul', 'whole', 'morning', 'free', 'pray', 'way', 'here'],
  },
  {
    slug: 'on-my-way-to-you',
    title: 'On My Way to You',
    pool: 2,                                                           // the water: where the third alley meets the back lane
    accents: ['coming', 'save', 'alone', 'venom', 'rotten', 'evil', 'lies', 'darkness', 'swallow', 'karma', 'fists', 'fire', 'tear',
      'silence', 'shock', 'frozen', 'arrow', 'truth', 'drown', 'underwater', 'air', 'breath', 'broken', 'storm', 'poison', 'abandon', 'fighting', 'lost'],
  },
];
