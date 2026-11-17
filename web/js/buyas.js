// The shopping list in store sizes: what the recipes need ("2 1/4 cups flour", "3 cloves garlic") turned
// into what you actually pick up ("5 lb bag", "1 head"). Pure functions, no DOM (tested in Node).
//
// Each recipe line is measured the way nutrition does it (grams, millilitres or a count, from nutridata.js),
// added up per shopping-list line, then matched to how the food is sold (buydata.js). When any part of a
// line can't be measured ("1 can", an unknown food) the line keeps its recipe amounts instead of guessing.
import { BUY } from './buydata.js';
import { identify, measure } from './nutrition.js';
import { itemKey } from './shopping.js';
import { Frac, scaleRecipe } from './units.js';

const LB = 453.592;
const BIG_PACK = 450;          // grams or ml: a pack this big is a pantry staple (flour, sugar, rice)...
const A_LITTLE = 0.05;         // ...and needing under 5% of one is "check the cupboard", not "buy a bag"
const SLACK = 1.03;
// foods whose differently-worded lines are the same thing at the store (not onions: red and yellow differ)
const MERGE = new Set(['garlic', 'egg', 'butter', 'unsalted butter', 'flour', 'sugar', 'milk', 'salt', 'black pepper', 'pepper']);            // 3% over a pack still fits it: amounts in recipes are rounded

/** "1¾ lb" for a weight bought at the counter: rounded up to the next quarter pound. */
export function pounds(grams) {
  const q = Math.max(1, Math.ceil((grams / LB) * 4 - 0.02));
  const whole = Math.floor(q / 4);
  const frac = ['', '¼', '½', '¾'][q % 4];
  return `${whole || ''}${frac || (whole ? '' : '0')} lb`;
}

/** The pack(s) that cover an amount: the smallest one that fits, else enough of the biggest. */
export function choosePack(packs, need) {
  const sorted = [...packs].sort((a, b) => a[1] - b[1]);
  const fit = sorted.find(([, size]) => need <= size * SLACK);
  if (fit) return fit[0];
  const [label, size] = sorted[sorted.length - 1];
  const k = Math.max(2, Math.ceil(need / (size * SLACK) - 1e-9));
  // "1 head" -> "2 heads"; "15 oz can" -> "2 × 15 oz can"
  return /^1 [a-z]+$/.test(label) ? `${k} ${pluralWord(label.slice(2))}` : `${k} × ${label}`;
}

function pluralWord(w) {
  const [first, ...rest] = w.split(' ');
  const p = first === 'loaf' ? 'loaves' : /(ch|sh|x|s)$/.test(first) ? `${first}es` : `${first}s`;
  return [p, ...rest].join(' ');
}
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** How to buy one shopping-list line, from its measured total: { buy: '5 lb bag' } or { cupboard: true } or null. */
export function buyFor(entry, total) {
  const spec = entry && BUY[entry.term];
  if (!spec) return null;
  if (spec === 'pantry') return { cupboard: true };
  if (total.unknown) return null;
  const { g, ml, n } = total;
  if (spec.from) {
    const [food, per] = spec.from;
    if (ml == null) return null;
    const count = Math.max(1, Math.ceil(ml / per - 0.1));
    const f = BUY[food];
    return { buy: plural(count, f.each, f.plural) };
  }
  if (spec.each) {
    const count = n != null ? n : null;
    if (count == null) return null;
    const c = Math.max(1, Math.ceil(count - 0.1));
    return { buy: plural(c, spec.each, spec.plural) };
  }
  if (spec.weight) return g != null ? { buy: pounds(g) } : null;
  if (spec.bunch) {
    const bunches = n != null ? Math.ceil(n / 7) : ml != null ? Math.ceil(ml / 475) : 1;
    return { buy: plural(Math.max(1, bunches), 'bunch', 'bunches') };
  }
  const need = spec.by === 'g' ? g : spec.by === 'ml' ? (ml != null ? ml : g) : n;
  if (need == null || !(need > 0)) return null;
  const smallest = Math.min(...spec.packs.map(([, s]) => s));
  if (spec.by !== 'n' && smallest >= BIG_PACK && need < smallest * A_LITTLE) return { cupboard: true, little: true };
  return { buy: choosePack(spec.packs, need) };
}

