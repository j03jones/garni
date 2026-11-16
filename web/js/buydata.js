// How foods are sold in a typical US grocery store, so the shopping list can say "1 bag (5 lb)" instead
// of "2 1/4 cups". Keys are the food names in nutridata.js (the same name the list recognises the
// ingredient by). Sizes are the common ones; stores and brands vary, so the list still shows what the
// recipes need beside it.
//
//   pantry          kept in the cupboard and bought when it runs out (spices, salt, oil, sauces):
//                   listed under "Check the cupboard" with no amount to buy
//   packs: by g|ml  [label, size]: the smallest pack that covers it, else enough of the biggest
//   each: 'word'    sold one by one (onions, lemons): the count rounded up, "3 onions"
//   weight          sold by weight at the counter (meat, fish): rounded up to the next ¼ lb
//   bunch           herbs and green onions: a bunch covers most recipes
//   from: [food, amount]   juice or parts that come from something else ("lemon juice" -> lemons)
const P = 'pantry';
const g = (...packs) => ({ by: 'g', packs });
const ml = (...packs) => ({ by: 'ml', packs });
const each = (word, plural) => ({ each: word, plural: plural || `${word}s` });
const WEIGHT = { weight: true };
const BUNCH = { bunch: true };

const oz = (n) => n * 28.3495;
const lb = (n) => n * 453.592;
const floz = (n) => n * 29.5735;

const MILK = ml(['1 pint', floz(16)], ['1 quart', floz(32)], ['half gallon', floz(64)], ['1 gallon', floz(128)]);
const CREAM = ml(['half pint', floz(8)], ['1 pint', floz(16)], ['1 quart', floz(32)]);
const SHREDDED = g(['8 oz bag', oz(8)], ['16 oz bag', oz(16)], ['2 lb bag', lb(2)]);
const CAN_BEANS = g(['15 oz can', 255]);                      // a can drains to about 1½ cups
const CAN_TOMATO = g(['14.5 oz can', oz(14.5)], ['28 oz can', oz(28)]);
const BROTH = ml(['14.5 oz can', floz(14.5)], ['32 oz carton', floz(32)]);
const NUTS = g(['8 oz bag', oz(8)], ['16 oz bag', oz(16)]);
const BOTTLE = ml(['750 ml bottle', 750]);
const PASTA = g(['1 lb box', lb(1)]);

