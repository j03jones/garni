// The planning screens: the meal plan, the shopping list (and sharing it with the household) and
// What can I make? (the kitchen list). Moved out of app.js; the app hands over the helpers they share
// with every screen (useApp) when it starts.
import * as cloud from './cloud.js';
import * as pantry from './pantry.js';
import * as planner from './planner.js';
import * as shop from './shopping.js';
import { Frac } from './units.js';
import { buzz, copyText, emojiFor, icon, isStarred } from './ui.js';
import { canShare, share } from './native.js';
import { draggable, swipeRow } from './motion.js';

// helpers that live in app.js (see useApp)
let $app, h, fill, toast, lib, band, pageHead, confirmDialog, setView, ensureFull, more, matches, PAGE, thumb, tick, timesLabel, firstName, DATE_FMT, DAY_FMT, syncHousehold, saveHHBase;
export function useApp(app) {
  ({ $app, h, fill, toast, lib, band, pageHead, confirmDialog, setView, ensureFull, more, matches, PAGE, thumb, tick, timesLabel, firstName, DATE_FMT, DAY_FMT, syncHousehold, saveHHBase } = app);
}

const planSeg = (on) => h('div', { class: 'seg planseg', role: 'group', 'aria-label': 'Plan or shopping list' },
  h('a', { class: 'segbtn', href: '#/plan', 'aria-current': on === 'plan' ? 'page' : null }, 'Meal plan'),
  h('a', { class: 'segbtn', href: '#/shop', 'aria-current': on === 'shop' ? 'page' : null }, 'Shopping list'));

export function pickForPlan(dayLabel) {
  return new Promise((resolve) => {
    // settle at once on a choice; the dialog's own 'close' event (Esc, Cancel) can arrive late
    let settled = false;
    const done = (value) => { if (settled) return; settled = true; if (dlg.open) dlg.close(); dlg.remove(); resolve(value); };
    const search = h('input', { type: 'search', class: 'full', placeholder: 'Search recipes', 'aria-label': 'Search recipes', autocomplete: 'off' });
    const results = h('ul', { class: 'picklist' });
    const note = h('input', { type: 'text', class: 'full', maxlength: '80', placeholder: 'Or a note: Leftovers, Eating out…', 'aria-label': 'Note' });
    const dlg = h('dialog', { class: 'pickdialog', 'aria-labelledby': 'pick-title' },
      h('h2', { id: 'pick-title' }, `Add to ${dayLabel}`),
      search, results,
      h('form', { class: 'row', onsubmit: (e) => { e.preventDefault(); if (note.value.trim()) done({ note: note.value }); } },
        note, h('button', { type: 'submit' }, 'Add note')),
      h('div', { class: 'row' }, h('button', { type: 'button', onclick: () => done(null) }, 'Cancel')));
    function paint() {
      const q = search.value.trim();
      // nothing typed yet: starred recipes are the likeliest picks
      const found = (q ? matches(q, '') : lib.all.filter((r) => isStarred(r.id))).filter((r) => r.kind !== 'link').slice(0, 40);
      fill(results, found.length
        ? found.map((r) => h('li', null, h('button', { type: 'button', onclick: () => done({ id: r.id, f: '1' }) },
          h('span', { class: 'e', 'aria-hidden': 'true' }, emojiFor(r.categories[0])), r.title)))
        : h('li', { class: 'muted small' }, q ? 'No recipes match.' : 'Type to search, or star recipes to see them here.'));
    }
    search.addEventListener('input', paint);
    dlg.addEventListener('close', () => done(null));
    document.body.append(dlg);
    paint();
    dlg.showModal();
  });
}

/** Pick a day (today and the next two weeks) for a recipe. Resolves to 'YYYY-MM-DD' or null. */
export function pickDay(title) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => { if (settled) return; settled = true; if (dlg.open) dlg.close(); dlg.remove(); resolve(value); };
    const today = planner.isoDate(new Date());
    const plan = planner.load();
    const dlg = h('dialog', { class: 'pickdialog', 'aria-labelledby': 'day-title' },
      h('h2', { id: 'day-title' }, 'Which day?'),
      h('p', { class: 'muted small' }, title),
      h('ul', { class: 'picklist' }, Array.from({ length: 14 }, (_, n) => planner.addDays(today, n)).map((d) => {
        const n = (plan.days[d] || []).length;
        return h('li', null, h('button', { type: 'button', onclick: () => done(d) },
          h('strong', null, d === today ? 'Today' : DAY_FMT.format(planner.parseDate(d))), ` ${DATE_FMT.format(planner.parseDate(d))}`,
          n > 0 && h('span', { class: 'muted small' }, `  ·  ${n} planned`)));
      })),
      h('div', { class: 'row' }, h('button', { type: 'button', onclick: () => done(null) }, 'Cancel')));
    dlg.addEventListener('close', () => done(null));
    document.body.append(dlg);
    dlg.showModal();
  });
}

