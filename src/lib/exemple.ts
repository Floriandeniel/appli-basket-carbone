import { estimerDistanceAR } from "./distances";
import type { Match, Vehicules } from "./types";
import { nouvelId } from "./excel";

/** Calendrier de démonstration (saison 2026-2027, club basé à Rennes) */
const DONNEES: [string, string, string, number | null, number, Partial<Vehicules>][] = [
  ["2026-09-26", "U13M", "Cesson-Sévigné", null, 10, { thermique: 2, hybride: 1 }],
  ["2026-09-27", "U15F", "Betton", null, 9, { minibus: 1 }],
  ["2026-10-03", "Senior Garçons 2", "Vitré", 76, 12, { thermique: 2, electrique: 1 }],
  ["2026-10-04", "U13M", "Saint-Malo", null, 10, { minibus: 1, thermique: 1 }],
  ["2026-10-10", "U15F", "Fougères", null, 9, { thermique: 2, hybride: 1 }],
  ["2026-10-11", "Senior Filles 1", "Bruz", null, 11, { thermique: 3 }],
  ["2026-10-17", "U17M", "Vannes", null, 11, { minibus: 1, hybride: 1 }],
  ["2026-10-18", "Senior Garçons 2", "Liffré", null, 12, { thermique: 1, hybride: 1, electrique: 1 }],
  ["2026-11-07", "U13M", "Pacé", null, 10, {}],
  ["2026-11-08", "U15F", "Saint-Grégoire", null, 9, {}],
  ["2026-11-14", "Senior Filles 1", "Redon", null, 11, {}],
  ["2026-11-15", "U17M", "Dinan", null, 11, {}],
];

export function calendrierExemple(villeClub: string): Match[] {
  return DONNEES.map(([date, equipe, adversaire, dist, participants, v]) => {
    const estimee = dist === null ? estimerDistanceAR(villeClub, adversaire) : null;
    return {
      id: nouvelId(),
      date,
      equipe,
      adversaire,
      distanceAR: dist ?? estimee,
      sourceDistance: dist !== null ? "fichier" : estimee !== null ? "estimee" : "inconnue",
      participants,
      vehicules: { thermique: 0, hybride: 0, electrique: 0, minibus: 0, ...v },
    };
  });
}

/* Exemples pour les onglets Entraînements, Staff et Buvette */

import type { CreneauEntrainement, DeplacementStaff, WeekendBuvette } from "./types";
import { samediDuWeekend } from "./club";

export function entrainementsExemple(): CreneauEntrainement[] {
  const base = { seancesParSemaine: 2, semaines: 32, partBus: 0 };
  return [
    { id: nouvelId(), equipe: "U13M", joueurs: 10, distanceAR: 7, ...base, partVoiture: 60, partCovoiturage: 20, partVeloMarche: 20 },
    { id: nouvelId(), equipe: "U15F", joueurs: 9, distanceAR: 9, ...base, partVoiture: 45, partCovoiturage: 35, partVeloMarche: 10, partBus: 10 },
    { id: nouvelId(), equipe: "U17M", joueurs: 11, distanceAR: 10, ...base, partVoiture: 30, partCovoiturage: 20, partBus: 25, partVeloMarche: 25 },
    { id: nouvelId(), equipe: "Senior Filles 1", joueurs: 11, distanceAR: 14, ...base, partVoiture: 70, partCovoiturage: 20, partVeloMarche: 10 },
    { id: nouvelId(), equipe: "Senior Garçons 2", joueurs: 12, distanceAR: 12, ...base, partVoiture: 75, partCovoiturage: 15, partVeloMarche: 10 },
  ];
}

export function staffExemple(villeClub: string): DeplacementStaff[] {
  const v = (thermique = 1, hybride = 0) => ({ thermique, hybride, electrique: 0, minibus: 0 });
  const ligne = (date: string, motif: DeplacementStaff["motif"], destination: string, distanceAR: number, participants: number, repetitions: number, vehicules = v()): DeplacementStaff => ({
    id: nouvelId(), date, motif, destination, distanceAR, sourceDistance: "manuelle", participants, vehicules, repetitions,
  });
  return [
    ligne("2026-09-01", "Entraînement (coach)", villeClub, 12, 1, 60),
    ligne("2026-09-01", "Entraînement (coach)", villeClub, 18, 1, 60, v(0, 1)),
    ligne("2026-09-15", "Réunion", villeClub, 10, 4, 8, v(3, 0)),
    ligne("2026-10-11", "Formation", "Saint-Brieuc", 200, 2, 1),
    ligne("2026-11-20", "Ligue / Comité", "Cesson-Sévigné", 16, 2, 3),
    ligne("2027-01-24", "Assemblée générale", villeClub, 8, 25, 1, v(14, 2)),
  ];
}

export function buvetteExemple(matchs: Match[]): WeekendBuvette[] {
  const dates = [...new Set(matchs.map((m) => samediDuWeekend(m.date)))].sort();
  return dates.map((date, i) => ({
    id: nouvelId(),
    date,
    matchsDomicile: [3, 2, 4, 2, 3, 3][i % 6],
    bouteilles: null,
    sirops: null,
    // un week-end compté pour de vrai
    canettes: i === 0 ? 41 : null,
  }));
}
