import { BLOCKFOLK_BACKGROUND, BLOCKFOLK_CATEGORY, BLOCKFOLK_STICKERS } from './blockfolkLibrary.js';

const PAPER = '#fffaf0';
const INK = '#31324a';
const SVG_NS = ['http:', '', 'www.w3.org', '2000', 'svg'].join('/');

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
}

function svgDataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const backgrounds = [
  ['background-paper', 'White Paper', 'paper', '#fffaf0', '#f1dfbd'],
  ['background-bedroom', 'Cozy Bedroom', 'bedroom', '#ffd9c7', '#9e6bc5'],
  ['background-park', 'Sunny Park', 'park', '#bde8ff', '#59a85f'],
  ['background-farm', 'Friendly Farm', 'farm', '#bfe9ff', '#d99a4e'],
  ['background-beach', 'Beach Day', 'beach', '#aee7ff', '#f4cf75'],
  ['background-underwater', 'Under the Sea', 'underwater', '#4dc8d8', '#176b91'],
  ['background-space', 'Outer Space', 'space', '#25245f', '#7f63c8'],
  ['background-castle', 'Storybook Castle', 'castle', '#e3caff', '#73b476'],
  ['background-snow', 'Snowy Day', 'snow', '#d9f3ff', '#9fb9d2'],
  ['background-city', 'Happy City', 'city', '#b9def4', '#6c8aa3']
];

function sceneShapes(kind, accent) {
  const cloud = '<g fill="#fff" opacity=".88"><ellipse cx="240" cy="220" rx="110" ry="55"/><ellipse cx="320" cy="215" rx="75" ry="70"/><ellipse cx="390" cy="230" rx="105" ry="52"/></g>';
  if (kind === 'paper') return '<path d="M90 180h900M90 360h900M90 540h900M90 720h900M90 900h900M90 1080h900M90 1260h900" stroke="#eadbbd" stroke-width="3" stroke-dasharray="12 20" opacity=".55"/>';
  if (kind === 'bedroom') return '<rect x="100" y="630" width="880" height="630" rx="36" fill="#f7b9a8"/><rect x="160" y="790" width="560" height="330" rx="34" fill="#fff2d7" stroke="#704b80" stroke-width="18"/><path d="M160 930h560v190H160z" fill="#8fc7d6"/><rect x="755" y="510" width="170" height="430" rx="26" fill="#7c58a5"/><circle cx="840" cy="735" r="13" fill="#ffe49a"/><path d="M0 1260h1080v180H0z" fill="#d88f72"/>';
  if (kind === 'park') return `${cloud}<circle cx="870" cy="170" r="82" fill="#ffd65a"/><path d="M0 820Q220 690 420 830T810 800T1080 760V1440H0z" fill="#75be69"/><g fill="#6c4b33"><rect x="180" y="590" width="55" height="410" rx="25"/><rect x="835" y="560" width="58" height="420" rx="25"/></g><g fill="#4f9d58"><circle cx="205" cy="560" r="165"/><circle cx="860" cy="535" r="175"/></g><path d="M430 1440q20-410 220-620q210 220 220 620" fill="#efd7a5"/>`;
  if (kind === 'farm') return `${cloud}<circle cx="880" cy="180" r="78" fill="#ffd85c"/><path d="M0 730q310-160 580 10t500-40v740H0z" fill="#79bd61"/><path d="M120 720l255-205 255 205v385H120z" fill="#d75e58"/><path d="M245 1105V815h260v290" fill="#f5e6c8"/><path d="M0 1210h1080" stroke="#9a633f" stroke-width="28" stroke-dasharray="150 34"/>`;
  if (kind === 'beach') return `${cloud}<circle cx="865" cy="180" r="80" fill="#ffd65c"/><path d="M0 540q300 90 590 0t490 15v465H0z" fill="#42b7d2"/><path d="M0 930q320-90 610 30t470-20v500H0z" fill="#f1cf82"/><path d="M145 860q95-170 190 0" fill="none" stroke="#ed705f" stroke-width="38"/><path d="M770 1130l105-355 105 355" fill="#5fa85a" stroke="#5fa85a" stroke-width="24"/><circle cx="875" cy="750" r="55" fill="#d8864e"/>`;
  if (kind === 'underwater') return '<g fill="#d8fbff" opacity=".7"><circle cx="180" cy="230" r="30"/><circle cx="230" cy="145" r="18"/><circle cx="850" cy="350" r="34"/><circle cx="900" cy="250" r="20"/></g><path d="M0 1180q270-120 540 10t540-5v255H0z" fill="#e4c989"/><g fill="#58a86d"><path d="M120 1280q-40-300 75-520q-30 330 50 520z"/><path d="M890 1290q-70-350 65-570q-40 340 40 570z"/></g><g fill="#ef7c78"><circle cx="415" cy="1110" r="65"/><circle cx="560" cy="1230" r="90"/></g>';
  if (kind === 'space') return '<g fill="#fff6b1"><circle cx="120" cy="170" r="12"/><circle cx="390" cy="280" r="18"/><circle cx="760" cy="120" r="13"/><circle cx="930" cy="350" r="20"/><circle cx="650" cy="590" r="10"/><circle cx="230" cy="700" r="15"/></g><circle cx="750" cy="860" r="245" fill="#8ed4cf"/><path d="M540 860q210-100 420 0q-220 130-420 0" fill="#65a1bc"/><path d="M0 1280q300-160 560 10t520-30v180H0z" fill="#6c5fa0"/><path d="M280 1090l80-210 80 210-80 130z" fill="#ef7163"/><path d="M325 1100h70l-35 120z" fill="#ffd45f"/>';
  if (kind === 'castle') return `${cloud}<path d="M0 930q290-180 540-30t540-40v580H0z" fill="#72b66f"/><path d="M245 1020V560h150v110h145V520h150v150h145v350z" fill="#d9c2e8" stroke="#72558c" stroke-width="16"/><path d="M470 1020V795q70-105 140 0v225" fill="#765b8c"/><path d="M270 550l50-115 50 115M565 510l50-115 50 115M760 550l50-115 50 115" fill="#ef7c8c"/>`;
  if (kind === 'snow') return `${cloud}<path d="M0 880q290-170 560 0t520-20v580H0z" fill="#f8fdff"/><g fill="#fff"><circle cx="180" cy="430" r="16"/><circle cx="380" cy="320" r="13"/><circle cx="620" cy="470" r="18"/><circle cx="880" cy="280" r="15"/></g><circle cx="775" cy="980" r="115" fill="#fff" stroke="#9abbd2" stroke-width="10"/><circle cx="775" cy="790" r="85" fill="#fff" stroke="#9abbd2" stroke-width="10"/><circle cx="745" cy="770" r="10" fill="#30384d"/><circle cx="805" cy="770" r="10" fill="#30384d"/><path d="M775 790l70 18-70 18z" fill="#f08b42"/><path d="M150 1100l110-330 110 330" fill="#507b65"/>`;
  return `${cloud}<path d="M0 1080h1080v360H0z" fill="#5fa86d"/><g stroke="#43586a" stroke-width="16"><path d="M80 1060V560h220v500" fill="#f0a36f"/><path d="M330 1060V420h250v640" fill="#ecd16f"/><path d="M620 1060V620h170v440" fill="#88c0d0"/><path d="M820 1060V500h190v560" fill="#d38fac"/></g><g fill="#fff4c8"><rect x="120" y="630" width="55" height="70"/><rect x="210" y="630" width="55" height="70"/><rect x="385" y="500" width="60" height="75"/><rect x="475" y="500" width="60" height="75"/><rect x="865" y="575" width="55" height="70"/></g><path d="M0 1190h1080" stroke="${accent}" stroke-width="24" stroke-dasharray="80 38"/>`;
}