let planWeek = null;   // Monday of the week on screen; stays put while you move between pages

// The meal plan: a week at a time, a few recipes or notes on each day.
export function viewPlan() {
  setView('plan', 'plan');
  const today = planner.isoDate(new Date());
  if (!planWeek) planWeek = planner.weekStart(today);
  const body = h('div');
  const sub = h('p', { class: 'sub' });
  function paint() {
    const plan = planner.load();
    const dates = planner.weekDates(planWeek);
    const thisWeek = planWeek === planner.weekStart(today);
    sub.textContent = thisWeek ? 'This week' : `Week of ${DATE_FMT.format(planner.parseDate(planWeek))}`;
    const planned = planner.recipesOn(plan, dates).filter(([id]) => lib.byId.get(id));
    fill(body,
      h('div', { class: 'row weeknav' },
        h('button', { type: 'button', 'aria-label': 'Previous week', onclick: () => { planWeek = planner.addDays(planWeek, -7); paint(); } }, '‹ Earlier'),
        h('button', { type: 'button', disabled: thisWeek, onclick: () => { planWeek = planner.weekStart(today); paint(); } }, 'This week'),
        h('button', { type: 'button', 'aria-label': 'Next week', onclick: () => { planWeek = planner.addDays(planWeek, 7); paint(); } }, 'Later ›')),
      dates.map((d) => {
        const label = `${DAY_FMT.format(planner.parseDate(d))} ${DATE_FMT.format(planner.parseDate(d))}`;
        const entries = plan.days[d] || [];
        return h('section', { class: `planday${d === today ? ' today' : ''}${d < today ? ' past' : ''}`, 'data-date': d },
          h('h2', null, DAY_FMT.format(planner.parseDate(d)), h('span', { class: 'muted' }, ` ${DATE_FMT.format(planner.parseDate(d))}`), d === today && h('span', { class: 'label' }, 'Today')),
          entries.length > 0 && h('ul', { class: 'shoprecipes' }, entries.map((e, n) => {
            const r = e.id ? lib.byId.get(e.id) : null;
            const what = e.note || r?.title || 'this';
            const moveTo = (to) => { if (to === d) return; if (planner.move(d, n, to)) { buzz(8); toast(`Moved to ${DAY_FMT.format(planner.parseDate(to))}`); } paint(); };
            return draggable(h('li', { class: 'planitem', title: 'Press and hold, then drag to another day' },
              e.note ? h('span', { class: 'plannote' }, e.note)
                : r ? h('a', { href: `#/r/${r.id}` }, r.title)
                  : h('span', { class: 'muted' }, 'A recipe that is no longer in the library'),
              r && h('span', { class: 'muted' }, ` ${timesLabel(Frac.parse(e.f) || new Frac(1n))}`),
              h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Move ${what} to another day`, title: 'Move to another day',
                onclick: async () => { const to = await pickDay(`Move ${what}`); if (to) moveTo(to); } }, icon('move', { size: 18 })),
              h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Take ${what} off ${label}`, title: 'Take off the plan',
                onclick: () => { planner.removeAt(d, n); paint(); } }, icon('close', { size: 18 }))),
            { home: null, targets: () => [...body.querySelectorAll('.planday')], onDrop: (sec) => moveTo(sec.dataset.date) });
          })),
          h('button', { class: 'addday', type: 'button', 'aria-label': `Add to ${label}`, onclick: async () => {
            const entry = await pickForPlan(label);
            if (entry && !planner.add(d, entry)) toast('Could not save the meal plan on this browser');
            paint();
          } }, icon('plus', { size: 18 }), 'Add'));
      }),
      h('section', { class: 'tools stack' },
        h('div', { class: 'row grow' },
          h('button', { class: 'primary', type: 'button', disabled: !planned.length, onclick: () => {
            for (const [id, f] of planned) shop.add(id, f);   // the amount the plan says, so pressing twice doesn't double it
            toast(`${planned.length} ${planned.length === 1 ? 'recipe' : 'recipes'} added to the shopping list`);
            location.hash = '#/shop';
          } }, 'Add this week to the shopping list'),
          h('button', { type: 'button', disabled: !dates.some((d) => plan.days[d]), onclick: async () => {
            if (await confirmDialog('Clear every meal planned for this week?', 'Clear week', true)) { planner.clearDates(dates); paint(); }
          } }, 'Clear week')),
        h('p', { class: 'muted small' }, lib.me
          ? 'Your meal plan and shopping list are saved with your account, so they follow you between your phone and computer.'
          : 'Your meal plan is kept on this device. Sign in (Settings) to have it follow you between your phone and computer.'),
        lib.planSyncError && h('p', { class: 'note' }, `Not saved to your account yet: ${lib.planSyncError}`)));
  }
  fill($app, band('page', h('h1', null, 'Meal plan'), sub), planSeg('plan'), body);
  paint();
  window.scrollTo(0, 0);
}

