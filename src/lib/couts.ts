import { calculerBilanMatch } from "./emissions";
import type { Match, Vehicules } from "./types";

/** Réglages du club (onglet Paramètres) */
export interface Parametres {
  /** Participants transportés par voiture pour le remplissage automatique */
  personnesParVoiture: number;
  /** Indemnité kilométrique des voitures, en € par km (toutes motorisations) */
  tarifKmVoiture: number;
  /** Consommation du minibus, en litres aux 100 km */
  consoMinibusL100: number;
  /** Prix du carburant du minibus, en € par litre */
  prixCarburantLitre: number;
  /** Coût de location d'un minibus, en € par déplacement */
  locationMinibus: number;
}

export const PARAMETRES_DEFAUT: Parametres = {
  personnesParVoiture: 4,
  tarifKmVoiture: 0.4,
  consoMinibusL100: 10,
  prixCarburantLitre: 1.8,
  locationMinibus: 0,
};

/** Répartition par défaut : uniquement des voitures thermiques, selon le nombre de personnes par voiture */
export function vehiculesParDefaut(participants: number, p: Parametres): Vehicules {
  const parVoiture = Math.max(1, Math.round(p.personnesParVoiture) || 1);
  return { thermique: Math.ceil(Math.max(0, participants) / parVoiture), hybride: 0, electrique: 0, minibus: 0 };
}

/** Remplit les véhicules des matchs qui n'en ont aucun */
export function completerVehicules(matchs: Match[], p: Parametres): Match[] {
  return matchs.map((m) => {
    const aucun = Object.values(m.vehicules).every((n) => !n);
    return aucun ? { ...m, vehicules: vehiculesParDefaut(m.participants, p) } : m;
  });
}

export const coutKmMinibus = (p: Parametres) => (p.consoMinibusL100 / 100) * p.prixCarburantLitre;

export interface CoutMatch {
  /** Indemnités kilométriques des voitures */
  voitures: number;
  carburantMinibus: number;
  locationMinibus: number;
  total: number;
  /** Coût si chaque participant venait avec sa propre voiture */
  sansCovoiturage: number;
}

const COUT_NUL: CoutMatch = { voitures: 0, carburantMinibus: 0, locationMinibus: 0, total: 0, sansCovoiturage: 0 };

export function calculerCoutMatch(m: Match, p: Parametres): CoutMatch {
  if (!calculerBilanMatch(m).complet) return { ...COUT_NUL };
  const d = m.distanceAR ?? 0;
  const nbVoitures = m.vehicules.thermique + m.vehicules.hybride + m.vehicules.electrique;
  const voitures = nbVoitures * d * p.tarifKmVoiture;
  const carburantMinibus = m.vehicules.minibus * d * coutKmMinibus(p);
  const locationMinibus = m.vehicules.minibus * p.locationMinibus;
  return {
    voitures,
    carburantMinibus,
    locationMinibus,
    total: voitures + carburantMinibus + locationMinibus,
    sansCovoiturage: m.participants * d * p.tarifKmVoiture,
  };
}

export function calculerCoutGlobal(matchs: Match[], p: Parametres): CoutMatch {
  return matchs.reduce((acc, m) => {
    const c = calculerCoutMatch(m, p);
    return {
      voitures: acc.voitures + c.voitures,
      carburantMinibus: acc.carburantMinibus + c.carburantMinibus,
      locationMinibus: acc.locationMinibus + c.locationMinibus,
      total: acc.total + c.total,
      sansCovoiturage: acc.sansCovoiturage + c.sansCovoiturage,
    };
  }, { ...COUT_NUL });
}

export const fmtEuro = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: n >= 1000 ? 0 : 2 }).format(n);
