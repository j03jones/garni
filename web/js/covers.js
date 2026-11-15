// Illustrated covers for recipes without a photo: one small flat drawing per kind of dish, in Garni's colours.
// A recipe gets the most specific picture its title suggests ("Apple Pie" -> pie, "Chicken Soup" -> soup);
// otherwise the one for its category. Each drawing is in a 100x100 box. No DOM here: tests run it in Node.

const C = { cream: '#fff6e6', white: '#ffffff', tomato: '#e4573d', red: '#c8402f', leaf: '#2e9b57', sprout: '#7cc77f',
  butter: '#ffc93c', gold: '#f2a93b', crust: '#d98b4a', crustD: '#b4652f', crustL: '#f3c48b', choc: '#6b3f2a', chocL: '#8f5a3c',
  pink: '#f06b8f', berry: '#c73a63', sky: '#5b9be0', skyL: '#a9cdf2', steel: '#c9ced3', shade: 'rgba(0,0,0,.13)', orange: '#f28b30' };
const shadow = (w = 30, y = 84) => `<ellipse cx="50" cy="${y}" rx="${w}" ry="4" fill="${C.shade}"/>`;
const steam = `<g fill="none" stroke="${C.white}" stroke-width="3" stroke-linecap="round" opacity=".9">
  <path d="M40 34c-4-5 4-8 0-14"/><path d="M50 32c-4-5 4-8 0-14"/><path d="M60 34c-4-5 4-8 0-14"/></g>`;
const bowl = (fill, rim = C.cream) => `${shadow(28)}<path d="M18 52h64a32 30 0 0 1-64 0z" fill="${fill}"/><ellipse cx="50" cy="52" rx="32" ry="7" fill="${rim}"/>`;

