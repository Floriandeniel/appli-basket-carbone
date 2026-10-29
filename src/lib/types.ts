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

/** Ce qu'il faut pour calculer les émissions et le coût d'un trajet */
export type Trajet = Pick<Match, "distanceAR" | "participants" | "vehicules">;

/** Buvette : un week-end de matchs à domicile */
export interface WeekendBuvette {
  id: string;
  /** Samedi du week-end (AAAA-MM-JJ) */
  date: string;
  matchsDomicile: number;
  /** Quantités réelles ; null = estimation (matchs × moyenne par match) */
  bouteilles: number | null;
  sirops: number | null;
  canettes: number | null;
}

export type Consommable = "bouteilles" | "sirops" | "canettes";

/** Entraînements : trajets domicile ↔ gymnase d'une équipe, sur la saison */
export interface CreneauEntrainement {
  id: string;
  equipe: string;
  joueurs: number;
  /** Distance moyenne domicile ↔ gymnase aller-retour, par joueur et par séance (km) */
  distanceAR: number;
  seancesParSemaine: number;
  semaines: number;
  /** Répartition des joueurs par mode, en % (total 100) */
  partVoiture: number;
  partCovoiturage: number;
  partBus: number;
  partVeloMarche: number;
}

export const MOTIFS_STAFF = ["Entraînement (coach)", "Réunion", "Assemblée générale", "Formation", "Ligue / Comité", "Autre"] as const;
export type MotifStaff = (typeof MOTIFS_STAFF)[number];

/** Déplacement du staff : entraîneurs, dirigeants, bénévoles */
export interface DeplacementStaff {
  id: string;
  date: string;
  motif: MotifStaff;
  destination: string;
  distanceAR: number | null;
  sourceDistance: SourceDistance;
  participants: number;
  vehicules: Vehicules;
  /** Nombre de fois que ce trajet est fait (ex. 30 séances sur la saison) */
  repetitions: number;
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
