// Which recipes to show first. Garni has no view counts for its built-in library, so "popular" means the
// dishes most people actually cook (the usual favourites in American kitchens and on recipe sites), with a
// nudge towards recipes that are complete and tidy. Pure functions (tested in Node).
//
// Once Garni has many accounts, stars and cook logs could feed in here too (see popularity()).

// [words in the title, weight]: 3 = everyone's favourite, 2 = very common, 1 = well known
const DISHES = [
  // dinners
  ['lasagna', 3], ['chili', 3], ['meatloaf', 3], ['pot roast', 3], ['beef stew', 3], ['chicken pot pie', 3],
  ['macaroni and cheese', 3], ['mac and cheese', 3], ['spaghetti and meatballs', 3], ['meatballs', 2], ['tacos', 3],
  ['enchiladas', 3], ['fajitas', 2], ['chicken parmesan', 3], ['fettuccine alfredo', 3], ['alfredo', 2],
  ['stir fry', 2], ['fried rice', 3], ['chicken noodle soup', 3], ['tortilla soup', 2], ['potato soup', 2],
  ['shepherd', 2], ['casserole', 1], ['chicken and dumplings', 3], ['fried chicken', 3], ['roast chicken', 3],
  ['chicken curry', 2], ['curry', 1], ['pulled pork', 3], ['pork chops', 2], ['ribs', 2], ['brisket', 2],
  ['burgers', 2], ['hamburger', 2], ['sloppy joe', 2], ['jambalaya', 2], ['gumbo', 2], ['red beans and rice', 2],
  ['chicken salad', 2], ['tuna salad', 1], ['quiche', 2], ['frittata', 1], ['stuffed peppers', 2],
  ['stroganoff', 2], ['teriyaki', 2], ['orange chicken', 2], ['lo mein', 2], ['pad thai', 2], ['ziti', 2],
  ['pizza', 2], ['calzone', 1], ['carbonara', 2], ['bolognese', 2], ['scampi', 2], ['salmon', 1], ['shrimp and grits', 2],
  ['chicken wings', 2], ['buffalo', 1], ['barbecue chicken', 2], ['bbq chicken', 2], ['cheeseburger', 2],
  ['chicken fried steak', 2], ['country fried steak', 2], ['beef and broccoli', 2], ['general tso', 2], ['ramen', 1],
  ['minestrone', 2], ['french onion soup', 2], ['clam chowder', 2], ['corn chowder', 1], ['split pea soup', 1],
  ['black bean soup', 1], ['lentil soup', 1], ['vegetable soup', 1], ['broccoli cheddar', 2],
  // sides and salads
  ['mashed potatoes', 3], ['potato salad', 3], ['coleslaw', 2], ['cole slaw', 2], ['deviled eggs', 2],
  ['green bean casserole', 2], ['sweet potato casserole', 2], ['stuffing', 2], ['dressing', 1], ['cornbread', 3],
  ['biscuits', 3], ['dinner rolls', 2], ['garlic bread', 2], ['baked beans', 2], ['scalloped potatoes', 2],
  ['roasted vegetables', 1], ['caesar salad', 2], ['pasta salad', 2], ['macaroni salad', 2], ['guacamole', 3],
  ['salsa', 2], ['hummus', 2], ['spinach dip', 2], ['queso', 2], ['cranberry sauce', 1], ['gravy', 1],
  // breakfast
  ['pancakes', 3], ['waffles', 3], ['french toast', 3], ['cinnamon rolls', 3], ['muffins', 2], ['blueberry muffins', 3],
  ['banana bread', 3], ['zucchini bread', 2], ['scones', 2], ['granola', 2], ['breakfast casserole', 2],
  ['coffee cake', 2], ['omelet', 1], ['hash browns', 2], ['biscuits and gravy', 3], ['sausage gravy', 2],
  // baking and desserts
  ['chocolate chip cookies', 3], ['sugar cookies', 3], ['oatmeal cookies', 2], ['peanut butter cookies', 3],
  ['snickerdoodles', 2], ['gingerbread', 2], ['brownies', 3], ['blondies', 2], ['lemon bars', 2],
  ['apple pie', 3], ['pumpkin pie', 3], ['pecan pie', 3], ['cherry pie', 2], ['key lime pie', 2], ['sweet potato pie', 2],
  ['cheesecake', 3], ['carrot cake', 3], ['pound cake', 3], ['chocolate cake', 3], ['red velvet', 2],
  ['banana pudding', 3], ['bread pudding', 2], ['rice pudding', 1], ['apple crisp', 3], ['cobbler', 3],
  ['peach cobbler', 3], ['strawberry shortcake', 2], ['tiramisu', 2], ['fudge', 2], ['rice krispie', 2],
  ['cupcakes', 2], ['pie crust', 2], ['whoopie pie', 1], ['angel food cake', 2], ['german chocolate', 2],
  ['coconut cake', 1], ['lemon cake', 2], ['pineapple upside down', 2], ['sheet cake', 1], ['frosting', 1],
  ['cookies', 1], ['pie', 1], ['cake', 1],
  // breads
  ['white bread', 2], ['sandwich bread', 2], ['french bread', 2], ['sourdough', 2], ['focaccia', 2], ['pizza dough', 2],
  ['pretzels', 1], ['bagels', 1],
  // drinks and snacks
  ['lemonade', 2], ['sweet tea', 2], ['hot chocolate', 2], ['smoothie', 1], ['punch', 1], ['chex mix', 2],
  ['popcorn', 1], ['nachos', 2], ['quesadillas', 2], ['sliders', 1],
].map(([phrase, w]) => [phrase.split(' '), w]);