// The shopping list: every recipe added from its page or from the meal plan, combined into one
// list grouped by aisle, plus anything typed in by hand.
const SKIP_HAVE_KEY = 'recipelib.shop.skiphave';
const skipHave = () => { try { return localStorage.getItem(SKIP_HAVE_KEY) !== '0'; } catch { return true; } };
const setSkipHave = (on) => { try { localStorage.setItem(SKIP_HAVE_KEY, on ? '1' : '0'); } catch { /* private mode */ } };

export function viewShop() {
  setView('shop', 'plan');
  const body = h('div');
  const extraIn = h('input', { type: 'text', class: 'full', maxlength: '120', placeholder: 'Add something else: paper towels, coffee…', 'aria-label': 'Add an item' });
  const extraForm = h('form', { class: 'row addextra', onsubmit: (e) => {
    e.preventDefault();
    if (!extraIn.value.trim()) return;
    if (!shop.addExtra(extraIn.value)) toast('Could not save the shopping list on this browser');
    extraIn.value = '';
    paint();
    extraIn.focus();
  } }, extraIn, h('button', { type: 'submit' }, 'Add'));
  // the meal plan from today through the next six days, ready to drop onto the list
  const planAhead = () => {
    const today = planner.isoDate(new Date());
    return planner.recipesOn(planner.load(), planner.weekDates(today)).filter(([id]) => lib.byId.get(id));
  };
  const importPlan = () => {
    const planned = planAhead();
    for (const [id, f] of planned) shop.add(id, f);     // sets the amount to what the plan says, so tapping twice doesn't double it
    toast(`${planned.length} ${planned.length === 1 ? 'recipe' : 'recipes'} from your meal plan`);
    paint();
  };
  const planButton = (cls = '') => {
    const n = planAhead().length;
    return n > 0 && h('button', { class: cls, type: 'button', onclick: importPlan }, `Add my meal plan (${n} ${n === 1 ? 'recipe' : 'recipes'}, next 7 days)`);
  };
  function paint() {
    const list = shop.load();
    let picks = list.items.map((i) => [lib.byId.get(i.id), Frac.parse(i.f) || new Frac(1n)]).filter(([r]) => r && r.kind !== 'link');
    // recipes from the on-demand library need their amounts before they can be added up
    const waiting = picks.filter(([r]) => r.stub && !more.failed.has(r.id));
    if (waiting.length) {
      fill(body, h('p', { class: 'muted', role: 'status' }, 'Getting the recipes…'));
      ensureFull(waiting.map(([r]) => r.id)).then((missing) => { missing.forEach((id) => more.failed.add(id)); if (document.body.dataset.view === 'shop') paint(); });
      return;
    }
    const offline = picks.filter(([r]) => r.stub);
    picks = picks.filter(([r]) => !r.stub);
    if (!picks.length && !list.extras.length && !offline.length) {
      fill(body, h('div', { class: 'empty' },
        h('h2', null, 'Nothing on the list yet'),
        h('p', { class: 'muted' }, 'Open a recipe and choose “Add to shopping list”, or plan your week and add it all at once. The same ingredient from different recipes is added up into one line.'),
        planButton('primary'),
        h('div', { class: 'row', style: 'justify-content:center; margin-top:.8rem' },
          h('a', { class: 'linkbtn', href: '#/plan' }, 'Plan the week'),
          h('a', { class: 'linkbtn', href: '#/' }, 'Browse the recipes'))));
      return;
    }
    const all = [...shop.shoppingList(picks), ...shop.extraLines(list.extras)];
    // things listed under "What can I make?" are already in the kitchen: set them aside, don't buy them
    const kitchen = pantry.load();
    const mine = skipHave() ? pantry.terms(kitchen.have) : [];
    const isHave = (l) => !l.extra && mine.length > 0 && pantry.covers(l.key, mine);
    const lines = all.filter((l) => !isHave(l));
    const have = all.filter(isHave);
    const done = new Set(list.done);
    const left = lines.filter((l) => !done.has(l.key));
    const skipIn = h('input', { type: 'checkbox', checked: skipHave(), onchange: () => { setSkipHave(skipIn.checked); paint(); } });
    const text = () => `Shopping list\n${picks.map(([r, f]) => `${r.title}${f.eq(new Frac(1n)) ? '' : ` (${timesLabel(f)})`}`).join('\n')}\n\n${shop.toTextByAisle(left)}`;
    fill(body,
      picks.length > 0 && h('ul', { class: 'shoprecipes' }, picks.map(([r, f]) => h('li', null,
        h('a', { href: `#/r/${r.id}` }, r.title),
        !f.eq(new Frac(1n)) && h('span', { class: 'muted' }, ` ${timesLabel(f)}`),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Take ${r.title} off the list`, title: 'Take off the list',
          onclick: () => { shop.remove(r.id); paint(); } }, icon('close', { size: 18 }))))),
      offline.length > 0 && h('p', { class: 'note' }, `Not counted yet (needs a connection the first time): ${offline.map(([r]) => r.title).join(', ')}. `,
        h('button', { type: 'button', onclick: () => { more.failed.clear(); paint(); } }, 'Try again')),
      planAhead().some(([id, f]) => !list.items.some((i) => i.id === id && (Frac.parse(i.f) || new Frac(1n)).cmp(f) >= 0)) && planButton(),
      h('p', { class: 'muted small', role: 'status' }, left.length === lines.length
        ? `${lines.length} ${lines.length === 1 ? 'thing' : 'things'} to get`
        : `${left.length} of ${lines.length} still to get`),
      shop.byAisle(lines).map(([aisle, group]) => [
        h('h3', { class: 'aisle' }, aisle),
        h('ul', { class: 'ing shoplist' }, group.map((l) => {
          const btn = h('button', { class: 'tick', type: 'button', 'aria-pressed': String(done.has(l.key)),
            title: l.recipes.join(', '),
            onclick: () => { shop.setDone(l.key, btn.getAttribute('aria-pressed') !== 'true'); buzz(6); paint(); } },
          h('span', { class: 'box' }, icon('check', { size: 16 })),
          h('span', { class: 'what' }, l.name, (l.amounts.length > 0 || l.notes.length > 0) && h('b', null, ` ${[...l.amounts, ...l.notes].join(' + ')}`)));
          return swipeRow(h('li', { class: l.extra ? 'extra' : null }, btn,
            l.extra && h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Remove ${l.name}`, title: 'Remove',
              onclick: () => { shop.removeExtra(l.key); paint(); } }, icon('close', { size: 18 }))), {
            onRight: () => { shop.setDone(l.key, !done.has(l.key)); buzz(6); paint(); },
            rightLabel: done.has(l.key) ? 'Not yet' : 'Got it',
            onLeft: l.extra ? () => { shop.removeExtra(l.key); buzz(6); paint(); } : null,
          });
        }))]),
      kitchen.have.length > 0 && h('label', { class: 'check', style: 'margin-top:1.2rem' }, skipIn, 'Leave out what I already have ',
        h('a', { href: '#/pantry' }, '(my kitchen)')),
      have.length > 0 && h('details', { class: 'havebox' },
        h('summary', null, `${have.length} ${have.length === 1 ? 'thing' : 'things'} you already have`),
        h('ul', { class: 'havelist' }, have.map((l) => h('li', null, l.name, (l.amounts.length > 0 || l.notes.length > 0) && h('span', { class: 'muted' }, ` ${[...l.amounts, ...l.notes].join(' + ')}`))))),
      h('section', { class: 'tools stack' },
        h('div', { class: 'row grow' },
          h('button', { type: 'button', onclick: async () => toast(await copyText(text()) ? 'Shopping list copied' : 'Could not copy on this browser') }, 'Copy'),
          canShare() && h('button', { type: 'button', onclick: () => share({ title: 'Shopping list', text: text() }) }, 'Share'),
          h('button', { type: 'button', onclick: () => window.print() }, 'Print'),
          h('button', { type: 'button', onclick: async () => {
            if (await confirmDialog('Clear the whole shopping list?', 'Clear list', true)) { shop.clear(); paint(); }
          } }, 'Clear list')),
        h('p', { class: 'muted small' }, 'Amounts are added up when they are the same kind of measure (cups with tablespoons, pounds with ounces). ',
          lib.me ? 'The list is saved with your account.' : 'The list is kept on this device; sign in to have it follow you.'),
        lib.planSyncError && h('p', { class: 'note' }, `Not saved to your account yet: ${lib.planSyncError}`)));
  }
  // sharing the list with the people you live with
  const sharedNote = h('div');
  const hhCard = h('div');
  const names = (list) => list.length <= 1 ? 'just you so far' : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
  function paintHousehold() {
    const hh = lib.household;
    fill(sharedNote, hh && h('p', { class: 'sharednote' }, '🏠 Shared with ', h('strong', null, hh.name), ` · ${names(hh.members || [])}`));
    if (!lib.me) { fill(hhCard); return; }
    if (hh) {
      const msg = `Join my household “${hh.name}” on Garni so we share one shopping list. In Garni: Plan › Shopping list › Join a household, and enter ${hh.code}.`;
      fill(hhCard, h('section', { class: 'card stack household' },
        h('h2', null, '🏠 ', hh.name),
        h('p', { class: 'muted small' }, `Everyone in it sees and changes this list: ${names(hh.members || [])}. Changes show up on the others’ phones within a few seconds.`),
        h('div', { class: 'stat' }, h('span', null, 'Join code'), h('strong', { class: 'code' }, hh.code)),
        h('div', { class: 'row grow' },
          canShare() ? h('button', { type: 'button', class: 'primary', onclick: () => share({ title: 'Join my Garni household', text: msg }) }, 'Invite someone')
            : h('button', { type: 'button', class: 'primary', onclick: async () => toast(await copyText(msg) ? 'Invite copied' : 'Could not copy') }, 'Copy an invite'),
          h('button', { type: 'button', class: 'danger', onclick: async () => {
            if (!await confirmDialog(`Leave ${hh.name}? Your list stays on this phone, but stops being shared.`, 'Leave', true)) return;
            try { await cloud.leaveHousehold(); } catch (err) { toast(err.message, 4000); return; }
            lib.household = null; saveHHBase(null); toast('You left the household'); paintHousehold();
          } }, 'Leave')),
        lib.householdError && h('p', { class: 'note' }, `Not synced right now: ${lib.householdError}`)));
      return;
    }
    const nameIn = h('input', { class: 'full', maxlength: '60', value: `${firstName() || 'Our'}${firstName() ? '’s' : ''} home`, 'aria-label': 'Household name' });
    const codeIn = h('input', { class: 'full', maxlength: '12', placeholder: 'ABC234', autocapitalize: 'characters', autocomplete: 'off', 'aria-label': 'Household code' });
    const after = async (fn, done) => {
      try { await fn(); } catch (err) { toast(err.message, 4500); return; }
      await syncHousehold(); toast(done); paint(); paintHousehold();
    };
    fill(hhCard, h('details', { class: 'card stack household' },
      h('summary', null, '🏠 Share this list with your household'),
      h('p', { class: 'muted small' }, 'Everyone in a household shares one shopping list: tick something off and it’s ticked on their phones too. Up to 8 people.'),
      h('label', { class: 'field' }, h('span', null, 'Start one'), nameIn),
      h('button', { type: 'button', class: 'primary', onclick: () => after(() => cloud.createHousehold(nameIn.value.trim() || 'Home'), 'Household started. Invite the others with its code.') }, 'Start a household'),
      h('label', { class: 'field' }, h('span', null, 'Or join one with its code'), codeIn),
      h('button', { type: 'button', onclick: () => { if (codeIn.value.trim()) after(() => cloud.joinHousehold(codeIn.value.trim()), 'You joined the household'); } }, 'Join a household')));
  }
  fill($app, pageHead('Shopping list', 'Everything for the recipes you picked, in one list'), planSeg('shop'), sharedNote, extraForm, body, hhCard);
  paint();
  paintHousehold();
  if (lib.me) syncHousehold().then(paintHousehold);
  window.scrollTo(0, 0);
}

