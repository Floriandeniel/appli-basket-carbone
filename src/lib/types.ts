export type TypeVehicule = "thermique" | "hybride" | "electrique" | "minibus";

export type Vehicules = Record<TypeVehicule, number>;

/** Origine de la distance A/R affichée pour un match */
export type SourceDistance = "fichier" | "estimee" | "manuelle" | "inconnue";

export interface Match {
  id: string;
  /** Date ISO (AAAA-MM-JJ) */
  date: string;
  equipe: string;
  adversaire: string;
  /** Distance aller-retour en km (null si inconnue) */
  distanceAR: number | null;
  sourceDistance: SourceDistance;
  /** Joueurs + coachs */
  participants: number;
  vehicules: Vehicules;
}

export const VEHICULES_VIDES: Vehicules = {
  thermique: 0,
  hybride: 0,
  electrique: 0,
  minibus: 0,
};

/** Ligne issue de l'import, avant validation */
export interface LigneImport {
  numeroLigne: number;
  match: Match;
  erreurs: string[];
  avertissements: string[];
}