export const BUY = {
  // dairy and eggs
  butter: g(['1 stick', 113], ['2 sticks', 226], ['3 sticks', 339], ['1 lb box (4 sticks)', lb(1)]),
  'unsalted butter': g(['1 stick', 113], ['2 sticks', 226], ['3 sticks', 339], ['1 lb box (4 sticks)', lb(1)]),
  margarine: g(['1 lb box', lb(1)]),
  milk: MILK, 'skim milk': MILK, 'almond milk': ml(['half gallon', floz(64)]),
  buttermilk: ml(['1 quart', floz(32)]),
  'half and half': CREAM, 'heavy cream': CREAM, 'whipping cream': CREAM, 'light cream': CREAM, cream: CREAM,
  'evaporated milk': ml(['12 oz can', floz(12)]),
  'condensed milk': g(['14 oz can', oz(14)]),
  'coconut milk': ml(['13.5 oz can', floz(13.5)]),
  'sour cream': g(['8 oz tub', oz(8)], ['16 oz tub', oz(16)], ['24 oz tub', oz(24)]),
  'cream cheese': g(['8 oz block', oz(8)]),
  yogurt: g(['5.3 oz cup', oz(5.3)], ['32 oz tub', oz(32)]),
  'greek yogurt': g(['5.3 oz cup', oz(5.3)], ['32 oz tub', oz(32)]),
  'ice cream': ml(['1.5 quart carton', floz(48)]),
  cheese: SHREDDED, 'cheddar cheese': SHREDDED, cheddar: SHREDDED, 'mozzarella cheese': SHREDDED, mozzarella: SHREDDED,
  'swiss cheese': g(['8 oz pack', oz(8)]), 'monterey jack cheese': SHREDDED,
  'parmesan cheese': g(['5 oz tub', oz(5)], ['8 oz tub', oz(8)]), parmesan: g(['5 oz tub', oz(5)], ['8 oz tub', oz(8)]),
  'feta cheese': g(['4 oz tub', oz(4)], ['8 oz tub', oz(8)]), feta: g(['4 oz tub', oz(4)], ['8 oz tub', oz(8)]),
  'blue cheese': g(['4 oz tub', oz(4)]), 'goat cheese': g(['4 oz log', oz(4)]),
  'cottage cheese': g(['16 oz tub', oz(16)], ['24 oz tub', oz(24)]),
  'ricotta cheese': g(['15 oz tub', oz(15)], ['32 oz tub', oz(32)]), ricotta: g(['15 oz tub', oz(15)], ['32 oz tub', oz(32)]),
  egg: { by: 'n', packs: [['half a dozen', 6], ['1 dozen', 12], ['18-pack', 18]] },
  'egg white': { by: 'n', packs: [['half dozen eggs', 6], ['dozen eggs', 12], ['18 eggs', 18]] },
  'egg yolk': { by: 'n', packs: [['half dozen eggs', 6], ['dozen eggs', 12], ['18 eggs', 18]] },

  // baking and dry goods
  flour: g(['5 lb bag', lb(5)]), 'bread flour': g(['5 lb bag', lb(5)]), 'whole wheat flour': g(['5 lb bag', lb(5)]),
  'cake flour': g(['2 lb box', lb(2)]), cornmeal: g(['2 lb bag', lb(2)]), cornstarch: g(['16 oz box', oz(16)]),
  sugar: g(['4 lb bag', lb(4)]), 'brown sugar': g(['2 lb bag', lb(2)]),
  'powdered sugar': g(['2 lb bag', lb(2)]), 'confectioners sugar': g(['2 lb bag', lb(2)]),
  honey: g(['12 oz bottle', oz(12)], ['24 oz bottle', oz(24)]), 'maple syrup': ml(['12 oz bottle', floz(12)], ['32 oz bottle', floz(32)]),
  molasses: g(['12 oz bottle', oz(12)]), 'corn syrup': g(['16 oz bottle', oz(16)]),
  jam: g(['18 oz jar', oz(18)]), jelly: g(['18 oz jar', oz(18)]),
  oat: g(['18 oz canister', oz(18)], ['42 oz canister', oz(42)]), 'rolled oat': g(['18 oz canister', oz(18)], ['42 oz canister', oz(42)]),
  oatmeal: g(['18 oz canister', oz(18)], ['42 oz canister', oz(42)]),
  rice: g(['2 lb bag', lb(2)], ['5 lb bag', lb(5)]), 'brown rice': g(['2 lb bag', lb(2)]),
  quinoa: g(['12 oz bag', oz(12)]), couscous: g(['10 oz box', oz(10)]), barley: g(['16 oz bag', oz(16)]),
  pasta: PASTA, spaghetti: PASTA, macaroni: PASTA, noodle: g(['12 oz bag', oz(12)]),
  bread: { by: 'n', packs: [['1 loaf', 20]] }, breadcrumb: g(['15 oz canister', oz(15)]),
  tortilla: { by: 'n', packs: [['pack of 10', 10], ['pack of 20', 20]] },
  cracker: g(['1 box', oz(13.7)]), 'graham cracker': g(['1 box', oz(14.4)]), marshmallow: g(['10 oz bag', oz(10)]),
  'cocoa powder': g(['8 oz can', oz(8)]), cocoa: g(['8 oz can', oz(8)]),
  'chocolate chip': g(['12 oz bag', oz(12)], ['24 oz bag', oz(24)]), chocolate: g(['4 oz bar', oz(4)]),
  almond: NUTS, walnut: NUTS, pecan: NUTS, peanut: NUTS, cashew: NUTS, nut: NUTS, 'chopped nut': NUTS,
  'pine nut': g(['2 oz bag', oz(2)], ['4 oz jar', oz(4)]),
  coconut: g(['7 oz bag', oz(7)], ['14 oz bag', oz(14)]),
  raisin: g(['12 oz box', oz(12)]), cranberry: g(['12 oz bag', oz(12)]), 'dried apricot': g(['6 oz bag', oz(6)]),
  currant: g(['10 oz box', oz(10)]), date: g(['8 oz box', oz(8)]),
  'peanut butter': g(['16 oz jar', oz(16)], ['28 oz jar', oz(28)]), tahini: g(['16 oz jar', oz(16)]),
  hummus: g(['10 oz tub', oz(10)]), tofu: g(['14 oz block', oz(14)]),

  // meat and fish: by weight
  'ground beef': WEIGHT, beef: WEIGHT, steak: WEIGHT, hamburger: WEIGHT, 'ground chuck': WEIGHT, brisket: WEIGHT, veal: WEIGHT,
  chicken: WEIGHT, 'chicken breast': WEIGHT, 'chicken thigh': WEIGHT, turkey: WEIGHT,
  pork: WEIGHT, 'pork chop': WEIGHT, sausage: WEIGHT, ham: WEIGHT, salmon: WEIGHT, shrimp: WEIGHT,
  crab: WEIGHT, crabmeat: WEIGHT,
  bacon: g(['12 oz pack', oz(12)], ['16 oz pack', oz(16)]),
  tuna: g(['5 oz can', oz(5)]),

  // produce
  onion: each('onion'), shallot: each('shallot'), leek: each('leek'), carrot: each('carrot'),
  celery: { by: 'n', packs: [['1 bunch', 9]] },
  potato: each('potato', 'potatoes'), 'sweet potato': each('sweet potato', 'sweet potatoes'),
  tomato: each('tomato', 'tomatoes'), 'bell pepper': each('bell pepper'), 'green pepper': each('green pepper'),
  jalapeno: each('jalapeño'), zucchini: each('zucchini', 'zucchini'), cucumber: each('cucumber'), eggplant: each('eggplant'),
  avocado: each('avocado'), lemon: each('lemon'), lime: each('lime'), orange: each('orange'), apple: each('apple'),
  banana: each('banana'), peach: each('peach', 'peaches'), pear: each('pear'), beet: each('beet'), turnip: each('turnip'),
  garlic: { by: 'n', packs: [['1 head', 10]] },                   // a head has about 10 cloves
  'green onion': BUNCH, scallion: BUNCH, parsley: BUNCH, cilantro: BUNCH, basil: BUNCH, mint: BUNCH, dill: BUNCH,
  'dill weed': BUNCH, chive: BUNCH, tarragon: BUNCH,
  ginger: WEIGHT,
  mushroom: g(['8 oz pack', oz(8)], ['16 oz pack', oz(16)]),
  spinach: g(['10 oz bag', oz(10)]), lettuce: { by: 'n', packs: [['1 head', 1]] }, cabbage: { by: 'n', packs: [['1 head', 1]] },
  broccoli: WEIGHT, cauliflower: { by: 'n', packs: [['1 head', 1]] }, squash: WEIGHT, 'green bean': WEIGHT,
  corn: g(['12 oz bag (frozen)', oz(12)]), pea: g(['12 oz bag (frozen)', oz(12)]),
  asparagus: g(['1 lb bunch', lb(1)]), 'asparagus spear': { by: 'n', packs: [['1 lb bunch', 16]] },
  strawberry: g(['1 lb box', lb(1)]), blueberry: g(['6 oz box', oz(6)], ['1 pint', oz(11)]), raspberry: g(['6 oz box', oz(6)]),
  pineapple: { by: 'n', packs: [['1 pineapple', 1]] }, rhubarb: WEIGHT,
  'lemon juice': { from: ['lemon', 45] },                      // a lemon gives about 3 tablespoons (45 ml)
  'lime juice': { from: ['lime', 30] },
  'orange juice': ml(['52 oz bottle', floz(52)]),

  // cans, jars and cartons
  'canned tomato': CAN_TOMATO, 'diced tomato': CAN_TOMATO, 'crushed tomato': g(['28 oz can', oz(28)]),
  'tomato paste': g(['6 oz can', oz(6)]), 'tomato sauce': g(['8 oz can', oz(8)], ['15 oz can', oz(15)]),
  pumpkin: g(['15 oz can', oz(15)], ['29 oz can', oz(29)]),
  bean: CAN_BEANS, 'black bean': CAN_BEANS, 'kidney bean': CAN_BEANS, 'pinto bean': CAN_BEANS, 'white bean': CAN_BEANS,
  chickpea: CAN_BEANS, lentil: g(['16 oz bag', oz(16)]),
  olive: g(['6 oz can', 170]), sauerkraut: g(['14 oz can', oz(14)]), applesauce: g(['24 oz jar', oz(24)]),
  'chicken broth': BROTH, 'chicken stock': BROTH, 'beef broth': BROTH, 'beef stock': BROTH,
  'vegetable broth': BROTH, 'vegetable stock': BROTH, broth: BROTH, stock: BROTH,
  salsa: g(['16 oz jar', oz(16)]), 'pasta sauce': g(['24 oz jar', oz(24)]), 'spaghetti sauce': g(['24 oz jar', oz(24)]),
  'marinara sauce': g(['24 oz jar', oz(24)]), 'barbecue sauce': g(['18 oz bottle', oz(18)]),
  mayonnaise: g(['15 oz jar', oz(15)], ['30 oz jar', oz(30)]),
  'white wine': BOTTLE, 'red wine': BOTTLE, wine: BOTTLE, sherry: BOTTLE, 'dry sherry': BOTTLE, vermouth: BOTTLE,
  beer: { by: 'ml', packs: [['12 oz bottle', floz(12)], ['6-pack', floz(72)]] },

  // the cupboard: bought when it runs out, not for one recipe
  salt: P, pepper: P, 'black pepper': P, peppercorn: P, cinnamon: P, nutmeg: P, paprika: P, 'chili powder': P, cumin: P,
  cayenne: P, 'cayenne pepper': P, 'garlic powder': P, 'onion powder': P, oregano: P, thyme: P, 'dried basil': P,
  rosemary: P, sage: P, 'bay leaf': P, 'ground ginger': P, clove: P, 'dry mustard': P, 'curry powder': P,
  'chili flake': P, allspice: P, mace: P, turmeric: P, marjoram: P, 'dried dill': P, 'ground coriander': P,
  coriander: P, 'italian seasoning': P, 'poultry seasoning': P, 'fennel seed': P, 'caraway seed': P, 'poppy seed': P,
  'sesame seed': P, 'sunflower seed': P, 'baking powder': P, 'baking soda': P, yeast: P, 'vanilla extract': P, vanilla: P,
  gelatin: P, arrowroot: P, 'wheat germ': P,
  oil: P, 'olive oil': P, 'vegetable oil': P, 'canola oil': P, 'coconut oil': P, 'sesame oil': P, 'peanut oil': P,
  shortening: P, lard: P, vinegar: P, ketchup: P, catsup: P, mustard: P, 'soy sauce': P, tamari: P,
  'worcestershire sauce': P, worcestershire: P, 'hot sauce': P, 'tabasco sauce': P, tabasco: P, 'fish sauce': P,
  'oyster sauce': P, horseradish: P, caper: P, coffee: P,
  brandy: P, rum: P, vodka: P, gin: P, tequila: P, whiskey: P, bourbon: P,
};
