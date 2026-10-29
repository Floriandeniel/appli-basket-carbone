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
