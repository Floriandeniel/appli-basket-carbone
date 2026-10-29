/**
 * Objectifs du club : chaque indicateur est comparé à une cible réglable dans Paramètres.
 * Statut : « atteint » (vert), « proche » (orange, à moins de 10 % de la cible), « à améliorer » (rouge).
 */
import { calculerBilanClub, type FiltreBilan } from "./club";
import { calculerBilanGlobal, calculerBilanMatch } from "./emissions";
import { calculerCoutGlobal, type Parametres } from "./couts";
import type { CreneauEntrainement, DeplacementStaff, Match, WeekendBuvette } from "./types";

export interface Objectifs {
  /** Empreinte totale du club sur la saison, en tCO2e (maximum) */
  co2SaisonMaxT: number;
  /** Personnes par véhicule sur les matchs (minimum) */
  occupationMin: number;
  /** Baisse du CO2 des matchs grâce au covoiturage, en % (minimum) */
  reductionCovoitMin: number;
  /** kgCO2e par participant et par déplacement de match (maximum) */
  co2ParParticipantMax: number;
  /** Part des km de matchs faits en hybride, électrique ou minibus, en % (minimum) */
  partBasCarboneMin: number;
  /** Part des joueurs venant à l'entraînement autrement que seuls en voiture, en % (minimum) */
  partModesDouxMin: number;
  /** Coût de transport par participant et par déplacement de match, en € (maximum) */
  coutParParticipantMax: number;
  /** kgCO2e de buvette par match à domicile (maximum) */
  co2BuvetteParMatchMax: number;
}

export const OBJECTIFS_DEFAUT: Objectifs = {
  co2SaisonMaxT: 40,
  occupationMin: 4,
  reductionCovoitMin: 70,
  co2ParParticipantMax: 4,
  partBasCarboneMin: 20,
  partModesDouxMin: 40,
  coutParParticipantMax: 7,
  co2BuvetteParMatchMax: 4,
};

/** Marge sous laquelle un objectif manqué est « proche » plutôt que « à améliorer » */
export const MARGE_PROCHE = 0.1;

export type Statut = "atteint" | "proche" | "rate" | "sans-donnee";

export const LIBELLES_STATUTS: Record<Statut, string> = {
  atteint: "Atteint",
  proche: "Proche",
  rate: "À améliorer",
  "sans-donnee": "Pas de données",
};

export interface ResultatObjectif {
  cle: keyof Objectifs;
  libelle: string;
  /** "max" : il faut rester en dessous ; "min" : il faut atteindre au moins */
  sens: "max" | "min";
  valeur: number | null;
  cible: number;
  unite: string;
  decimales: number;
  statut: Statut;
  /** valeur − cible */
  ecart: number | null;
  remarque?: string;
}

export function statutObjectif(valeur: number | null, cible: number, sens: "max" | "min"): Statut {
  if (valeur === null || !Number.isFinite(valeur)) return "sans-donnee";
  if (sens === "max") {
    if (valeur <= cible) return "atteint";
    return valeur <= cible * (1 + MARGE_PROCHE) ? "proche" : "rate";
  }
  if (valeur >= cible) return "atteint";
  return valeur >= cible * (1 - MARGE_PROCHE) ? "proche" : "rate";
}

interface Donnees {
  matchs: Match[];
  entrainements: CreneauEntrainement[];
  staff: DeplacementStaff[];
  buvette: WeekendBuvette[];
}

export function evaluerObjectifs(d: Donnees, f: FiltreBilan, p: Parametres, o: Objectifs): ResultatObjectif[] {
  const club = calculerBilanClub(d, f, p);
  const matchs = d.matchs.filter((m) => (f.equipe === "toutes" || m.equipe === f.equipe) && (f.mois === "tous" || m.date.startsWith(f.mois)));
  const g = calculerBilanGlobal(matchs);
  const cout = calculerCoutGlobal(matchs, p);
  const creneaux = d.entrainements.filter((c) => f.equipe === "toutes" || c.equipe === f.equipe);

  // Part des véhicules.km bas carbone sur les matchs
  let kmTotal = 0;
  let kmBas = 0;
  for (const m of matchs) {
    if (!calculerBilanMatch(m).complet) continue;
    const dist = m.distanceAR ?? 0;
    kmTotal += (m.vehicules.thermique + m.vehicules.hybride + m.vehicules.electrique + m.vehicules.minibus) * dist;
    kmBas += (m.vehicules.hybride + m.vehicules.electrique + m.vehicules.minibus) * dist;
  }

  const joueurs = creneaux.reduce((s, c) => s + c.joueurs, 0);
  const joueursDoux = creneaux.reduce((s, c) => s + (c.joueurs * (100 - c.partVoiture)) / 100, 0);
  const nbMatchsBuvette = club.buvette.matchs;
  const saison = f.mois === "tous";

  const r = (
    cle: keyof Objectifs,
    libelle: string,
    sens: "max" | "min",
    valeur: number | null,
    unite: string,
    decimales: number,
    remarque?: string,
  ): ResultatObjectif => {
    const cible = o[cle];
    return { cle, libelle, sens, valeur, cible, unite, decimales, statut: statutObjectif(valeur, cible, sens), ecart: valeur === null ? null : valeur - cible, remarque };
  };

  return [
    r(
      "co2SaisonMaxT",
      "Empreinte carbone du club",
      "max",
      saison && club.co2Total > 0 ? club.co2Total / 1000 : null,
      "tCO2e",
      1,
      saison ? undefined : "Objectif de saison : choisissez « Toute la saison »",
    ),
    r("occupationMin", "Remplissage des véhicules (matchs)", "min", g.tauxOccupationMoyen, "pers./véh.", 1),
    r(
      "reductionCovoitMin",
      "Baisse du CO2 grâce au covoiturage",
      "min",
      g.emissionsSansCovoiturage > 0 ? (g.emissionsEvitees / g.emissionsSansCovoiturage) * 100 : null,
      "%",
      0,
    ),
    r("co2ParParticipantMax", "CO2 par participant et par match", "max", g.participants > 0 ? g.emissionsReelles / g.participants : null, "kgCO2e", 1),
    r("partBasCarboneMin", "Km en hybride, électrique ou minibus", "min", kmTotal > 0 ? (kmBas / kmTotal) * 100 : null, "%", 0),
    r("partModesDouxMin", "Joueurs venant à l'entraînement sans voiture solo", "min", joueurs > 0 ? (joueursDoux / joueurs) * 100 : null, "%", 0),
    r("coutParParticipantMax", "Coût de transport par participant", "max", g.participants > 0 ? cout.total / g.participants : null, "€", 2),
    r("co2BuvetteParMatchMax", "CO2 de la buvette par match", "max", nbMatchsBuvette > 0 ? club.buvette.co2Total / nbMatchsBuvette : null, "kgCO2e", 1),
  ];
}