export const COVERS = {
  soup: `${bowl(C.tomato)}<ellipse cx="50" cy="52" rx="27" ry="4.5" fill="${C.gold}"/><circle cx="42" cy="51" r="2.2" fill="${C.leaf}"/><circle cx="55" cy="53" r="2" fill="${C.leaf}"/><circle cx="60" cy="50" r="1.8" fill="${C.tomato}"/>${steam}`,
  salad: `${bowl(C.sky)}<g fill="${C.sprout}"><ellipse cx="36" cy="45" rx="10" ry="6" transform="rotate(-25 36 45)"/><ellipse cx="62" cy="44" rx="11" ry="6" transform="rotate(20 62 44)"/></g><g fill="${C.leaf}"><ellipse cx="48" cy="41" rx="10" ry="6" transform="rotate(-8 48 41)"/><ellipse cx="57" cy="48" rx="8" ry="4.5"/></g><circle cx="41" cy="49" r="4.5" fill="${C.tomato}"/><circle cx="67" cy="50" r="3.8" fill="${C.tomato}"/>`,
  bread: `${shadow(32, 80)}<path d="M17 72c0-22 14-34 33-34s33 12 33 34z" fill="${C.crust}"/><rect x="17" y="68" width="66" height="10" rx="4" fill="${C.crustD}"/><g fill="none" stroke="${C.crustL}" stroke-width="3" stroke-linecap="round"><path d="M33 52l8-8"/><path d="M45 50l8-8"/><path d="M57 52l8-8"/></g>`,
  muffin: `${shadow(24, 82)}<path d="M30 56h40l-5 24H35z" fill="${C.pink}"/><g stroke="${C.berry}" stroke-width="2"><path d="M40 57l2 23"/><path d="M50 57v23"/><path d="M60 57l-2 23"/></g><path d="M26 58c0-16 10-24 24-24s24 8 24 24z" fill="${C.crust}"/><g fill="${C.choc}"><circle cx="40" cy="46" r="2.4"/><circle cx="53" cy="42" r="2.4"/><circle cx="60" cy="51" r="2.4"/><circle cx="45" cy="54" r="2.2"/></g>`,
  cake: `${shadow(30, 82)}<rect x="22" y="44" width="56" height="34" rx="5" fill="${C.pink}"/><rect x="22" y="58" width="56" height="5" fill="${C.cream}"/><ellipse cx="50" cy="44" rx="28" ry="8" fill="${C.cream}"/><path d="M24 46c4 6 6 6 8 0 2 7 6 7 8 0 3 6 6 6 8 0 2 7 6 7 8 0 3 6 6 6 8 0 2 6 5 6 6 0" fill="${C.cream}"/><circle cx="50" cy="34" r="5" fill="${C.tomato}"/><path d="M50 30c2-5 6-7 9-7" stroke="${C.leaf}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  cookie: `${shadow(28, 82)}<circle cx="50" cy="52" r="29" fill="${C.gold}"/><circle cx="50" cy="52" r="24" fill="${C.crust}" opacity=".35"/><g fill="${C.choc}"><path d="M38 40l5 1-2 4z"/><path d="M57 37l5 2-3 4z"/><path d="M61 55l5 1-2 5z"/><path d="M40 60l5 0-2 5z"/><path d="M50 50l4 2-3 3z"/><path d="M31 52l4 1-2 4z"/></g>`,
  pie: `${shadow(34, 80)}<ellipse cx="50" cy="62" rx="34" ry="14" fill="${C.crustD}"/><ellipse cx="50" cy="58" rx="34" ry="14" fill="${C.crust}"/><ellipse cx="50" cy="57" rx="27" ry="10" fill="${C.berry}"/><g stroke="${C.crustL}" stroke-width="4" stroke-linecap="round"><path d="M34 50l-4 13"/><path d="M47 47l-3 20"/><path d="M60 47l-3 20"/><path d="M72 51l-3 12"/><path d="M27 56h46"/><path d="M31 62h38"/></g>`,
  pasta: `${bowl(C.white, C.cream)}<g fill="none" stroke="${C.butter}" stroke-width="3" stroke-linecap="round"><path d="M30 52c4-6 8 6 12 0s8 6 12 0 8 6 12 0"/><path d="M34 47c4-6 8 6 12 0s8 6 12 0"/></g><ellipse cx="50" cy="46" rx="9" ry="4" fill="${C.tomato}"/><circle cx="50" cy="44" r="2" fill="${C.leaf}"/><path d="M72 22l-12 26" stroke="${C.steel}" stroke-width="3.5" stroke-linecap="round"/><path d="M69 20l3 8M74 22l-1 7M77 25l-3 6" stroke="${C.steel}" stroke-width="2.4" stroke-linecap="round"/>`,
  steak: `${shadow(30, 80)}<path d="M22 52c0-14 14-22 30-20s28 10 26 24-14 20-30 18-26-8-26-22z" fill="${C.cream}"/><path d="M27 52c0-11 12-17 25-15s23 8 21 19-11 15-24 14-22-7-22-18z" fill="${C.red}"/><circle cx="58" cy="49" r="5" fill="${C.cream}"/><path d="M33 56c6-4 12 2 18-2" stroke="${C.tomato}" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M70 26c-6 4-8 10-6 16" stroke="${C.leaf}" stroke-width="2.5" fill="none" stroke-linecap="round"/><g fill="${C.leaf}"><ellipse cx="66" cy="30" rx="4" ry="1.6" transform="rotate(-40 66 30)"/><ellipse cx="71" cy="31" rx="4" ry="1.6" transform="rotate(30 71 31)"/><ellipse cx="65" cy="37" rx="4" ry="1.6" transform="rotate(-30 65 37)"/></g>`,
  drumstick: `${shadow(26, 82)}<g transform="rotate(-35 50 52)"><ellipse cx="42" cy="52" rx="21" ry="16" fill="${C.crust}"/><ellipse cx="38" cy="47" rx="8" ry="4" fill="${C.crustL}" opacity=".7"/><rect x="58" y="48" width="18" height="8" fill="${C.cream}"/><circle cx="78" cy="47" r="5" fill="${C.cream}"/><circle cx="78" cy="57" r="5" fill="${C.cream}"/></g>`,
  fish: `${shadow(30, 80)}<path d="M18 54c10-16 30-20 46-10l14-10v40l-14-10c-16 10-36 6-46-10z" fill="${C.sky}"/><path d="M40 44c4 6 4 14 0 20" stroke="${C.skyL}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="29" cy="51" r="3" fill="${C.white}"/><circle cx="29" cy="51" r="1.5" fill="${C.choc}"/><circle cx="66" cy="70" r="9" fill="${C.butter}"/><circle cx="66" cy="70" r="6.5" fill="${C.cream}"/><path d="M66 63.5v13M59.5 70h13" stroke="${C.butter}" stroke-width="1.5"/>`,
  shrimp: `${shadow(26, 82)}<path d="M66 30c-22-4-38 12-34 32 2 10 12 16 22 12" fill="none" stroke="${C.orange}" stroke-width="15" stroke-linecap="round"/><path d="M66 30c-22-4-38 12-34 32 2 10 12 16 22 12" fill="none" stroke="${C.butter}" stroke-width="2" stroke-dasharray="2 7" opacity=".7"/><path d="M54 74l10 4-2-10z" fill="${C.tomato}"/><circle cx="64" cy="31" r="1.8" fill="${C.choc}"/><path d="M70 28c6-6 12-6 16-4M70 32c6-2 10 0 14 4" stroke="${C.tomato}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  egg: `${shadow(30, 80)}<path d="M24 50c-4-14 12-22 24-18 10-8 28-2 28 12 8 10 0 24-14 22-8 8-24 6-28-4-12 0-14-8-10-12z" fill="${C.white}"/><circle cx="50" cy="50" r="12" fill="${C.butter}"/><circle cx="46" cy="46" r="3.5" fill="${C.cream}" opacity=".8"/>`,
  cheese: `${shadow(32, 80)}<path d="M18 50l50-18 14 18z" fill="${C.butter}"/><path d="M18 50h64v24H18z" fill="${C.gold}"/><g fill="${C.crust}" opacity=".55"><circle cx="32" cy="60" r="4"/><circle cx="58" cy="65" r="5"/><circle cx="72" cy="57" r="3"/><ellipse cx="54" cy="44" rx="4" ry="2"/></g>`,
  carrot: `${shadow(22, 84)}<path d="M36 34l20 4-12 44c-2 4-6 4-6 0z" fill="${C.orange}" transform="rotate(-12 46 56)"/><g stroke="${C.crustD}" stroke-width="2" stroke-linecap="round" opacity=".5" transform="rotate(-12 46 56)"><path d="M41 46h8"/><path d="M42 58h6"/><path d="M43 69h4"/></g><g fill="${C.leaf}"><ellipse cx="42" cy="24" rx="4" ry="11" transform="rotate(-25 42 24)"/><ellipse cx="50" cy="22" rx="4" ry="12"/><ellipse cx="58" cy="25" rx="4" ry="11" transform="rotate(25 58 25)"/></g>`,
  fruit: `${shadow(24, 84)}<path d="M50 80c-16-10-26-22-24-36 2-10 12-14 24-8 12-6 22-2 24 8 2 14-8 26-24 36z" fill="${C.tomato}"/><g fill="${C.butter}"><ellipse cx="40" cy="48" rx="1.4" ry="2.2"/><ellipse cx="50" cy="44" rx="1.4" ry="2.2"/><ellipse cx="60" cy="48" rx="1.4" ry="2.2"/><ellipse cx="45" cy="58" rx="1.4" ry="2.2"/><ellipse cx="56" cy="58" rx="1.4" ry="2.2"/><ellipse cx="50" cy="68" rx="1.4" ry="2.2"/></g><path d="M36 34c6 4 10 4 14 0 4 4 8 4 14 0-4 8-10 8-14 4-4 4-10 4-14-4z" fill="${C.leaf}"/>`,
  glass: `${shadow(18, 84)}<path d="M26 26h48L54 50v24h10v6H36v-6h10V50z" fill="${C.skyL}" opacity=".9"/><path d="M31 31h38L50 48z" fill="${C.pink}"/><circle cx="62" cy="26" r="9" fill="${C.sprout}"/><circle cx="62" cy="26" r="6.5" fill="${C.cream}"/><path d="M62 19.5v13M55.5 26h13" stroke="${C.sprout}" stroke-width="1.5"/>`,
  jar: `${shadow(22, 84)}<rect x="31" y="34" width="38" height="46" rx="8" fill="${C.tomato}"/><rect x="34" y="24" width="32" height="12" rx="3" fill="${C.leaf}"/><rect x="31" y="48" width="38" height="18" fill="${C.cream}"/><path d="M40 57h20" stroke="${C.tomato}" stroke-width="3" stroke-linecap="round"/><rect x="37" y="38" width="5" height="8" rx="2" fill="${C.white}" opacity=".35"/>`,
  chocolate: `${shadow(26, 82)}<g transform="rotate(-12 50 54)"><rect x="26" y="30" width="48" height="50" rx="4" fill="${C.choc}"/><g fill="${C.chocL}"><rect x="30" y="34" width="18" height="12" rx="2"/><rect x="52" y="34" width="18" height="12" rx="2"/><rect x="30" y="50" width="18" height="12" rx="2"/><rect x="52" y="50" width="18" height="12" rx="2"/></g><path d="M24 64h52v18H24z" fill="${C.tomato}"/><path d="M24 64l6 4 6-4 6 4 6-4 6 4 6-4 6 4 6-4 4 3" stroke="${C.cream}" stroke-width="2" fill="none"/></g>`,
  pancakes: `${shadow(32, 82)}<ellipse cx="50" cy="72" rx="32" ry="8" fill="${C.crustD}"/><ellipse cx="50" cy="68" rx="32" ry="8" fill="${C.crust}"/><ellipse cx="50" cy="59" rx="30" ry="8" fill="${C.crustD}"/><ellipse cx="50" cy="55" rx="30" ry="8" fill="${C.crust}"/><ellipse cx="50" cy="46" rx="28" ry="8" fill="${C.crustD}"/><ellipse cx="50" cy="42" rx="28" ry="8" fill="${C.gold}"/><path d="M30 42c8 4 32 4 40 0 0 6-4 7-6 4-2 8-6 8-8 2-4 6-8 6-10 0-4 5-8 4-8-1-4 3-8 1-8-5z" fill="${C.chocL}"/><rect x="44" y="34" width="12" height="8" rx="2" fill="${C.butter}"/>`,
  taco: `${shadow(32, 80)}<path d="M18 72a32 32 0 0 1 64 0z" fill="${C.butter}"/><g fill="${C.leaf}"><ellipse cx="34" cy="46" rx="7" ry="4" transform="rotate(-30 34 46)"/><ellipse cx="50" cy="40" rx="8" ry="4"/><ellipse cx="66" cy="46" rx="7" ry="4" transform="rotate(30 66 46)"/></g><circle cx="42" cy="44" r="4" fill="${C.tomato}"/><circle cx="58" cy="43" r="4" fill="${C.tomato}"/><path d="M24 72a26 26 0 0 1 52 0z" fill="${C.gold}"/>`,
  pizza: `${shadow(26, 84)}<path d="M50 80L22 30h56z" fill="${C.butter}"/><path d="M20 26h60a4 4 0 0 1 0 8H20a4 4 0 0 1 0-8z" fill="${C.crust}"/><g fill="${C.tomato}"><circle cx="40" cy="42" r="5"/><circle cx="58" cy="44" r="5"/><circle cx="50" cy="60" r="4.5"/></g><g fill="${C.leaf}"><circle cx="48" cy="45" r="1.8"/><circle cx="56" cy="55" r="1.6"/></g>`,
  noodles: `${bowl(C.tomato, C.cream)}<g fill="none" stroke="${C.butter}" stroke-width="2.6" stroke-linecap="round"><path d="M30 50c4-8 8 4 12-4s8 4 12-4 8 4 12-4"/></g><circle cx="38" cy="49" r="3" fill="${C.leaf}"/><ellipse cx="62" cy="50" rx="5" ry="2.5" fill="${C.pink}"/><g stroke="${C.choc}" stroke-width="3" stroke-linecap="round"><path d="M56 18l-6 34"/><path d="M66 20l-10 32"/></g>`,
  chili: `${shadow(22, 82)}<path d="M56 30c-2 20-8 36-28 46-4 2-6-2-2-4 14-10 18-24 18-40 0-6 12-8 12-2z" fill="${C.tomato}"/><path d="M50 30c0-8 8-8 10-4" fill="none" stroke="${C.leaf}" stroke-width="4" stroke-linecap="round"/><path d="M46 30c4-4 12-4 14 0-4 3-10 3-14 0z" fill="${C.leaf}"/><path d="M50 40c-1 12-4 20-12 28" stroke="${C.white}" stroke-width="2" opacity=".4" fill="none" stroke-linecap="round"/>`,
  teapot: `${shadow(30, 82)}<path d="M28 50c0-14 10-20 22-20s22 6 22 20c0 18-10 28-22 28S28 68 28 50z" fill="${C.sky}"/><path d="M28 54c-10-4-14-12-10-16" stroke="${C.sky}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M70 44c10 0 12 14 0 18" stroke="${C.sky}" stroke-width="5" fill="none"/><ellipse cx="50" cy="31" rx="12" ry="4" fill="${C.skyL}"/><circle cx="50" cy="25" r="4" fill="${C.skyL}"/><path d="M34 56h32" stroke="${C.cream}" stroke-width="4" stroke-linecap="round"/>`,
  pretzel: `${shadow(28, 82)}<path d="M50 56c-10-10-26-14-28-2-2 14 14 20 28 8 14 12 30 6 28-8-2-12-18-8-28 2zM50 56c-8 10-12 16-16 20M50 56c8 10 12 16 16 20" fill="none" stroke="${C.crustD}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M50 56c-10-10-26-14-28-2-2 14 14 20 28 8 14 12 30 6 28-8-2-12-18-8-28 2z" fill="none" stroke="${C.crust}" stroke-width="5" stroke-linecap="round"/><g fill="${C.white}"><circle cx="30" cy="48" r="1.4"/><circle cx="70" cy="50" r="1.4"/><circle cx="38" cy="64" r="1.4"/><circle cx="62" cy="64" r="1.4"/></g>`,
  pot: `${shadow(32, 84)}<rect x="22" y="44" width="56" height="34" rx="8" fill="${C.tomato}"/><rect x="14" y="50" width="10" height="6" rx="3" fill="${C.red}"/><rect x="76" y="50" width="10" height="6" rx="3" fill="${C.red}"/><path d="M20 44c0-8 14-12 30-12s30 4 30 12z" fill="${C.red}"/><rect x="45" y="26" width="10" height="7" rx="3" fill="${C.choc}"/><path d="M28 60h44" stroke="${C.cream}" stroke-width="3" opacity=".5" stroke-linecap="round"/>${steam.replace(/M40 34/, 'M36 24').replace(/M50 32/, 'M66 26').replace(/M60 34/, 'M74 30')}`,
  skewer: `${shadow(30, 84)}<path d="M20 78L80 22" stroke="${C.crustL}" stroke-width="3" stroke-linecap="round"/><g transform="rotate(-43 50 50)"><rect x="18" y="42" width="13" height="16" rx="4" fill="${C.red}"/><rect x="33" y="42" width="11" height="16" rx="4" fill="${C.butter}"/><rect x="46" y="42" width="13" height="16" rx="4" fill="${C.red}"/><rect x="61" y="42" width="11" height="16" rx="4" fill="${C.leaf}"/><rect x="74" y="42" width="10" height="16" rx="4" fill="${C.red}"/></g>`,
  cracker: `${shadow(32, 80)}<g><circle cx="36" cy="60" r="15" fill="${C.gold}"/><circle cx="64" cy="60" r="15" fill="${C.gold}"/><circle cx="50" cy="46" r="15" fill="${C.butter}"/></g><g fill="${C.crust}"><circle cx="44" cy="42" r="1.2"/><circle cx="56" cy="42" r="1.2"/><circle cx="50" cy="50" r="1.2"/></g><path d="M40 40h20l-4 10H44z" fill="${C.cream}"/><circle cx="50" cy="38" r="4.5" fill="${C.leaf}"/><circle cx="50" cy="38" r="1.6" fill="${C.tomato}"/>`,
  sprout: `${shadow(20, 84)}<path d="M50 80V50" stroke="${C.leaf}" stroke-width="4" stroke-linecap="round"/><path d="M50 52c-4-18-22-22-28-16 2 14 16 20 28 16z" fill="${C.sprout}"/><path d="M50 46c2-20 22-26 30-18-2 16-18 22-30 18z" fill="${C.leaf}"/><path d="M38 80h24" stroke="${C.crust}" stroke-width="5" stroke-linecap="round"/>`,
  cucumber: `${shadow(30, 82)}<g><circle cx="38" cy="58" r="16" fill="${C.leaf}"/><circle cx="38" cy="58" r="13" fill="${C.sprout}"/><circle cx="38" cy="58" r="9" fill="${C.cream}"/><circle cx="62" cy="48" r="16" fill="${C.leaf}"/><circle cx="62" cy="48" r="13" fill="${C.sprout}"/><circle cx="62" cy="48" r="9" fill="${C.cream}"/></g><g fill="${C.sprout}"><ellipse cx="62" cy="45" rx="1.2" ry="2"/><ellipse cx="59" cy="50" rx="1.2" ry="2"/><ellipse cx="65" cy="50" rx="1.2" ry="2"/><ellipse cx="38" cy="55" rx="1.2" ry="2"/><ellipse cx="35" cy="60" rx="1.2" ry="2"/><ellipse cx="41" cy="60" rx="1.2" ry="2"/></g>`,
  stopwatch: `${shadow(24, 84)}<circle cx="50" cy="56" r="25" fill="${C.cream}"/><circle cx="50" cy="56" r="25" fill="none" stroke="${C.sky}" stroke-width="5"/><rect x="45" y="22" width="10" height="8" rx="2" fill="${C.sky}"/><path d="M50 56V42M50 56l9 6" stroke="${C.choc}" stroke-width="3.5" stroke-linecap="round"/><path d="M36 56a14 14 0 0 1 14-14v14z" fill="${C.butter}" opacity=".8"/>`,
  gift: `${shadow(28, 84)}<rect x="24" y="44" width="52" height="36" rx="4" fill="${C.pink}"/><rect x="20" y="36" width="60" height="12" rx="3" fill="${C.berry}"/><rect x="45" y="36" width="10" height="44" fill="${C.butter}"/><path d="M50 36c-6-12-20-12-16-2 2 4 10 2 16 2zM50 36c6-12 20-12 16-2-2 4-10 2-16 2z" fill="${C.butter}"/>`,
  globe: `${shadow(26, 84)}<circle cx="50" cy="52" r="27" fill="${C.sky}"/><path d="M34 38c6 2 8 8 4 12s2 10 8 8c4-2 8 4 4 8M60 30c-2 6 4 10 10 8M62 62c4-4 10-2 12 2" fill="none" stroke="${C.leaf}" stroke-width="6" stroke-linecap="round"/>`,
  plate: `${shadow(32, 82)}<circle cx="50" cy="54" r="27" fill="${C.white}"/><circle cx="50" cy="54" r="19" fill="none" stroke="${C.steel}" stroke-width="2"/><path d="M16 34v14c0 3 2 5 4 5v25M20 34v14M24 34v14c0 3-2 5-4 5" stroke="${C.steel}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M82 34c-5 4-5 14-1 18v26" stroke="${C.steel}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="44" cy="50" r="5" fill="${C.leaf}"/><circle cx="56" cy="57" r="6" fill="${C.tomato}"/>`,
};

