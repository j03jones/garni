// The admin's pack builder (#/packbuilder): make starter packs and fill them with recipes.
// Recipes go in from your own recipes in your account: write one (New recipe), import a link as your own
// version, or import files (Paprika, Mealie...), then add it here. A straight copy of another website's
// recipe can't go in (the database refuses it too): make your own version of it first.
import * as cloud from './cloud.js';

const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const dollars = (cents) => (cents ? (cents / 100).toFixed(2).replace(/\.00$/, '') : '0');

/** Why a recipe can't go in a pack, or '' when it can. */
export function packBlocker(row) {
  const b = row.body || {};
  if (b.kind === 'link') return 'a link card';
  if (b.src?.url && !b.adapted) return 'another website’s text: make your own version first';
  return '';
}

function guard(ctx) {
  const { h, fill, $app, pageHead, lib } = ctx;
  if (lib.me?.role === 'admin') return true;
  fill($app, pageHead('Pack builder'), h('p', { class: 'muted' }, 'This page is for the administrator.'));
  return false;
}

/** #/packbuilder: every pack, published or not, and a new one. */
export async function viewPackBuilder(ctx) {
  const { h, fill, $app, setView, pageHead, toast } = ctx;
  setView('admin', 'settings');
  if (!guard(ctx)) return;
  const list = h('ul', { class: 'rows' }, h('li', { class: 'muted' }, 'Loading…'));
  const name = h('input', { class: 'full', placeholder: 'e.g. Sunday Roasts', 'aria-label': 'New pack name' });
  const make = async () => {
    const title = name.value.trim();
    if (!title) { name.focus(); return; }
    const id = slug(title);
    if (!id) { toast('Use some letters or numbers in the name'); return; }
    try {
      await cloud.adminSavePack({ id, title, description: '', price_cents: 0, published: false, sort: 100 }, true);
      location.hash = `#/packbuilder/${id}`;
    } catch (err) { toast(/duplicate|unique/i.test(err.message) ? 'There’s already a pack with that name' : err.message, 4500); }
  };
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') make(); });
  fill($app, pageHead('Pack builder', 'Starter packs kept on the server'),
    h('p', { class: 'muted small' }, 'The free packs picked from the library are in web/js/packs.js. Packs here hold their own copies of recipes, and people add them to their recipes from the pack’s page.'),
    h('section', { class: 'card stack' },
      h('label', { class: 'field' }, h('span', null, 'Start a new pack'), name),
      h('button', { type: 'button', class: 'primary', onclick: make }, ctx.icon('plus', { size: 18 }), 'Make the pack')),
    h('h2', null, 'Your packs'), list);
  window.scrollTo(0, 0);
  try {
    const packs = await cloud.adminPacks();
    fill(list, packs.length ? packs.map((p) => h('li', null, h('a', { class: 'rc', href: `#/packbuilder/${encodeURIComponent(p.id)}` },
      h('span', { class: 'txt' }, h('span', { class: 't' }, p.title),
        h('span', { class: 'c' }, [p.published ? 'Published' : 'Draft', p.price_cents ? `$${dollars(p.price_cents)}` : 'Free'].join(' · '))))))
      : h('li', { class: 'muted' }, 'No packs yet.'));
  } catch (err) { fill(list, h('li', { class: 'note' }, err.message)); }
}

