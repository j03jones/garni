// Starter recipe packs. Two kinds:
//   - free packs picked from the built-in library (below): adding one makes a collection, works signed out;
//   - packs kept on the server (public.packs): their recipes are copied into your private recipes when you add
//     one (claim_pack). A paid pack needs Garni Pro or that pack; its recipes never sit on the public website.
import * as cloud from './cloud.js';
import * as collections from './collections.js';
import { coverKey, coverSvg } from './covers.js';
import { hasProduct, hasPro, proOffer } from './pro.js';

// Hand-picked from the built-in library (tidy titles, a real method, 4-14 ingredients). A library pack's
// recipes are free: they're part of Garni already, so these are never sold.
export const LIBRARY_PACKS = [
  { id: 'weeknights', title: '30-Minute Weeknights', cover: 'pasta',
    blurb: 'Ten dinners on the table in about half an hour: stir-fries, pasta, enchiladas and a steak night.',
    ids: ['2cfb6e434f', 'cb45b13424', '90c10d9e66', 'ebfdda30e1', '528570c99c', 'e582d1aa70', '9e7cfa2f24', 'ac3c7532ef', '25d7c7eee0', 'cfa2fcb283'] },
  { id: 'meat-free', title: 'Meat-Free Mains', cover: 'sprout',
    blurb: 'Hearty vegetarian dinners: lasagna, curry, stuffed peppers, pizza night and more.',
    ids: ['40c614dfba', '08033c14de', '136de1c526', '65004c292d', '3e4f7c442b', 'bef2ceb83d', 'a99fab6eea', '9e852688be', 'ab3956a721', '8a95ca3356'] },
  { id: 'cold-nights', title: 'Soups for Cold Nights', cover: 'soup',
    blurb: 'Barley broths, beef stews, black bean and tomato soups for the colder months.',
    ids: ['553b2e1355', 'd656a54f06', '0fc37afb55', '0fe8e95a59', 'ff6f50a1d8', 'c1fb7a9833', 'b21b7f1088', '97356af88a', 'c86f1293a3', 'd92c28394a'] },
  { id: 'party', title: 'Party Food', cover: 'cracker',
    blurb: 'Dips, little bites and a crustless quiche for a crowd, plus whoopee pies for after.',
    ids: ['14caa90a55', '6b7dc83ca4', '9069f2ecd9', '6de1f87513', 'b2e624d2e5', '4782d4fefc', 'adccd42551', '540a909726', 'dccb5e2e37', '47d8deab57'] },
  { id: 'holiday-baking', title: 'Holiday Baking', cover: 'pie',
    blurb: 'Gingerbread, spice cakes, pecan pie and cookies for the baking season.',
    ids: ['1d852a27ba', '11c4de49b4', '600f1de045', 'd68d601122', '4b137bf2bb', '9cf97c9fdc', '91cbc6b311', '69d27a9dca', '104a196252', '38b79940c1'] },
];

const price = (cents) => (cents > 0 ? `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}` : 'Free');

/** The packs on offer: the library ones, then the server ones (fetched once; none when offline or signed out of a project). */
export async function serverPacks(lib) {
  if (lib.packs) return lib.packs;
  try { lib.packs = (await cloud.listPacks()) || []; } catch { lib.packs = []; }
  return lib.packs;
}

/** A library pack added as a collection (or the collection it already became). Returns the collection id. */
export function addLibraryPack(pack) {
  const id = collections.create(pack.title);
  if (!id) return null;
  const list = collections.load();
  const c = list.find((x) => x.id === id);
  c.ids = [...new Set([...c.ids, ...pack.ids])];
  return collections.save(list) ? id : null;
}
const addedAs = (pack) => collections.load().find((c) => c.name.toLowerCase() === pack.title.toLowerCase()) || null;

function packCard(h, pack) {
  return h('a', { class: 'fcard packcard', href: `#/pack/${encodeURIComponent(pack.id)}` },
    h('span', { class: 'tile big', 'data-sec': pack.price_cents > 0 ? 1 : 2, 'aria-hidden': 'true', html: coverSvg(pack.cover || coverKey(pack.title, '')) }),
    h('span', { class: 'ft' }, pack.title),
    h('span', { class: 'fm' }, pack.ids ? `${pack.ids.length} recipes · Free` : price(pack.price_cents)));
}

/** The "Starter packs" shelf for the home feed. */
export function packShelf(ctx) {
  const { h } = ctx;
  const row = h('div', { class: 'shelfrow' }, LIBRARY_PACKS.map((p) => packCard(h, p)));
  serverPacks(ctx.lib).then((list) => { for (const p of list) row.append(packCard(h, p)); });
  return h('section', { class: 'shelf', 'aria-label': 'Starter packs' },
    h('div', { class: 'shelfhead' }, h('h2', null, 'Starter packs'), h('a', { class: 'seeall', href: '#/packs' }, 'See all')),
    row);
}

