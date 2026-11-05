// Deterministic heraldry: any string (a tag, a name) maps to the same coat of
// arms every time. Returns an SVG string and a Chinese blazon describing it.
// Pure JS so it runs both at build time (Astro) and in the browser.

const METALS = [
  { key: 'or', name: '金', hex: '#d2aa58' },
  { key: 'argent', name: '银', hex: '#efe9dc' },
];
const COLOURS = [
  { key: 'gules', name: '红', hex: '#8e2a22' },
  { key: 'azure', name: '蓝', hex: '#2b4566' },
  { key: 'vert', name: '绿', hex: '#2f5d3a' },
  { key: 'purpure', name: '紫', hex: '#5b3a6b' },
  { key: 'sable', name: '黑', hex: '#25201d' },
];

function hash(str) {
  let h = 2166136261;
  for (const ch of str) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pickFrom = (r, list) => list[Math.floor(r() * list.length)];

export const SHIELD_PATH = 'M0 0H100V58C100 90 77 109 50 120C23 109 0 90 0 58Z';

// Field divisions (drawn in the second tincture over the first).
const DIVISIONS = [
  { key: 'plain', name: '', d: '' },
  { key: 'pale', name: '纵分', d: 'M50 0H100V120H50Z' },
  { key: 'fess', name: '横分', d: 'M0 55H100V120H0Z' },
  { key: 'bend', name: '斜分', d: 'M0 0H100V120Z' },
  { key: 'quarterly', name: '四分', d: 'M50 0H100V55H50ZM0 55H50V120H0Z' },
];

// Ordinaries (bands across the field).
const ORDINARIES = [
  { key: 'none', name: '', d: '' },
  { key: 'fess', name: '横带', d: 'M0 42H100V68H0Z', slots: [[50, 22], [25, 92], [75, 92]] },
  { key: 'pale', name: '竖带', d: 'M38 0H62V120H38Z', slots: [[19, 45], [81, 45], [50, 101]] },
  { key: 'bend', name: '斜带', d: 'M0 0L18 0L100 92L100 114L82 114L0 22Z', slots: [[75, 28], [25, 78], [72, 22]] },
  { key: 'chevron', name: '人字带', d: 'M50 38L100 82V104L50 60L0 104V82Z', slots: [[24, 24], [76, 24], [50, 92]] },
  { key: 'cross', name: '十字', d: 'M40 0H60V44H100V64H60V120H40V64H0V44H40Z', slots: [[20, 22], [80, 22], [20, 88]] },
  { key: 'saltire', name: 'X形十字', d: 'M0 0H16L50 40L84 0H100V14L62 56L100 98V114H86L50 72L14 114H0V98L38 56L0 14Z', slots: [[50, 18], [16, 56], [84, 56]] },
  { key: 'chief', name: '盾首', d: 'M0 0H100V30H0Z', slots: [[22, 15], [50, 15], [78, 15]] },
];

// Charges: small emblems, drawn centred on (0, 0) at roughly 20 units across.
const CHARGES = [
  { key: 'mullet', name: '五角星', d: 'M0 -11L3.2 -3.4L11.4 -3.4L4.8 1.6L7.2 9.6L0 4.8L-7.2 9.6L-4.8 1.6L-11.4 -3.4L-3.2 -3.4Z' },
  { key: 'roundel', name: '圆饼', d: 'M-9 0A9 9 0 1 0 9 0A9 9 0 1 0 -9 0Z' },
  { key: 'annulet', name: '圆环', d: 'M-9 0A9 9 0 1 0 9 0A9 9 0 1 0 -9 0ZM-5 0A5 5 0 1 1 5 0A5 5 0 1 1 -5 0Z', evenodd: true },
  { key: 'crescent', name: '新月', d: 'M-10 -2A10 10 0 0 0 10 -2A8 7 0 0 1 -10 -2Z' },
  { key: 'lozenge', name: '菱形', d: 'M0 -11L8 0L0 11L-8 0Z' },
  { key: 'tower', name: '城塔', d: 'M-8 10V-4H-10V-11H-6V-8H-2V-11H2V-8H6V-11H10V-4H8V10H2V3H-2V10Z' },
  { key: 'key', name: '钥匙', d: 'M-2 -10A5 5 0 1 0 2 -10A5 5 0 1 0 -2 -10ZM-1.5 -6H1.5V8H5V10.5H1.5V11.5H-1.5Z' },
  { key: 'gear', name: '齿轮', d: 'M-2 -11H2L3 -7.5L6.5 -9L9 -6.5L7.5 -3L11 -2V2L7.5 3L9 6.5L6.5 9L3 7.5L2 11H-2L-3 7.5L-6.5 9L-9 6.5L-7.5 3L-11 2V-2L-7.5 -3L-9 -6.5L-6.5 -9L-3 -7.5ZM-3.5 0A3.5 3.5 0 1 0 3.5 0A3.5 3.5 0 1 0 -3.5 0Z', evenodd: true },
];
const COUNT_NAMES = ['', '一枚', '两枚', '三枚'];

/** Build the arms for a string. */
export function arms(input) {
  const seed = hash(String(input).trim().toLowerCase() || 'manor');
  const r = rng(seed);
  // rule of tincture: alternate metal and colour
  const fieldIsMetal = r() < 0.4;
  const field = fieldIsMetal ? pickFrom(r, METALS) : pickFrom(r, COLOURS);
  const contrast = fieldIsMetal ? pickFrom(r, COLOURS) : pickFrom(r, METALS);
  const division = r() < 0.35 ? pickFrom(r, DIVISIONS.slice(1)) : DIVISIONS[0];
  const ordinary = division.key === 'plain' || r() < 0.3 ? pickFrom(r, ORDINARIES.slice(1)) : ORDINARIES[0];
  const charge = pickFrom(r, CHARGES);
  const count = ordinary.key === 'none' ? 1 + Math.floor(r() * 3) : 1 + Math.floor(r() * 3);
  // on a plain field the charge takes the contrasting tincture; beside an
  // ordinary it uses the ordinary's tincture
  const chargeTincture = contrast;
  return { seed, field, contrast, division, ordinary, charge, count, chargeTincture, input: String(input) };
}

function chargeSlots(a) {
  if (a.ordinary.slots) return a.ordinary.slots.slice(0, a.count);
  if (a.count === 1) return [[50, 54]];
  if (a.count === 2) return [[30, 50], [70, 50]];
  return [[28, 36], [72, 36], [50, 82]];
}

/** SVG markup for the arms; `size` sets the width in px. */
export function armsSvg(a, { size = 100, id = 'a' + a.seed.toString(36), title = '' } = {}) {
  const clip = `clip-${id}`;
  const scale = a.count === 1 && a.ordinary.key === 'none' ? 2.1 : 1.15;
  const parts = [];
  parts.push(`<rect width="100" height="120" fill="${a.field.hex}"/>`);
  if (a.division.d) parts.push(`<path d="${a.division.d}" fill="${a.contrast.hex}"/>`);
  if (a.ordinary.d) {
    // an ordinary on a divided field is drawn in the field tincture's opposite metal/colour
    const fill = a.division.d ? (METALS.includes(a.contrast) ? COLOURS[0].hex : METALS[0].hex) : a.contrast.hex;
    parts.push(`<path d="${a.ordinary.d}" fill="${fill}"/>`);
  }
  const cFill = a.ordinary.d ? a.contrast.hex : a.contrast.hex;
  for (const [x, y] of chargeSlots(a)) {
    parts.push(`<path d="${a.charge.d}" transform="translate(${x} ${y}) scale(${scale})" fill="${cFill}"${a.charge.evenodd ? ' fill-rule="evenodd"' : ''} stroke="rgba(0,0,0,.25)" stroke-width="0.6"/>`);
  }
  // when charges sit on an ordinary of the same tincture, outline them in the field colour
  const shine = `<path d="M6 6H50V50C30 48 14 40 6 28Z" fill="#fff" opacity=".08"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 108 128" width="${size}" height="${Math.round(size * 1.185)}" role="img"${title ? ` aria-label="${escapeAttr(title)}"` : ''}>`
    + `<defs><clipPath id="${clip}"><path d="${SHIELD_PATH}"/></clipPath></defs>`
    + `<g clip-path="url(#${clip})">${parts.join('')}${shine}</g>`
    + `<path d="${SHIELD_PATH}" fill="none" stroke="#a0742a" stroke-width="3"/>`
    + `<path d="${SHIELD_PATH}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1" transform="translate(50 60) scale(.94) translate(-50 -60)"/>`
    + `</svg>`;
}

/** Chinese blazon, e.g. "红底纵分金色，配蓝色横带，上有三枚金色五角星". */
export function blazon(a) {
  let s = `${a.field.name}底`;
  if (a.division.name) s += `${a.division.name}${a.contrast.name}色`;
  if (a.ordinary.name) {
    const ordName = a.division.d ? (METALS.includes(a.contrast) ? COLOURS[0].name : METALS[0].name) : a.contrast.name;
    s += `，饰${ordName}色${a.ordinary.name}`;
  }
  s += `，${a.ordinary.name ? '两侧' : '中央'}有${COUNT_NAMES[a.count]}${a.contrast.name}色${a.charge.name}`;
  if (a.ordinary.name && a.count === 1) s = s.replace('两侧有', '旁有');
  return s + '。';
}

function escapeAttr(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