function makeBackground([id, name, kind, sky, accent]) {
  const svg = `<svg xmlns="${SVG_NS}" width="1080" height="1440" viewBox="0 0 1080 1440"><rect width="1080" height="1440" rx="22" fill="${sky}"/>${sceneShapes(kind, accent)}<path d="M28 28h1024v1384H28z" fill="none" stroke="${PAPER}" stroke-width="24" opacity=".7"/></svg>`;
  return { id, name, kind: 'background', builtIn: true, dataUrl: svgDataUrl(svg), width: 1080, height: 1440, alt: `${name} paper-cut background` };
}

const categoryData = {
  animals: {
    title: 'Animals', color: '#f39b63', icon: '🐾',
    items: ['Cat', 'Dog', 'Bird', 'Fish', 'Frog', 'Butterfly', 'Dinosaur', 'Horse', 'Rabbit', 'Turtle', 'Bear', 'Chicken']
  },
  people: {
    title: 'People', color: '#d988b9', icon: '★',
    items: ['Ari', 'Bea', 'Cam', 'Dee', 'Eli', 'Fay', 'Gus', 'Hope', 'Ira', 'Joy', 'Kai with Wheels', 'Luz the Helper']
  },
  things: {
    title: 'Things', color: '#6cb8d9', icon: '◆',
    items: ['Blocks', 'Ball', 'Bicycle', 'Car', 'Couch', 'Table', 'Lamp', 'Book', 'Cake', 'Picnic Basket', 'Rocket', 'House']
  },
  nature: {
    title: 'Nature', color: '#6eb06b', icon: '✿',
    items: ['Tree', 'Flowers', 'Rocks', 'Cloud', 'Sun', 'Moon', 'Stars', 'Rain', 'Snow', 'Grass', 'Rainbow', 'Pond']
  },
  silly: {
    title: 'Silly', color: '#9a78cf', icon: '✦',
    items: ['Top Hat', 'Crown', 'Mustache', 'Googly Eyes', 'Giant Glasses', 'Funny Mouth', 'Cape', 'Sparkles', 'Pow!', 'Giant Pizza', 'Speech Bubble', 'Wobbly Shape']
  },
  words: {
    title: 'Words', color: '#ef6f75', icon: '!',
    items: ['Hello!', 'Wow!', 'Boom!', 'Yum!', 'Hooray!', 'Best Day!', 'I Made This!', 'Happy Birthday!', 'Let’s Go!', 'So Silly!', 'You Shine!', 'Ta-Da!']
  },
  emoji: {
    title: 'Emoji', color: '#ffd45e', icon: '😀',
    items: [
      { name: 'Grinning Face', glyph: '😀' },
      { name: 'Laughing Face', glyph: '😂' },
      { name: 'Heart Eyes', glyph: '😍' },
      { name: 'Cool Face', glyph: '😎' },
      { name: 'Winking Face', glyph: '😉' },
      { name: 'Surprised Face', glyph: '😮' },
      { name: 'Sleeping Face', glyph: '😴' },
      { name: 'Thinking Face', glyph: '🤔' },
      { name: 'Party Face', glyph: '🥳' },
      { name: 'Silly Face', glyph: '🤪' },
      { name: 'Rainbow', glyph: '🌈' },
      { name: 'Sparkling Heart', glyph: '💖' }
    ]
  }
};