// The picture for each category group (the old emoji tiles, drawn).
const BY_GROUP = {
  'Appetizers & Snacks': 'cracker', 'Soups & Stews': 'soup', 'Salads & Dressings': 'salad', 'Breakfast & Brunch': 'pancakes',
  'Main Dishes': 'plate', 'Vegetables & Sides': 'carrot', 'Pasta, Rice & Grains': 'pasta', 'Breads & Baking': 'bread',
  'Sauces & Condiments': 'jar', 'Beverages & Cocktails': 'glass', 'Desserts': 'cake', 'Cakes': 'cake', 'Cookies & Bars': 'cookie',
  'Pies & Pastries': 'pie', 'Candy & Chocolate': 'chocolate', 'Meats': 'steak', 'Beef': 'steak', 'Pork': 'steak', 'Poultry': 'drumstick',
  'Seafood': 'fish', 'Eggs & Cheese': 'egg', 'Fruit': 'fruit', 'Vegetarian & Vegan': 'sprout', 'Light & Special Diets': 'cucumber',
  'Mexican & Southwestern': 'taco', 'Italian': 'pizza', 'Asian & Indian': 'noodles', 'Cajun & Creole': 'chili',
  'British, Irish & Canadian': 'teapot', 'German & Pennsylvania Dutch': 'pretzel', 'Other World Cuisines': 'globe',
  'Quick & Easy': 'stopwatch', 'Microwave & Slow Cooker': 'pot', 'Grill & BBQ': 'skewer', 'Holidays & Entertaining': 'gift',
  'Uncategorized': 'plate',
};

