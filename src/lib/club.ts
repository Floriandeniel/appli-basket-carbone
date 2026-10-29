/**
 * Calculs des modules Buvette, Entraînements et Staff, et bilan global du club.
 */
import { calculerBilanGlobal, calculerBilanMatch, FACTEUR_REFERENCE, FACTEURS_EMISSION } from "./emissions";
import { calculerCoutGlobal, calculerCoutMatch, type Parametres } from "./couts";
import type { Consommable, CreneauEntrainement, DeplacementStaff, Match, WeekendBuvette } from "./types";

export const CONSOMMABLES: Consommable[] = ["bouteilles", "sirops", "canettes"];

export const LIBELLES_CONSOMMABLES: Record<Consommable, string> = {
  bouteilles: "Bouteilles (eau, soda 1,5 L)",
  sirops: "Sirops (bouteille 70 cl)",
  canettes: "Canettes 33 cl",
};

export const LIBELLES_COURTS_CONSOMMABLES: Record<Consommable, string> = {
  bouteilles: "Bouteilles",
  sirops: "Sirops",
  canettes: "Canettes",
};

/* ------------------------------------------------------------------ */
/* Buvette                                                             */
/* ------------------------------------------------------------------ */

/** Quantité retenue : la saisie réelle si elle existe, sinon matchs × moyenne par match */
export function quantiteBuvette(w: WeekendBuvette, c: Consommable, p: Parametres): number {
  const reel = w[c];
  if (reel !== null && reel !== undefined) return reel;
  return Math.round(w.matchsDomicile * p.buvetteParMatch[c]);
}

export const estEstime = (w: WeekendBuvette, c: Consommable) => w[c] === null || w[c] === undefined;

export interface BilanBuvette {
  weekends: number;
  matchs: number;
  quantites: Record<Consommable, number>;
  co2: Record<Consommable, number>;
  co2Total: number;
}

export function calculerBuvette(weekends: WeekendBuvette[], p: Parametres): BilanBuvette {
  const b: BilanBuvette = {
    weekends: weekends.length,
    matchs: 0,
    quantites: { bouteilles: 0, sirops: 0, canettes: 0 },
    co2: { bouteilles: 0, sirops: 0, canettes: 0 },
    co2Total: 0,
  };
  for (const w of weekends) {
    b.matchs += w.matchsDomicile;
    for (const c of CONSOMMABLES) {
      const q = quantiteBuvette(w, c, p);
      b.quantites[c] += q;
      b.co2[c] += q * p.buvetteFacteurs[c];
    }
  }
  b.co2Total = CONSOMMABLES.reduce((s, c) => s + b.co2[c], 0);
  return b;
}

