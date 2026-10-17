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

// How a line is set — its emotional typography: size (×), italic, tone (pale | blood | ash | cold), arrival (slam | slow | normal),
// motion (tremble | drift | sink | rise | still). Matched by text, first hit wins; lines with no entry use the song's default.
export const MOODS = {
  'on-my-way-to-you': [
    [/venom of people/i,        { size: 1.0, italic: true, tone: 'ash', arrive: 'slow', motion: 'tremble' }],
    [/standing all alone/i,     { size: 0.95, italic: true, tone: 'pale', arrive: 'slow', motion: 'drift' }],
    [/coming to save you|from here|from them|on my way to you/i, { size: 1.0, italic: true, tone: 'pale', arrive: 'slow' }],
    [/^(i'm coming\.?\s*)+$/i,     { size: 1.3, tone: 'blood', arrive: 'slam', motion: 'still' }],
    [/talk too much|bury you in words/i, { size: 1.08, arrive: 'slam', motion: 'tremble' }],
    [/enough words in any language/i,    { size: 0.92, tone: 'pale', arrive: 'slow', motion: 'drift' }],
    [/how rotten/i,             { size: 1.1, tone: 'ash', arrive: 'slam', motion: 'sink' }],
    [/^enough of/i,             { size: 1.3, tone: 'blood', arrive: 'slam', motion: 'still' }],
    [/darkness struggles|swallow what's inside/i, { size: 1.0, tone: 'ash', arrive: 'slow', motion: 'sink' }],
    [/^just wait/i,             { size: 0.8, italic: true, tone: 'pale', arrive: 'slow', motion: 'still' }],
    [/karma is coming/i,        { size: 1.35, tone: 'blood', arrive: 'slam', motion: 'still' }],
    [/and so am i/i,            { size: 1.2, tone: 'blood', arrive: 'slam' }],
    [/won't need fists|won't need fire/i, { size: 1.1, arrive: 'slam', motion: 'still' }],
    [/tear through your lies/i, { size: 1.15, tone: 'blood', arrive: 'slam', motion: 'tremble' }],
    [/tried to silence/i,       { size: 0.9, tone: 'ash', arrive: 'slow', motion: 'sink' }],
    [/not preparing anymore/i,  { size: 1.0, tone: 'pale', arrive: 'normal', motion: 'still' }],
    [/shock is over/i,          { size: 1.05, tone: 'pale', arrive: 'slam', motion: 'still' }],
    [/not frozen anymore/i,     { size: 1.0, tone: 'cold', arrive: 'slow', motion: 'tremble' }],
    [/straight as an arrow|locked on the truth/i, { size: 1.1, arrive: 'slam', motion: 'still' }],
    [/coming to save$|standing alone\.?$/i, { size: 1.0, italic: true, tone: 'pale', arrive: 'slow' }],
    [/hands try to push me down/i, { size: 1.0, tone: 'ash', arrive: 'normal', motion: 'tremble' }],
    [/underwater, watch me drown/i, { size: 1.0, tone: 'cold', arrive: 'slow', motion: 'sink' }],
    [/still got air|still got breath/i, { size: 1.15, tone: 'pale', arrive: 'slow', motion: 'rise' }],
    [/words you haven't heard/i, { size: 1.0, tone: 'pale', arrive: 'normal', motion: 'drift' }],
    [/mind is clear|eyes are open/i, { size: 1.1, tone: 'pale', arrive: 'normal', motion: 'still' }],
    [/get to break me/i,        { size: 1.15, tone: 'blood', arrive: 'slam', motion: 'tremble' }],
    [/call me broken/i,         { size: 1.1, tone: 'blood', arrive: 'slam' }],
    [/remember the silence|remember the shock/i, { size: 0.85, italic: true, tone: 'ash', arrive: 'slow', motion: 'still' }],
    [/came too late/i,          { size: 0.9, italic: true, tone: 'pale', arrive: 'slow', motion: 'drift' }],
    [/couldn't say/i,           { size: 0.8, italic: true, tone: 'ash', arrive: 'slow', motion: 'sink' }],
    [/isn't waiting anymore/i,  { size: 1.1, arrive: 'slow', motion: 'rise' }],
    [/coming for him|coming for me/i, { size: 1.25, tone: 'blood', arrive: 'slam', motion: 'still' }],
    [/silent in the storm/i,    { size: 1.05, tone: 'cold', arrive: 'slam', motion: 'tremble' }],
    [/what i'm fighting for/i,  { size: 1.2, tone: 'blood', arrive: 'slam', motion: 'still' }],
    [/^push me down/i,          { size: 1.0, tone: 'ash', arrive: 'slam', motion: 'sink' }],
    [/find the air/i,           { size: 1.1, tone: 'pale', arrive: 'slow', motion: 'rise' }],
    [/throw your poison/i,      { size: 1.0, tone: 'ash', arrive: 'slam', motion: 'tremble' }],
    [/still be there/i,         { size: 1.2, tone: 'pale', arrive: 'slam', motion: 'still' }],
    [/won't abandon me/i,       { size: 1.15, tone: 'blood', arrive: 'slow', motion: 'still' }],
    [/^tell me/i,               { size: 0.8, italic: true, tone: 'pale', arrive: 'slow', motion: 'still' }],
    [/so lost in evil/i,        { size: 0.95, italic: true, tone: 'ash', arrive: 'slow', motion: 'drift' }],
    [/^maybe you don't/i,       { size: 0.85, italic: true, tone: 'pale', arrive: 'slow', motion: 'still' }],
    [/stop letting them speak/i, { size: 1.1, tone: 'pale', arrive: 'slow', motion: 'rise' }],
  ],
};

export const SONGS = [
  {
    slug: 'when-god-wants-to-make-you-stronger',
    title: 'When God Wants to Make You Stronger',
    duration: 363,
    note: 'Faith, betrayal and the long walk back — the avenue, the alley, the water, the tower.',
    accents: ['god', 'rise', 'fall', 'fly', 'rain', 'pain', 'light', 'fade', 'alone', 'strength', 'drown', 'bleed',
      'lies', 'pretend', 'trust', 'defeat', 'standing', 'silence', 'call', 'sun', 'breathe', 'cost', 'flame', 'shame',
      'break', 'scars', 'hell', 'chain', 'beats', 'home', 'broken', 'hope', 'soul', 'whole', 'morning', 'free', 'pray', 'way', 'here'],
  },
  {
    slug: 'on-my-way-to-you',
    title: 'On My Way to You',
    duration: 288,
    note: 'A harder walk down the back lane: the grave of words, the LIES wall, the water again — and coming up.',
    pool: 2,                                                           // the water: where the third alley meets the back lane
    accents: ['coming', 'save', 'alone', 'venom', 'rotten', 'evil', 'lies', 'darkness', 'swallow', 'karma', 'fists', 'fire', 'tear',
      'silence', 'shock', 'frozen', 'arrow', 'truth', 'drown', 'underwater', 'air', 'breath', 'broken', 'storm', 'poison', 'abandon', 'fighting', 'lost'],
  },
];
