// Tests rapides des calculs et de l'import : npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculerBilanMatch, calculerBilanGlobal, suggererRepartition } from "../src/lib/emissions";
import { estimerDistanceAR, trouverCommune } from "../src/lib/distances";
import { analyserLignes, lireClasseur, lireDate } from "../src/lib/excel";
import { calculerCoutMatch, completerVehicules, PARAMETRES_DEFAUT, vehiculesParDefaut } from "../src/lib/couts";

const m = {
  id: "t", date: "2026-11-14", equipe: "U13M", adversaire: "Betton",
  distanceAR: 20, sourceDistance: "fichier" as const, participants: 10,
  vehicules: { thermique: 2, hybride: 1, electrique: 0, minibus: 0 },
};
const b = calculerBilanMatch(m);
// réel = 20 × (2×0,218 + 0,165) = 12,02 ; réf = 10 × 20 × 0,218 = 43,6
assert.equal(+b.emissionsReelles.toFixed(2), 12.02);
assert.equal(+b.emissionsSansCovoiturage.toFixed(2), 43.6);
assert.equal(+b.emissionsEvitees.toFixed(2), 31.58);
assert.equal(+b.tauxOccupation!.toFixed(2), 3.33);
assert.equal(b.placesInsuffisantes, false);

const g = calculerBilanGlobal([m, { ...m, id: "u", vehicules: { thermique: 0, hybride: 0, electrique: 0, minibus: 0 } }]);
assert.equal(g.nbMatchsComplets, 1);
assert.deepEqual(suggererRepartition(12), { thermique: 1, hybride: 0, electrique: 0, minibus: 1 });

assert.equal(trouverCommune("Avenir Basket St Grégoire")?.nom, "Saint-Grégoire");
assert.equal(trouverCommune("CPB Rennes")?.nom, "Rennes");
const dBetton = estimerDistanceAR("Rennes", "Betton")!;
const dVitre = estimerDistanceAR("Rennes", "Vitré")!;
console.log(`Estimations A/R depuis Rennes : Betton ${dBetton} km, Vitré ${dVitre} km`);
assert.ok(dBetton > 15 && dBetton < 30);
assert.ok(dVitre > 70 && dVitre < 100);

assert.equal(lireDate("14/11/2026"), "2026-11-14");
assert.equal(lireDate(46340), "2026-11-14");

for (const f of ["exemples/calendrier-exemple.xlsx", "exemples/calendrier-exemple.csv"]) {
  const buf = readFileSync(f);
  const lignes = lireClasseur(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), f);
  const res = analyserLignes(lignes, "Rennes");
  assert.ok(!res.erreurGlobale, res.erreurGlobale);
  const ok = res.lignes.filter((l) => !l.erreurs.length);
  console.log(`${f} : ${res.lignes.length} lignes, ${ok.length} valides, ${res.lignes.filter((l) => l.match.sourceDistance === "estimee").length} distances estimées, ${res.lignes.filter((l) => l.match.sourceDistance === "inconnue").length} inconnues`);
  assert.equal(res.lignes[0].match.date, "2026-11-14");
  assert.ok(ok.length >= 10);
}
// Coûts : 3 voitures × 20 km × 0,40 = 24 €
const c = calculerCoutMatch(m, PARAMETRES_DEFAUT);
assert.equal(+c.voitures.toFixed(2), 24);
assert.equal(+c.sansCovoiturage.toFixed(2), 80);
// Minibus : 20 km × 10 L/100 × 1,80 = 3,60 € + 50 € de location
const cm = calculerCoutMatch({ ...m, vehicules: { thermique: 0, hybride: 0, electrique: 0, minibus: 1 } }, { ...PARAMETRES_DEFAUT, locationMinibus: 50 });
assert.equal(+cm.carburantMinibus.toFixed(2), 3.6);
assert.equal(+cm.total.toFixed(2), 53.6);
// Remplissage par défaut : 10 participants à 4 par voiture = 3 thermiques
assert.deepEqual(vehiculesParDefaut(10, PARAMETRES_DEFAUT), { thermique: 3, hybride: 0, electrique: 0, minibus: 0 });
const rempli = completerVehicules([{ ...m, vehicules: { thermique: 0, hybride: 0, electrique: 0, minibus: 0 } }, m], PARAMETRES_DEFAUT);
assert.equal(rempli[0].vehicules.thermique, 3);
assert.deepEqual(rempli[1].vehicules, m.vehicules);

console.log("Tous les tests passent ✔");