/** Adds .buy (what to pick up) or .cupboard (probably at home already) to shopping-list lines, and rewrites
 *  their .text for sharing. picks: [[recipe, factor Frac], ...], the same ones the lines were made from. */
export function annotate(lines, picks) {
  const byKey = new Map(lines.filter((l) => !l.extra).map((l) => [l.key, l]));
  const totals = new Map();
  for (const [r, f] of picks) {
    const recipe = f.eq(new Frac(1n)) ? r : scaleRecipe(r, f).recipe;
    for (const ing of recipe.ings) {
      const key = itemKey(ing.item);
      if (!byKey.has(key)) continue;
      let { entry } = identify(ing.item);
      // "fat garlic clove", "cloves of garlic": garlic, not the spice
      if (entry?.term === 'clove' && /\bgarlic\b/i.test(ing.item)) entry = identify('garlic').entry;
      let t = totals.get(key);
      if (!t) totals.set(key, (t = { entry, g: null, ml: null, n: null, unknown: false }));
      if (ing.q == null && !ing.raw) continue;                 // "salt to taste": nothing to add
      // "1 can", "2 jars", "1 package": already how it's bought, so the list keeps it as written
      if (/^(cans?|tins?|jars?|packages?|pkgs?|boxes|box|bags?|bottles?|cartons?|envelopes?|containers?)$/i.test(ing.unit || '')) { t.unknown = true; continue; }
      const m = entry ? measure(ing, entry) : null;
      if (!m) { t.unknown = true; continue; }
      // a total is only kept when every part of the line had it (else it would undercount)
      if (!t.seen) { t.g = m.g; t.ml = m.ml; t.n = m.n; t.seen = true; } else {
        for (const k of ['g', 'ml', 'n']) t[k] = t[k] == null || m[k] == null ? null : t[k] + m[k];
      }
    }
  }
  // "clove garlic" and "fat garlic clove", "eggs" and "large eggs": one thing to buy, so one line
  const gone = new Set();
  const groups = new Map();
  for (const [key, t] of totals) {
    if (t.entry && MERGE.has(t.entry.term)) {
      if (!groups.has(t.entry.term)) groups.set(t.entry.term, []);
      groups.get(t.entry.term).push(key);
    }
  }
  for (const [term, keys] of groups) {
    if (keys.length < 2) continue;
    const [first, ...rest] = keys;
    const line = byKey.get(first);
    const t = totals.get(first);
    for (const k of rest) {
      const o = totals.get(k);
      const l = byKey.get(k);
      if (o.seen) {
        if (!t.seen) Object.assign(t, { g: o.g, ml: o.ml, n: o.n, seen: true });
        else for (const f of ['g', 'ml', 'n']) t[f] = t[f] == null || o[f] == null ? null : t[f] + o[f];
      }
      t.unknown ||= o.unknown;
      line.amounts.push(...l.amounts);
      line.notes.push(...l.notes);
      for (const r of l.recipes) if (!line.recipes.includes(r)) line.recipes.push(r);
      gone.add(k);
    }
    line.name = term.slice(0, 1).toUpperCase() + term.slice(1) + (term === 'egg' ? 's' : '');
  }
  for (const [key, line] of byKey) {
    if (gone.has(key)) continue;
    const t = totals.get(key);
    const how = t ? buyFor(t.entry, t.seen ? t : { ...t, unknown: true }) : null;   // no amounts at all: only the cupboard
    line.buy = how?.buy || null;
    line.cupboard = !!how?.cupboard;
    const need = [...line.amounts, ...line.notes].join(' + ');
    line.text = line.buy ? `${line.name}: ${line.buy}${need ? ` (recipes use ${need})` : ''}`
      : line.cupboard ? `${line.name} (check the cupboard${need ? `: ${need}` : ''})`
        : line.text;
  }
  return lines.filter((l) => l.extra || !gone.has(l.key)).sort((a, b) => (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0));
}
