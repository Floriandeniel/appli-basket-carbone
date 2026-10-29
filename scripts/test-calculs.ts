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

// Buvette : 2 matchs × moyenne (4 bouteilles, 0,5 sirop, 12 canettes), canettes saisies à 30
import("../src/lib/club").then(({ calculerBuvette, calculerCreneau, calculerDeplacementStaff, samediDuWeekend }) => {
  const bb = calculerBuvette([{ id: "w", date: "2026-11-14", matchsDomicile: 2, bouteilles: null, sirops: null, canettes: 30 }], PARAMETRES_DEFAUT);
  assert.deepEqual(bb.quantites, { bouteilles: 8, sirops: 1, canettes: 30 });
  assert.equal(+bb.co2Total.toFixed(2), +(8 * 0.35 + 1.2 + 30 * 0.2).toFixed(2));
  assert.equal(samediDuWeekend("2026-11-15"), "2026-11-14");
  assert.equal(samediDuWeekend("2026-11-14"), "2026-11-14");
  // Entraînement : 10 joueurs, 6 km A/R, 2 séances × 30 semaines ; 50 % voiture, 30 % covoit (3/voiture), 20 % vélo
  const be = calculerCreneau({ id: "e", equipe: "U13M", joueurs: 10, distanceAR: 6, seancesParSemaine: 2, semaines: 30,
    partVoiture: 50, partCovoiturage: 30, partBus: 0, partVeloMarche: 20 }, PARAMETRES_DEFAUT);
  // km/joueur = 360 ; voiture 5×360×0,218 = 392,4 ; covoit 1×360×0,218 = 78,48
  assert.equal(+be.co2.toFixed(2), 470.88);
  assert.equal(+be.co2ToutVoiture.toFixed(1), 784.8);
  // Staff : 1 voiture, 30 km, répété 10 fois
  const bs = calculerDeplacementStaff({ id: "s", date: "2026-11-01", motif: "Réunion", destination: "Betton", distanceAR: 30,
    sourceDistance: "manuelle", participants: 2, vehicules: { thermique: 1, hybride: 0, electrique: 0, minibus: 0 }, repetitions: 10 }, PARAMETRES_DEFAUT);
  assert.equal(+bs.co2.toFixed(2), 65.4);
  assert.equal(+bs.cout.toFixed(2), 120);
  return import("../src/lib/objectifs").then(({ statutObjectif }) => {
    assert.equal(statutObjectif(38, 40, "max"), "atteint");
    assert.equal(statutObjectif(43, 40, "max"), "proche");
    assert.equal(statutObjectif(45, 40, "max"), "rate");
    assert.equal(statutObjectif(3.7, 4, "min"), "proche");
    assert.equal(statutObjectif(3, 4, "min"), "rate");
    assert.equal(statutObjectif(null, 4, "min"), "sans-donnee");
    console.log("Tous les tests passent ✔");
  });
});