const skins = ['#8d5524', '#c68642', '#e0ac69', '#f1c27d', '#ffdbac', '#6f4428'];
const hairs = ['#2f211b', '#5c3926', '#d7a24a', '#8e5037', '#3a2d45', '#6c3828'];

function stickerMotif(category, index, color) {
  if (category === 'animals') {
    const ears = index % 3 === 0 ? '<path d="M92 98l38-66 30 78M268 98l-38-66-30 78" fill="#fff" stroke="#31324a" stroke-width="12"/>' : '';
    return `${ears}<ellipse cx="180" cy="190" rx="118" ry="108" fill="${color}" stroke="#fff" stroke-width="28"/><ellipse cx="180" cy="188" rx="112" ry="102" fill="${color}" stroke="${INK}" stroke-width="12"/><circle cx="140" cy="168" r="12" fill="${INK}"/><circle cx="220" cy="168" r="12" fill="${INK}"/><path d="M158 220q22 22 44 0" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>`;
  }
  if (category === 'people') {
    const skin = skins[index % skins.length]; const hair = hairs[index % hairs.length];
    if (index === 10) return `<circle cx="190" cy="238" r="92" fill="none" stroke="#fff" stroke-width="34"/><circle cx="190" cy="238" r="82" fill="none" stroke="${INK}" stroke-width="14"/><circle cx="168" cy="82" r="55" fill="${skin}" stroke="#fff" stroke-width="24"/><path d="M120 76q35-85 105-10" fill="${hair}"/><path d="M165 140v90h95" fill="none" stroke="${color}" stroke-width="48" stroke-linecap="round"/>`;
    return `<circle cx="180" cy="82" r="58" fill="${skin}" stroke="#fff" stroke-width="25"/><path d="M122 76q24-82 116-15" fill="${hair}"/><path d="M96 286q18-145 84-145t84 145" fill="${color}" stroke="#fff" stroke-width="28"/><path d="M108 278h144" stroke="${INK}" stroke-width="12"/><circle cx="160" cy="82" r="7" fill="${INK}"/><circle cx="202" cy="82" r="7" fill="${INK}"/><path d="M166 108q16 12 30 0" fill="none" stroke="${INK}" stroke-width="7"/>`;
  }
  if (category === 'things') return `<rect x="60" y="78" width="240" height="200" rx="55" fill="#fff" stroke="#fff" stroke-width="28"/><rect x="65" y="75" width="230" height="205" rx="48" fill="${color}" stroke="${INK}" stroke-width="12"/><circle cx="125" cy="178" r="28" fill="#fff5c4"/><circle cx="235" cy="178" r="28" fill="#fff5c4"/><path d="M110 245h140" stroke="#fff" stroke-width="16" stroke-linecap="round"/>`;
  if (category === 'nature') return `<circle cx="180" cy="165" r="105" fill="${color}" stroke="#fff" stroke-width="30"/><g fill="#fff5c4"><circle cx="180" cy="62" r="38"/><circle cx="278" cy="145" r="38"/><circle cx="238" cy="250" r="38"/><circle cx="118" cy="250" r="38"/><circle cx="80" cy="140" r="38"/></g><circle cx="180" cy="165" r="56" fill="#ffd35f" stroke="${INK}" stroke-width="10"/>`;
  if (category === 'silly') return `<path d="M45 185Q70 55 180 80q110-25 135 105-20 110-135 112Q65 295 45 185z" fill="${color}" stroke="#fff" stroke-width="30"/><circle cx="125" cy="170" r="42" fill="#fff" stroke="${INK}" stroke-width="11"/><circle cx="235" cy="170" r="42" fill="#fff" stroke="${INK}" stroke-width="11"/><circle cx="137" cy="170" r="13" fill="${INK}"/><circle cx="223" cy="170" r="13" fill="${INK}"/><path d="M130 245q50 45 100 0" fill="none" stroke="${INK}" stroke-width="14" stroke-linecap="round"/>`;
  return '';
}

