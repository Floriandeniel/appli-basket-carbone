import type { Match, TypeVehicule, Vehicules } from "./types";

/**
 * Facteurs d'émission (kgCO2e par véhicule.km), d'après la Base Empreinte ADEME.
 * Le facteur s'applique au véhicule, quel que soit le nombre de passagers.
 */
export const FACTEURS_EMISSION: Record<TypeVehicule, number> = {
  thermique: 0.218,
  hybride: 0.165,
  electrique: 0.022,
  minibus: 0.27,
};

/** Places disponibles par véhicule (conducteur compris) */
export const PLACES_PAR_VEHICULE: Record<TypeVehicule, number> = {
  thermique: 5,
  hybride: 5,
  electrique: 5,
  minibus: 9,
};

export const LIBELLES_VEHICULES: Record<TypeVehicule, string> = {
  thermique: "Voiture thermique",
  hybride: "Voiture hybride",
  electrique: "Voiture électrique",
  minibus: "Minibus 9 places",
};

export const LIBELLES_COURTS: Record<TypeVehicule, string> = {
  thermique: "Thermique",
  hybride: "Hybride",
  electrique: "Électrique",
  minibus: "Minibus",
};

export const TYPES_VEHICULES: TypeVehicule[] = ["thermique", "hybride", "electrique", "minibus"];

/** Scénario de référence : une voiture thermique par participant */
export const FACTEUR_REFERENCE = FACTEURS_EMISSION.thermique;

export function nombreVehicules(v: Vehicules): number {
  return TYPES_VEHICULES.reduce((s, t) => s + (v[t] || 0), 0);
}

export function placesDisponibles(v: Vehicules): number {
  return TYPES_VEHICULES.reduce((s, t) => s + (v[t] || 0) * PLACES_PAR_VEHICULE[t], 0);
}

export interface BilanMatch {
  /** La distance et au moins un véhicule sont renseignés */
  complet: boolean;
  distanceAR: number;
  nbVehicules: number;
  /** km parcourus par l'ensemble des véhicules */
  vehiculesKm: number;
  /** 1. Émissions réelles du déplacement */
  emissionsReelles: number;
  /** 2. Scénario "sans covoiturage" : 1 voiture thermique par participant */
  emissionsSansCovoiturage: number;
  /** 3. Émissions évitées grâce au covoiturage (référence − réel) */
  emissionsEvitees: number;
  /** Participants par véhicule */
  tauxOccupation: number | null;
  /** Les places des véhicules ne suffisent pas pour tous les participants */
  placesInsuffisantes: boolean;
}

export function calculerBilanMatch(m: Match): BilanMatch {
  const d = m.distanceAR ?? 0;
  const nbVehicules = nombreVehicules(m.vehicules);
  const complet = m.distanceAR !== null && m.distanceAR > 0 && nbVehicules > 0;

  const emissionsReelles = TYPES_VEHICULES.reduce(
    (s, t) => s + (m.vehicules[t] || 0) * d * FACTEURS_EMISSION[t],
    0,
  );
  const emissionsSansCovoiturage = m.participants * d * FACTEUR_REFERENCE;

  return {
    complet,
    distanceAR: d,
    nbVehicules,
    vehiculesKm: nbVehicules * d,
    emissionsReelles: complet ? emissionsReelles : 0,
    emissionsSansCovoiturage: complet ? emissionsSansCovoiturage : 0,
    emissionsEvitees: complet ? emissionsSansCovoiturage - emissionsReelles : 0,
    tauxOccupation: nbVehicules > 0 ? m.participants / nbVehicules : null,
    placesInsuffisantes: nbVehicules > 0 && placesDisponibles(m.vehicules) < m.participants,
  };
}

export interface BilanGlobal {
  nbMatchs: number;
  nbMatchsComplets: number;
  kmParcourus: number;
  vehiculesKm: number;
  emissionsReelles: number;
  emissionsSansCovoiturage: number;
  emissionsEvitees: number;
  /** Moyenne pondérée : total participants / total véhicules (matchs complets) */
  tauxOccupationMoyen: number | null;
  participants: number;
  vehicules: number;
}

export function calculerBilanGlobal(matchs: Match[]): BilanGlobal {
  const b: BilanGlobal = {
    nbMatchs: matchs.length,
    nbMatchsComplets: 0,
    kmParcourus: 0,
    vehiculesKm: 0,
    emissionsReelles: 0,
    emissionsSansCovoiturage: 0,
    emissionsEvitees: 0,
    tauxOccupationMoyen: null,
    participants: 0,
    vehicules: 0,
  };
  for (const m of matchs) {
    const bm = calculerBilanMatch(m);
    if (!bm.complet) continue;
    b.nbMatchsComplets++;
    b.kmParcourus += bm.distanceAR;
    b.vehiculesKm += bm.vehiculesKm;
    b.emissionsReelles += bm.emissionsReelles;
    b.emissionsSansCovoiturage += bm.emissionsSansCovoiturage;
    b.emissionsEvitees += bm.emissionsEvitees;
    b.participants += m.participants;
    b.vehicules += bm.nbVehicules;
  }
  b.tauxOccupationMoyen = b.vehicules > 0 ? b.participants / b.vehicules : null;
  return b;
}

/**
 * Répartition suggérée qui minimise les émissions avec une flotte "classique" :
 * minibus d'abord (0,030 kgCO2e/place.km contre 0,044 pour une voiture pleine), puis voitures.
 */
export function suggererRepartition(participants: number, minibusDisponibles = 1): Vehicules {
  let restants = participants;
  const minibus = Math.min(minibusDisponibles, Math.floor(restants / PLACES_PAR_VEHICULE.minibus));
  restants -= minibus * PLACES_PAR_VEHICULE.minibus;
  const voitures = Math.ceil(restants / PLACES_PAR_VEHICULE.thermique);
  return { thermique: voitures, hybride: 0, electrique: 0, minibus };
}
