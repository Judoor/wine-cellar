// Adds demo wines to the first user's cellar (development only): node scripts/seed-demo.mjs
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

const db = new Database(`${process.env.DATA_DIR ?? "./data"}/winecellar.db`);
const user = db.prepare("select id from users order by created_at limit 1").get();
if (!user) throw new Error("Create an account first.");

const y = new Date().getFullYear();
const demo = [
  ["Domaine des Tourelles", "Les Grands Champs", 2018, "white", "Bourgogne", "Meursault", 6, 45, [y - 2, y - 1, y + 2, y + 5]],
  ["Château Mirande", null, 2014, "red", "Bordeaux", "Saint-Émilion Grand Cru", 4, 38, [y - 4, y - 2, y, y + 1]],
  ["Clos Saint-Léon", "Vieilles Vignes", 2019, "red", "Bourgogne", "Gevrey-Chambertin", 5, 62, [y - 1, y - 1, y + 3, y + 8]],
  ["Maison Verrière", "Brut Nature", 2020, "sparkling", "Alsace", "Crémant d'Alsace", 8, 18, [y - 3, y - 2, y + 1, y + 3]],
  ["Mas des Oliviers", null, 2023, "rose", "Provence", "Côtes de Provence", 3, 14, [y - 1, y - 1, y, y + 1]],
  ["Château Doisy", null, 2015, "sweet", "Bordeaux", "Sauternes", 2, 35, [y - 5, y + 2, y + 15, y + 25]],
  ["Domaine Rollet", "Cuvée Tradition", 2021, "red", "Rhône", "Crozes-Hermitage", 6, 22, [y, y + 2, y + 5, y + 8]],
];

const insertWine = db.prepare(`insert into wines (id, user_id, producer, name, vintage, color, country, region, appellation, purchase_price, drink_from, peak_from, peak_until, drink_until)
  values (?, ?, ?, ?, ?, ?, 'France', ?, ?, ?, ?, ?, ?, ?)`);
const insertBottle = db.prepare("insert into bottles (id, wine_id) values (?, ?)");

db.transaction(() => {
  for (const [producer, name, vintage, color, region, appellation, qty, price, [df, pf, pu, du]] of demo) {
    const wineId = randomUUID();
    insertWine.run(wineId, user.id, producer, name, vintage, color, region, appellation, price, df, pf, pu, du);
    for (let i = 0; i < qty; i++) insertBottle.run(randomUUID(), wineId);
  }
})();
console.log(`Added ${demo.length} demo wines.`);