function makeSticker(category, item, index) {
  const label = typeof item === 'string' ? item : item.name;
  const id = `sticker-${category}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  if (category === 'emoji') {
    return { id, name: label, alt: `${label} emoji`, category, kind: 'emoji', glyph: item.glyph, builtIn: true, width: 360, height: 360 };
  }
  const palette = ['#ff8c72', '#ffbe5c', '#63c6a2', '#66aee8', '#b68add', '#ef7fab'];
  const color = palette[(index + Object.keys(categoryData).indexOf(category)) % palette.length];
  const labelText = escapeXml(label);
  const wordArt = `<path d="M34 75q0-45 45-45h202q45 0 45 45v170q0 45-45 45h-74l-38 38 5-38H79q-45 0-45-45z" fill="${color}" stroke="#fff" stroke-width="26"/><path d="M34 75q0-45 45-45h202q45 0 45 45v170q0 45-45 45H79q-45 0-45-45z" fill="none" stroke="${INK}" stroke-width="10"/><text x="180" y="173" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-weight="900" font-size="${label.length > 12 ? 32 : label.length > 8 ? 40 : 52}" fill="#fff">${labelText}</text>`;
  const motif = category === 'words' ? wordArt : stickerMotif(category, index, color);
  const caption = category === 'words' ? '' : `<rect x="34" y="292" width="292" height="56" rx="28" fill="#fff" stroke="${INK}" stroke-width="8"/><text x="180" y="322" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-weight="800" font-size="${label.length > 14 ? 20 : 24}" fill="${INK}">${labelText}</text>`;
  const svg = `<svg xmlns="${SVG_NS}" width="360" height="360" viewBox="0 0 360 360">${motif}${caption}</svg>`;
  return { id, name: label, alt: `${label} paper-cut sticker`, category, kind: 'sticker', builtIn: true, dataUrl: svgDataUrl(svg), width: 360, height: 360 };
}

export const BUILT_IN_BACKGROUNDS = Object.freeze([...backgrounds.map(makeBackground), BLOCKFOLK_BACKGROUND]);
export const BUILT_IN_CATEGORIES = Object.freeze([...Object.entries(categoryData).map(([id, value]) => ({ id, title: value.title, color: value.color, icon: value.icon })), BLOCKFOLK_CATEGORY]);
export const BUILT_IN_STICKERS = Object.freeze([...Object.entries(categoryData).flatMap(([category, value]) => value.items.map((item, index) => makeSticker(category, item, index))), ...BLOCKFOLK_STICKERS]);
export const BUILT_IN_ASSETS = Object.freeze([...BUILT_IN_BACKGROUNDS, ...BUILT_IN_STICKERS]);

export const CREATIVE_PROMPTS = Object.freeze([
  'Make a picnic for three animals.',
  'Put a dinosaur in the bedroom.',
  'Make the silliest birthday party.',
  'Build a home under the sea.',
  'Show what happens on the moon.',
  'Make a rainy-day adventure.'
]);

export function findBuiltInAsset(assetId) {
  return BUILT_IN_ASSETS.find((asset) => asset.id === assetId) || null;
}

export function validateBuiltInLibrary() {
  const ids = new Set(BUILT_IN_ASSETS.map((asset) => asset.id));
  if (ids.size !== BUILT_IN_ASSETS.length) throw new Error('Built-in asset IDs must be unique.');
  if (BUILT_IN_BACKGROUNDS.length < 8) throw new Error('At least eight backgrounds are required.');
  for (const category of BUILT_IN_CATEGORIES) {
    if (BUILT_IN_STICKERS.filter((sticker) => sticker.category === category.id).length < 8) throw new Error(`${category.title} needs at least eight stickers.`);
  }
  return { backgrounds: BUILT_IN_BACKGROUNDS.length, stickers: BUILT_IN_STICKERS.length, categories: BUILT_IN_CATEGORIES.length };
}