const words = (title) => title.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  .map((w) => {   // a rough stem, the same for both forms: cookies/cookie -> cooki, potatoes/potato -> potato
    let x = w;
    if (x.length > 3 && x.endsWith('s')) x = x.slice(0, -1);
    if (x.length > 3 && x.endsWith('e')) x = x.slice(0, -1);
    return x;
  });
const stem = (phrase) => words(phrase.join(' '));
// indexed by first word, so a title is checked against only the phrases that could start at each word
const BY_FIRST = new Map();
for (const [p, w] of DISHES.map(([ph, wt]) => [stem(ph), wt])) {
  if (!BY_FIRST.has(p[0])) BY_FIRST.set(p[0], []);
  BY_FIRST.get(p[0]).push([p, w]);
}

/** The dish a title is about ("Grandma's Best Chocolate Chip Cookies" -> "chocolat chip cooki", a stem), and its weight. */
export function dishOf(title) {
  const t = words(title);
  let best = null;
  for (let i = 0; i < t.length; i++) {
    for (const [p, w] of BY_FIRST.get(t[i]) || []) {
      if (i + p.length > t.length || !p.every((x, k) => t[i + k] === x)) continue;
      // a longer phrase is a more exact match ("chocolate chip cookie" beats "cookie")
      if (!best || p.length > best.p.length || (p.length === best.p.length && w > best.w)) best = { p, w };
    }
  }
  return best ? { dish: best.p.join(' '), weight: best.w } : null;
}

/** A score for ordering (higher first). Not shown to anyone. extra: { stars, cooked } counts when known. */
export function popularity(r, extra = {}) {
  const d = dishOf(r.title);
  let s = d ? d.weight * (1 + 0.15 * (d.dish.split(' ').length - 1)) : 0;
  if (!r.stub && r.ings?.length) {
    if (r.ings.length >= 4 && r.ings.length <= 16) s += 0.4;         // a real recipe, not a note or a 40-line project
    if (r._mins != null) s += 0.2;
  }
  if (r.title.length > 48 || /["()*#]/.test(r.title)) s -= 0.6;      // "Mom's ("Famous") ...", "Cookies **" read badly up front
  if (/\s\d+$/.test(r.title)) s -= 0.8;                                // "Chicken Noodle Soup 2": the second copy of a recipe
  if (/^[A-Z\s]+$/.test(r.title)) s -= 0.4;                            // ALL CAPS archive titles
  s += 0.5 * Math.log1p(extra.stars || 0) + 0.5 * Math.log1p(extra.cooked || 0);
  return s;
}

/** The most popular recipes, at most one per dish (no wall of 12 chili recipes). */
export function topDishes(recipes, n, score = popularity) {
  const best = new Map();
  for (const r of recipes) {
    const d = dishOf(r.title);
    if (!d || d.weight < 2) continue;
    const s = score(r);
    const cur = best.get(d.dish);
    if (!cur || s > cur[1]) best.set(d.dish, [r, s]);
  }
  return [...best.values()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([r]) => r);
}

/** Orders recipes for a list: popular first, but the same dish doesn't fill the front ("Chocolate Chip
 *  Cookies" five times): each further recipe of a dish counts for less. Stable, so ties keep their order.
 *  Uses r._pop and r._dish (worked out once per recipe in app.js). */
export function orderByPopularity(list) {
  const seen = new Map();
  const eff = list.map((r) => {
    const s = r._pop || 0;
    if (!r._dish || s <= 0) return s;
    const n = seen.get(r._dish) || 0;
    seen.set(r._dish, n + 1);
    return s - n * 1.5;
  });
  // the decay above depends on the order recipes come in, so rank the dish's copies by their own score first
  return list.map((r, i) => [r, eff[i], i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(([r]) => r);
}