/** #/packs: every pack. */
export async function viewPacks(ctx) {
  const { h, fill, $app, setView, pageHead } = ctx;
  setView('packs', 'list');
  const grid = h('div', { class: 'packgrid' }, LIBRARY_PACKS.map((p) => packCard(h, p)));
  fill($app, pageHead('Starter packs', 'Ready-made sets of recipes to start from'), grid);
  window.scrollTo(0, 0);
  for (const p of await serverPacks(ctx.lib)) grid.append(packCard(h, p));
}

/** #/pack/<id>: what's in a pack, and adding it. */
export async function viewPack(ctx, id) {
  const { h, fill, $app, setView, pageHead, toast, lib, icon } = ctx;
  setView('packs', 'list');
  const lp = LIBRARY_PACKS.find((p) => p.id === id);
  const sp = lp ? null : (await serverPacks(lib)).find((p) => p.id === id);
  if (!lp && !sp) { fill($app, pageHead('Pack not found'), h('p', { class: 'muted' }, 'That pack isn’t available. ', h('a', { href: '#/packs' }, 'See all packs'), '.')); return; }
  const pack = lp || sp;
  const head = pageHead(pack.title, lp ? `${lp.ids.length} recipes · Free` : price(sp.price_cents));
  const cover = h('span', { class: 'tile big packcover', 'data-sec': sp?.price_cents > 0 ? 1 : 2, 'aria-hidden': 'true', html: coverSvg(pack.cover || coverKey(pack.title, '')) });
  const action = h('div', { class: 'stack' });
  const list = h('ul', { class: 'rows packlist' });

  if (lp) {
    const recipes = lp.ids.map((rid) => lib.byId.get(rid)).filter(Boolean);
    fill(list, recipes.map((r) => h('li', null, h('a', { class: 'rc', href: `#/r/${r.id}` }, ctx.thumb(r),
      h('span', { class: 'txt' }, h('span', { class: 't' }, r.title), h('span', { class: 'c' }, ctx.metaLine(r) || r.categories.slice(0, 2).join(', ')))))));
    const paint = () => {
      const c = addedAs(lp);
      fill(action, c
        ? h('div', { class: 'row grow' }, h('a', { class: 'btnlink primary', href: `#/c/${c.id}` }, 'Open my collection'), h('span', { class: 'muted small' }, '✓ Added to your collections'))
        : h('button', { type: 'button', class: 'primary', onclick: () => {
          const cid = addLibraryPack(lp);
          if (!cid) { toast('Could not save the collection on this browser'); return; }
          ctx.buzz?.([20, 30, 20]); toast(`${lp.title} added to your collections`); paint();
        } }, icon('plus', { size: 18 }), 'Add to my collections'));
    };
    paint();
  } else {
    const owned = () => sp.price_cents === 0 || hasPro(lib) || hasProduct(lib, `pack:${sp.id}`);
    try {
      const titles = await cloud.packPreview(sp.id);
      fill(list, (titles || []).map((t) => h('li', null, h('span', { class: 'rc' },
        h('span', { class: 'tile', 'aria-hidden': 'true', html: coverSvg(coverKey(t.title, (t.categories || [])[0] || '')) }),
        h('span', { class: 'txt' }, h('span', { class: 't' }, t.title))))));
    } catch { fill(list, h('p', { class: 'muted' }, 'The list of recipes needs a connection.')); }
    const paint = () => {
      if (!lib.me) { fill(action, h('p', { class: 'note' }, 'Sign in (Settings) to add this pack. Its recipes are saved with your account.')); return; }
      if (!owned()) { fill(action, proOffer(ctx, `This pack is included with Garni Pro.`)); return; }
      fill(action, h('button', { type: 'button', class: 'primary', onclick: async (e) => {
        e.currentTarget.disabled = true;
        try {
          const n = await cloud.claimPack(sp.id);
          await ctx.refreshCloud();
          toast(n ? `${n} recipes added to My recipes` : 'You already have these recipes');
          location.hash = '#/';
        } catch (err) { toast(err.message, 4500); e.currentTarget.disabled = false; }
      } }, icon('plus', { size: 18 }), 'Add to my recipes'));
    };
    paint();
  }
  fill($app, head, h('div', { class: 'packhead' }, cover, h('p', null, lp ? lp.blurb : sp.description)), action,
    h('h2', null, 'What’s inside'), list);
  window.scrollTo(0, 0);
}