/** #/packbuilder/<id>: a pack's details and its recipes. */
export async function viewPackEdit(ctx, id) {
  const { h, fill, $app, setView, pageHead, toast, lib, confirmDialog } = ctx;
  setView('admin', 'settings');
  if (!guard(ctx)) return;
  let pack;
  try { pack = (await cloud.adminPacks()).find((p) => p.id === id); } catch (err) { toast(err.message, 4500); return; }
  if (!pack) { fill($app, pageHead('Pack not found'), h('p', null, h('a', { href: '#/packbuilder' }, 'Back to the pack builder'))); return; }

  const title = h('input', { class: 'full', value: pack.title, 'aria-label': 'Pack title' });
  const desc = h('textarea', { 'aria-label': 'Pack description', placeholder: 'One or two sentences: what’s in it and who it’s for.' });
  desc.value = pack.description || '';
  const price = h('input', { class: 'full', type: 'number', min: '0', step: '0.01', value: dollars(pack.price_cents), 'aria-label': 'Price in dollars' });
  const sort = h('input', { class: 'full', type: 'number', step: '1', value: String(pack.sort ?? 0), 'aria-label': 'Order on the shelf' });
  const published = h('input', { type: 'checkbox', checked: !!pack.published, 'aria-label': 'Published' });
  const save = async () => {
    const cents = Math.round(Number(price.value || 0) * 100);
    if (!title.value.trim()) { title.focus(); return; }
    if (!(cents >= 0)) { price.focus(); return; }
    try {
      await cloud.adminSavePack({ id, title: title.value.trim(), description: desc.value.trim(), price_cents: cents, published: published.checked, sort: Number(sort.value) || 0 }, false);
      lib.packs = null;                   // the shelves fetch the packs again
      toast('Pack saved');
    } catch (err) { toast(err.message, 4500); }
  };

  const inside = h('ul', { class: 'rows' });
  const picker = h('div', { class: 'stack' });
  let current = [];
  const paintInside = async () => {
    try { current = await cloud.adminPackRecipes(id); } catch (err) { fill(inside, h('li', { class: 'note' }, err.message)); return; }
    fill(inside, current.length ? current.map((r) => h('li', { class: 'row' },
      h('span', { class: 'grow' }, r.title),
      h('button', { type: 'button', class: 'danger', 'aria-label': `Take ${r.title} out of the pack`, onclick: async () => {
        try { await cloud.adminRemoveFromPack(r.id); toast('Taken out'); paintInside(); } catch (err) { toast(err.message, 4500); }
      } }, 'Take out')))
      : h('li', { class: 'muted' }, 'No recipes in this pack yet.'));
    paintPicker();
  };
  const paintPicker = () => {
    const have = new Set(current.map((r) => r.title.toLowerCase()));
    const mine = (lib.cloud || []).filter((r) => r.owner_id === lib.me.id && r.scope === 'private' && !r.pack_id && !have.has(r.title.toLowerCase()));
    const search = h('input', { class: 'full', type: 'search', placeholder: 'Find one of your recipes', 'aria-label': 'Find one of your recipes' });
    const box = h('ul', { class: 'rows picklist' });
    const chosen = new Set();
    const add = h('button', { type: 'button', class: 'primary', disabled: true, onclick: async () => {
      const rows = mine.filter((r) => chosen.has(r.id));
      try {
        await cloud.adminAddToPack(id, rows, current.length);
        toast(`${rows.length} ${rows.length === 1 ? 'recipe' : 'recipes'} added to the pack`);
        paintInside();
      } catch (err) { toast(err.message, 5000); }
    } }, 'Add to the pack');
    const paintRows = () => {
      const q = search.value.trim().toLowerCase();
      const shown = mine.filter((r) => !q || r.title.toLowerCase().includes(q)).slice(0, 60);
      fill(box, shown.length ? shown.map((r) => {
        const why = packBlocker(r);
        const cb = h('input', { type: 'checkbox', disabled: !!why, checked: chosen.has(r.id), onchange: () => {
          if (cb.checked) chosen.add(r.id); else chosen.delete(r.id);
          add.disabled = !chosen.size;
          add.textContent = chosen.size ? `Add ${chosen.size} to the pack` : 'Add to the pack';
        } });
        return h('li', null, h('label', { class: 'row' }, cb, h('span', null, r.title, why && h('span', { class: 'muted small' }, ` (${why})`)),
          why && /website/.test(why) && h('a', { class: 'small', href: `#/r/${encodeURIComponent(r.id)}` }, 'Open it')));
      }) : h('li', { class: 'muted' }, mine.length ? 'No match.' : 'None of your recipes are left to add.'));
    };
    search.addEventListener('input', paintRows);
    fill(picker, search, box, add);
    paintRows();
  };

  const del = async () => {
    if (!await confirmDialog(`Delete the pack “${pack.title}”? Copies people already added stay in their recipes.`, 'Delete pack', true)) return;
    try { await cloud.adminDeletePack(id); lib.packs = null; toast('Pack deleted'); location.hash = '#/packbuilder'; } catch (err) { toast(err.message, 4500); }
  };

  fill($app, pageHead(pack.title, `Pack id: ${id}`),
    h('section', { class: 'card stack' },
      h('label', { class: 'field' }, h('span', null, 'Title'), title),
      h('label', { class: 'field' }, h('span', null, 'Description'), desc),
      h('label', { class: 'field' }, h('span', null, 'Price in dollars (0 = free; paid packs are included with Pro)'), price),
      h('label', { class: 'field' }, h('span', null, 'Order on the shelf (smaller comes first)'), sort),
      h('label', { class: 'row' }, published, h('span', null, 'Published: shown to everyone')),
      h('div', { class: 'row grow' },
        h('button', { type: 'button', class: 'primary', onclick: save }, 'Save pack'),
        h('a', { class: 'btnlink', href: `#/pack/${encodeURIComponent(id)}` }, 'See its page'))),
    h('h2', null, 'In this pack'), inside,
    h('h2', null, 'Add recipes'),
    h('p', { class: 'muted small' }, 'Pick from the recipes in your account. To get more in first: ',
      h('a', { href: '#/new' }, 'write one'), ', ', h('a', { href: '#/import' }, 'import a link as your own version'), ', or ',
      h('a', { href: '#/transfer' }, 'import files'), '. Copies of other websites’ recipes can’t go in a pack until you make your own version.'),
    picker,
    h('div', { class: 'actions row' }, h('button', { type: 'button', class: 'danger', onclick: del }, 'Delete pack')));
  window.scrollTo(0, 0);
  paintInside();
}
