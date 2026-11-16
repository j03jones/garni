// Small things this device remembers: recipes opened lately, the text size, things often added to the list.
// All of it stays on this device (localStorage); none of it is synced or sent anywhere.
const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

// ---- recently opened recipes ("Jump back in" on the home feed)
const VIEWED = 'garni.viewed';
const MAX_VIEWED = 24;
export const viewedIds = () => { const v = get(VIEWED, []); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; };
export function noteViewed(id) {
  if (!id) return;
  put(VIEWED, [id, ...viewedIds().filter((x) => x !== id)].slice(0, MAX_VIEWED));
}
export const forgetViewed = () => put(VIEWED, []);

// ---- text size: the whole app is sized in rem, so the root font size scales everything
export const TEXT_SIZES = [
  { id: 'sm', label: 'Smaller', scale: 0.9 },
  { id: 'md', label: 'Default', scale: 1 },
  { id: 'lg', label: 'Larger', scale: 1.12 },
  { id: 'xl', label: 'Largest', scale: 1.25 },
];
const TEXT = 'garni.textsize';
export const textSize = () => TEXT_SIZES.find((t) => t.id === get(TEXT, 'md')) || TEXT_SIZES[1];
export function applyTextSize(id = textSize().id) {
  const t = TEXT_SIZES.find((x) => x.id === id) || TEXT_SIZES[1];
  put(TEXT, t.id);
  document.documentElement.style.fontSize = t.scale === 1 ? '' : `${t.scale * 100}%`;
  document.documentElement.dataset.textsize = t.id;
  return t;
}

// ---- things often typed into the shopping list ("paper towels", "milk"): offered as one-tap chips
const USUAL = 'garni.usual';
const MAX_USUAL = 40;
const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');
/** [{ text, n, at }], most used first. */
export function usualItems() {
  const v = get(USUAL, []);
  return (Array.isArray(v) ? v : []).filter((x) => x && typeof x.text === 'string')
    .sort((a, b) => b.n - a.n || b.at - a.at);
}
export function noteUsual(text) {
  const t = text.trim();
  if (!t || t.length > 80) return;
  const list = usualItems();
  const hit = list.find((x) => norm(x.text) === norm(t));
  if (hit) { hit.n += 1; hit.at = Date.now(); } else list.push({ text: t, n: 1, at: Date.now() });
  // keep the most used; ties go to the most recent
  put(USUAL, list.sort((a, b) => b.n - a.n || b.at - a.at).slice(0, MAX_USUAL));
}
export function forgetUsual(text) {
  put(USUAL, usualItems().filter((x) => norm(x.text) !== norm(text)));
}