// What can I make? Type what is in the kitchen; recipes are ranked by how little is missing.
export function viewPantry() {
  setView('pantry', 'list');
  const body = h('div');
  const input = h('input', { type: 'text', class: 'full', maxlength: '200', placeholder: 'chicken, rice, onions…', 'aria-label': 'Ingredients you have', autocapitalize: 'off', autocomplete: 'off' });
  const form = h('form', { class: 'row addextra', onsubmit: (e) => {
    e.preventDefault();
    if (!input.value.trim()) return;
    if (!pantry.add(input.value)) toast('Could not save on this browser');
    input.value = '';
    paint();
    input.focus();
  } }, input, h('button', { type: 'submit' }, 'Add'));
  let shown = PAGE;
  function paint() {
    const p = pantry.load();
    const staplesIn = h('input', { type: 'checkbox', checked: p.staples, onchange: () => { pantry.setStaples(staplesIn.checked); paint(); } });
    const chips = h('div', { class: 'chips have', role: 'group', 'aria-label': 'Ingredients you have' }, p.have.map((name) =>
      h('button', { class: 'chip', type: 'button', 'aria-label': `Remove ${name}`, title: 'Remove', onclick: () => { pantry.remove(name); paint(); } }, name, h('span', { 'aria-hidden': 'true' }, ' ×'))));
    if (!p.have.length) {
      fill(body, h('div', { class: 'empty' },
        h('h2', null, 'What is in your kitchen?'),
        h('p', { class: 'muted' }, 'Add the main things you have, a few at a time or separated by commas. You will see the recipes you can make now, then the ones that need one or two more things.')));
      return;
    }
    const found = pantry.match(lib.all.filter((r) => r.kind !== 'link'), p.have, { assumeStaples: p.staples, limit: 400 });
    const ready = found.filter((m) => !m.missing.length).length;
    fill(body, chips,
      h('label', { class: 'check' }, staplesIn, `I have the basics (${pantry.STAPLES.join(', ')})`),
      h('p', { class: 'count muted small', role: 'status' }, found.length
        ? `${ready ? `${ready.toLocaleString()} you can make now` : 'Nothing you can make with only these'}${found.length > ready ? `, ${(found.length - ready).toLocaleString()} more need one or two things` : ''}`
        : 'No recipes use these yet. Add a few more things.'),
      h('ul', { class: 'rows' }, found.slice(0, shown).map(({ recipe: r, missing }) => h('li', null,
        h('a', { class: 'rc', href: `#/r/${r.id}` }, thumb(r),
          h('span', { class: 'txt' }, h('span', { class: 't' }, r.title),
            h('span', { class: `s ${missing.length ? '' : 'ready'}` }, missing.length ? `Needs ${missing.join(' and ')}` : 'You have everything'))),
        h('div', { class: 'rowacts' },
          h('button', { type: 'button', 'aria-label': `Add ${r.title} to the meal plan`, onclick: async () => {
            const day = await pickDay(r.title);
            if (day && planner.add(day, { id: r.id, f: '1' })) toast(`Planned for ${day === planner.isoDate(new Date()) ? 'today' : DAY_FMT.format(planner.parseDate(day))}`);
          } }, 'Plan it'),
          missing.length > 0 && h('button', { type: 'button', 'aria-label': `Put what ${r.title} needs on the shopping list`, onclick: (e) => {
            if (!shop.has(r.id)) shop.add(r.id, new Frac(1n));
            e.currentTarget.textContent = '✓ On the list';
            toast(`On the shopping list: you only need ${missing.join(' and ')}`);
          } }, shop.has(r.id) ? '✓ On the list' : `Shop for ${missing.length === 1 ? 'it' : 'them'}`))))),
      found.length > shown && h('button', { class: 'more', onclick: () => { shown += PAGE; paint(); } }, 'Show more'),
      h('div', { class: 'row', style: 'margin-top:1rem' },
        h('button', { type: 'button', onclick: async () => {
          if (await confirmDialog('Clear everything you listed?', 'Clear', true)) { pantry.save({ have: [], staples: p.staples }); shown = PAGE; paint(); }
        } }, 'Start over')));
  }
  fill($app, pageHead('What can I make?', 'Recipes from what you have on hand'), form, body);
  paint();
  window.scrollTo(0, 0);
}

/** Choose which collections a recipe is in (and make new ones). */