/** Samedi du week-end d'une date (un dimanche renvoie la veille) */
export function samediDuWeekend(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  const jour = d.getDay(); // 0 = dimanche, 6 = samedi
  const decalage = jour === 0 ? -1 : 6 - jour;
  d.setDate(d.getDate() + decalage);
  return d.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/* Entraînements                                                       */
/* ------------------------------------------------------------------ */

export interface BilanEntrainement {
  /** km parcourus par l'ensemble des joueurs sur la saison (trajets joueur.km) */
  kmJoueurs: number;
  co2: number;
  /** Si chaque joueur venait seul en voiture */
  co2ToutVoiture: number;
  evite: number;
  /** Détail par mode */
  parMode: { voiture: number; covoiturage: number; bus: number; veloMarche: number };
}

export function calculerCreneau(c: CreneauEntrainement, p: Parametres): BilanEntrainement {
  const trajets = c.seancesParSemaine * c.semaines;
  const kmParJoueur = c.distanceAR * trajets;
  const joueurs = (part: number) => (c.joueurs * Math.max(0, part)) / 100;
  const voiture = joueurs(c.partVoiture) * kmParJoueur * FACTEURS_EMISSION.thermique;
  const covoiturage =
    (joueurs(c.partCovoiturage) / Math.max(1, p.joueursParVoitureCovoit)) * kmParJoueur * FACTEURS_EMISSION.thermique;
  const bus = joueurs(c.partBus) * kmParJoueur * p.facteurBus;
  const co2 = voiture + covoiturage + bus;
  const co2ToutVoiture = c.joueurs * kmParJoueur * FACTEUR_REFERENCE;
  return {
    kmJoueurs: c.joueurs * kmParJoueur,
    co2,
    co2ToutVoiture,
    evite: co2ToutVoiture - co2,
    parMode: { voiture, covoiturage, bus, veloMarche: 0 },
  };
}

export function calculerEntrainements(creneaux: CreneauEntrainement[], p: Parametres): BilanEntrainement & { joueurs: number } {
  const t = { kmJoueurs: 0, co2: 0, co2ToutVoiture: 0, evite: 0, joueurs: 0, parMode: { voiture: 0, covoiturage: 0, bus: 0, veloMarche: 0 } };
  for (const c of creneaux) {
    const b = calculerCreneau(c, p);
    t.kmJoueurs += b.kmJoueurs;
    t.co2 += b.co2;
    t.co2ToutVoiture += b.co2ToutVoiture;
    t.evite += b.evite;
    t.joueurs += c.joueurs;
    t.parMode.voiture += b.parMode.voiture;
    t.parMode.covoiturage += b.parMode.covoiturage;
    t.parMode.bus += b.parMode.bus;
  }
  return t;
}

export const totalParts = (c: CreneauEntrainement) => c.partVoiture + c.partCovoiturage + c.partBus + c.partVeloMarche;

/* ------------------------------------------------------------------ */
/* Staff                                                               */
/* ------------------------------------------------------------------ */

export function calculerDeplacementStaff(d: DeplacementStaff, p: Parametres) {
  const b = calculerBilanMatch(d);
  const c = calculerCoutMatch(d, p);
  const n = Math.max(1, d.repetitions || 1);
  return {
    complet: b.complet,
    km: b.distanceAR * n,
    vehiculesKm: b.vehiculesKm * n,
    co2: b.emissionsReelles * n,
    cout: c.total * n,
  };
}

export function calculerStaff(deplacements: DeplacementStaff[], p: Parametres) {
  const t = { nb: deplacements.length, km: 0, vehiculesKm: 0, co2: 0, cout: 0, parMotif: {} as Record<string, { co2: number; cout: number; nb: number }> };
  for (const d of deplacements) {
    const b = calculerDeplacementStaff(d, p);
    if (!b.complet) continue;
    t.km += b.km;
    t.vehiculesKm += b.vehiculesKm;
    t.co2 += b.co2;
    t.cout += b.cout;
    const m = (t.parMotif[d.motif] ??= { co2: 0, cout: 0, nb: 0 });
    m.co2 += b.co2;
    m.cout += b.cout;
    m.nb += Math.max(1, d.repetitions || 1);
  }
  return t;
}

/* ------------------------------------------------------------------ */
/* Bilan global                                                        */
/* ------------------------------------------------------------------ */

export type Categorie = "matchs" | "entrainements" | "staff" | "buvette";

export const LIBELLES_CATEGORIES: Record<Categorie, string> = {
  matchs: "Transport matchs",
  entrainements: "Entraînements",
  staff: "Déplacements staff",
  buvette: "Buvette",
};

export interface FiltreBilan {
  equipe: string; // "toutes" ou nom d'équipe
  mois: string; // "tous" ou AAAA-MM
}

/**
 * Bilan CO2 par catégorie.
 * - Matchs : filtrés par équipe et par mois.
 * - Entraînements : filtrés par équipe ; total saison (pas de date).
 * - Staff et buvette : filtrés par mois ; ils concernent tout le club.
 */
export function calculerBilanClub(
  donnees: { matchs: Match[]; entrainements: CreneauEntrainement[]; staff: DeplacementStaff[]; buvette: WeekendBuvette[] },
  f: FiltreBilan,
  p: Parametres,
) {
  const parMois = <T extends { date: string }>(xs: T[]) => (f.mois === "tous" ? xs : xs.filter((x) => x.date.startsWith(f.mois)));
  const parEquipe = <T extends { equipe: string }>(xs: T[]) => (f.equipe === "toutes" ? xs : xs.filter((x) => x.equipe === f.equipe));

  const matchs = parMois(parEquipe(donnees.matchs));
  const creneaux = parEquipe(donnees.entrainements);
  const staff = parMois(donnees.staff);
  const buvette = parMois(donnees.buvette);

  const bm = calculerBilanGlobal(matchs);
  const be = calculerEntrainements(creneaux, p);
  const bs = calculerStaff(staff, p);
  const bb = calculerBuvette(buvette, p);
  const coutMatchs = calculerCoutGlobal(matchs, p).total;

  const co2: Record<Categorie, number> = {
    matchs: bm.emissionsReelles,
    entrainements: be.co2,
    staff: bs.co2,
    buvette: bb.co2Total,
  };
  return {
    co2,
    co2Total: co2.matchs + co2.entrainements + co2.staff + co2.buvette,
    evite: bm.emissionsEvitees + be.evite,
    cout: { matchs: coutMatchs, staff: bs.cout, total: coutMatchs + bs.cout },
    entrainements: be,
    staff: bs,
    buvette: bb,
  };
}
