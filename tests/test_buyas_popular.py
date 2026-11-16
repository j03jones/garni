"""The shopping list in store sizes (web/js/buyas.js) and popular recipes first (web/js/popular.js), in Node."""
import json
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SCRIPT = r"""
import { annotate, pounds, choosePack } from './web/js/buyas.js';
import { shoppingList } from './web/js/shopping.js';
import { Frac, parseQuantity } from './web/js/units.js';
import { dishOf, popularity, orderByPopularity, topDishes } from './web/js/popular.js';
const ing = (q, unit, item) => ({ q: q ? parseQuantity(q) : null, raw: q || '', unit, item, group: '' });
const cake = { title: 'Cake', ings: [ing('2 1/4', 'cup', 'all-purpose flour'), ing('1', 'cup', 'butter, softened'), ing('3', '', 'eggs'),
  ing('1', 'tsp', 'vanilla extract'), ing('1/2', 'tsp', 'salt'), ing('1', 'cup', 'sugar'), ing('2', 'Tbsp', 'lemon juice'), ing('1', 'cup', 'milk')] };
const chili = { title: 'Chili', ings: [ing('1 1/2', 'lb', 'ground beef'), ing('1', '', 'onion, chopped'), ing('3', 'clove', 'garlic, minced'),
  ing('1', '', 'fat garlic clove'), ing('2', '', 'large eggs'), ing('1', 'cup', 'shredded cheddar cheese'), ing('2', 'Tbsp', 'chili powder'),
  ing('1/4', 'cup', 'fresh cilantro'), ing('5', 'cup', 'chicken stock'), ing('1', 'Tbsp', 'flour'), ing('1', 'can', 'kidney beans'), ing('', '', 'pepper')] };
const picks = [[cake, new Frac(1n)], [chili, new Frac(1n)]];
const lines = Object.fromEntries(annotate(shoppingList(picks), picks).map((l) => [l.name, { buy: l.buy, cupboard: l.cupboard, text: l.text }]));
const doubled = Object.fromEntries(annotate(shoppingList([[cake, new Frac(4n)]]), [[cake, new Frac(4n)]]).map((l) => [l.name, l.buy]));
const R = (title, n = 8) => ({ title, ings: Array.from({ length: n }, () => ing('1', 'cup', 'flour')), _mins: 30 });
const list = ['Chocolate Chip Cookies', 'Chocolate Chip Cookies 2', 'Aunt Mabel\'s Chocolate Chip Cookies', 'Lasagna', 'Hearty Russian Beet Soup', 'Pancakes']
  .map((t) => { const r = R(t); r._pop = popularity(r); r._dish = dishOf(t)?.dish || ''; return r; });
console.log(JSON.stringify({
  lines, doubled,
  pounds: [100, 454, 600, 1000].map(pounds),
  packs: [choosePack([['8 oz tub', 227], ['16 oz tub', 454]], 300), choosePack([['1 head', 10]], 25), choosePack([['15 oz can', 255]], 600)],
  dish: ['Grandma\'s Best Chocolate Chip Cookie', 'Pancakes', 'Hearty Russian Beet Soup', 'Apple Pies'].map((t) => dishOf(t)?.dish || null),
  order: orderByPopularity([...list].sort((a, b) => b._pop - a._pop)).map((r) => r.title),
  top: topDishes(list, 5, (r) => r._pop).map((r) => r.title),
}));
"""


@unittest.skipUnless(shutil.which("node"), "needs Node")
class StoreSizesAndPopular(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        res = subprocess.run(["node", "--input-type=module", "-e", SCRIPT], cwd=ROOT, capture_output=True, text=True, timeout=60)
        if res.returncode:
            raise AssertionError(res.stderr)
        cls.o = json.loads(res.stdout)

    def test_store_sizes(self):
        l = self.o["lines"]
        self.assertEqual(l["Flour"]["buy"], "5 lb bag")             # all-purpose flour and flour: one line, one bag
        self.assertNotIn("All-purpose flour", l)
        self.assertEqual(l["Butter"]["buy"], "2 sticks")            # 1 cup of butter
        self.assertEqual(l["Eggs"]["buy"], "half a dozen")          # 3 eggs and 2 large eggs
        self.assertEqual(l["Garlic"]["buy"], "1 head")              # 4 cloves, from two differently worded lines
        self.assertEqual(l["Ground beef"]["buy"], "1½ lb")
        self.assertEqual(l["Lemon juice"]["buy"], "1 lemon")
        self.assertEqual(l["Milk"]["buy"], "1 pint")
        self.assertEqual(l["Chicken stock"]["buy"], "2 × 32 oz carton")
        self.assertEqual(l["Shredded cheddar cheese"]["buy"], "8 oz bag")
        self.assertEqual(l["Fresh cilantro"]["buy"], "1 bunch")

    def test_cupboard_and_unknowns(self):
        l = self.o["lines"]
        for name in ("Salt", "Vanilla extract", "Chili powder", "Pepper"):
            self.assertTrue(l[name]["cupboard"], name)
            self.assertIsNone(l[name]["buy"])
        self.assertIsNone(l["Kidney beans"]["buy"])                  # "1 can": already a store size, kept as written
        self.assertIn("recipes use 2 1/4 cups", l["Flour"]["text"])
        self.assertIn("check the cupboard", l["Salt"]["text"])

    def test_scaled(self):
        d = self.o["doubled"]
        self.assertEqual(d["Butter"], "2 × 1 lb box (4 sticks)")    # 4 cups is 2 lb
        self.assertEqual(d["Eggs"], "1 dozen")
        self.assertEqual(d["Milk"], "1 quart")

    def test_helpers(self):
        self.assertEqual(self.o["pounds"], ["¼ lb", "1 lb", "1½ lb", "2¼ lb"])
        self.assertEqual(self.o["packs"], ["16 oz tub", "3 heads", "3 × 15 oz can"])

    def test_popular(self):
        self.assertEqual(self.o["dish"], ["chocolat chip cooki", "pancak", None, "appl pie"])
        order = self.o["order"]
        self.assertEqual(order[-1], "Hearty Russian Beet Soup")     # not a well-known dish: last
        self.assertLess(order.index("Lasagna"), order.index("Chocolate Chip Cookies 2"))   # a second copy drops back
        self.assertEqual(len([t for t in self.o["top"] if "Chocolate Chip" in t]), 1)       # one per dish


if __name__ == "__main__":
    unittest.main()