// Words in a title that say more than the category does. Checked in order: the first match wins.
const BY_TITLE = [
  [/\b(soups?|stews?|chowders?|bisque|gumbo|chili con|borscht|minestrone|broth)\b/, 'soup'],
  [/\b(cupcakes?|muffins?)\b/, 'muffin'],
  [/\b(cheesecakes?|cakes?|tortes?|gateau)\b/, 'cake'],
  [/\b(cookies?|brownies?|biscotti|shortbread|macaroons?|snickerdoodles?)\b/, 'cookie'],
  [/\b(pies?|tarts?|cobblers?|crisps?|strudel|turnovers?|pastr(y|ies))\b/, 'pie'],
  [/\b(pancakes?|waffles?|crepes?|french toast|hotcakes?|flapjacks?)\b/, 'pancakes'],
  [/\b(pizzas?|calzones?|focaccia)\b/, 'pizza'],
  [/\b(tacos?|burritos?|enchiladas?|quesadillas?|fajitas?|nachos|tamales?|tostadas?|salsas?|guacamole)\b/, 'taco'],
  [/\b(spaghetti|lasagn[ae]|macaroni|pasta|fettuccine|linguine|penne|ravioli|noodle kugel|risotto)\b/, 'pasta'],
  [/\b(noodles?|lo mein|chow mein|stir[- ]fry|teriyaki|curry|pad thai|fried rice|sushi|dumplings?)\b/, 'noodles'],
  [/\b(salads?|slaw|coleslaw)\b/, 'salad'],
  [/\b(breads?|loaf|loaves|rolls?|biscuits?|scones?|bagels?|buns?|cornbread|brioche)\b/, 'bread'],
  [/\b(shrimps?|prawns?|crabs?|lobsters?|scallops?|clams?|oysters?|mussels?|crawfish)\b/, 'shrimp'],
  [/\b(fish|salmon|tuna|cod|trout|halibut|tilapia|haddock|catfish|snapper|flounder|sole)\b/, 'fish'],
  [/\b(chicken|turkey|duck|hens?|poultry|wings?)\b/, 'drumstick'],
  [/\b(kabobs?|kebabs?|skewers?|barbecue|bbq|grilled)\b/, 'skewer'],
  [/\b(steaks?|beef|roast|burgers?|meatloaf|meatballs?|pork|ham|ribs|lamb|veal|chops?|brisket|sausages?)\b/, 'steak'],
  [/\b(omelets?|omelettes?|quiches?|frittatas?|souffles?|eggs?)\b/, 'egg'],
  [/\b(fondue|cheese balls?|cheese spread|rarebit)\b/, 'cheese'],
  [/\b(fudge|candy|candies|truffles?|toffee|brittle|chocolates?|caramels?|bonbons?)\b/, 'chocolate'],
  [/\b(sauces?|dressings?|gravy|jams?|jelly|jellies|preserves|relish|chutneys?|pickles?|marmalade|ketchup|mustard|marinade|rub)\b/, 'jar'],
  [/\b(punch|cocktails?|smoothies?|lemonade|shakes?|margaritas?|sangria|eggnog|cider|cocoa|tea|coffee|liqueur|wine|daiquiri)\b/, 'glass'],
  [/\b(casseroles?|hotdish|crock ?pot|slow cooker|pot roast)\b/, 'pot'],
  [/\b(dips?|spreads?|canapes?|crackers?|appetizers?|nibbles)\b/, 'cracker'],
  [/\b(pretzels?)\b/, 'pretzel'],
  [/\b(peppers?|jambalaya|cajun|creole|jalapenos?)\b/, 'chili'],
  [/\b(carrots?|potato(es)?|beans?|corn|squash|broccoli|cauliflower|vegetables?|veggie)\b/, 'carrot'],
  [/\b(strawberr(y|ies)|berr(y|ies)|apples?|peach(es)?|fruit|cherr(y|ies)|bananas?|lemons?|oranges?|pears?|plums?)\b/, 'fruit'],
];

/** The key of the cover drawing for a recipe ('pie', 'soup', ...), from its title and then its category. */
export function coverKey(title, group) {
  const t = String(title || '').toLowerCase();
  for (const [re, key] of BY_TITLE) if (re.test(t)) return key;
  return BY_GROUP[group] || 'plate';
}

/** The drawing as an <svg> string. */
export const coverSvg = (key) => `<svg class="cover" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${COVERS[key] || COVERS.plate}</svg>`;
