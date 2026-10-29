"use client";

import { useCallback, useEffect, useState } from "react";
import type { Coordonnees } from "./distances";
import type { CreneauEntrainement, DeplacementStaff, Match, WeekendBuvette } from "./types";
import { PARAMETRES_DEFAUT, type Parametres } from "./couts";

/** État de l'application, conservé dans le navigateur (localStorage) */
export interface EtatClub {
  villeClub: string;
  matchs: Match[];
  /** Coordonnées obtenues en ligne, indexées par nom normalisé */
  cacheGeo: Record<string, Coordonnees>;
  parametres: Parametres;
  buvette: WeekendBuvette[];
  entrainements: CreneauEntrainement[];
  staff: DeplacementStaff[];
}

const CLE = "appli-basket-carbone:v1";
const ETAT_INITIAL: EtatClub = { villeClub: "Rennes", matchs: [], cacheGeo: {}, parametres: PARAMETRES_DEFAUT, buvette: [], entrainements: [], staff: [] };

function charger(): EtatClub {
  try {
    const brut = window.localStorage.getItem(CLE);
    if (!brut) return ETAT_INITIAL;
    const lu = JSON.parse(brut);
    return { ...ETAT_INITIAL, ...lu, parametres: {
        ...PARAMETRES_DEFAUT,
        ...(lu.parametres ?? {}),
        buvetteParMatch: { ...PARAMETRES_DEFAUT.buvetteParMatch, ...(lu.parametres?.buvetteParMatch ?? {}) },
        buvetteFacteurs: { ...PARAMETRES_DEFAUT.buvetteFacteurs, ...(lu.parametres?.buvetteFacteurs ?? {}) },
      },
    };
  } catch {
    return ETAT_INITIAL;
  }
}

export function useEtatClub() {
  const [etat, setEtat] = useState<EtatClub>(ETAT_INITIAL);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    setEtat(charger());
    setPret(true);
  }, []);

  useEffect(() => {
    if (!pret) return;
    try {
      window.localStorage.setItem(CLE, JSON.stringify(etat));
    } catch {
      /* stockage indisponible (navigation privée…) : l'appli fonctionne en mémoire */
    }
  }, [etat, pret]);

  const majMatch = useCallback((id: string, maj: Partial<Match>) => {
    setEtat((e) => ({ ...e, matchs: e.matchs.map((m) => (m.id === id ? { ...m, ...maj } : m)) }));
  }, []);

  const ajouterMatchs = useCallback((nouveaux: Match[], remplacer: boolean) => {
    setEtat((e) => ({
      ...e,
      matchs: [...(remplacer ? [] : e.matchs), ...nouveaux].sort((a, b) => a.date.localeCompare(b.date)),
    }));
  }, []);

  const supprimerMatch = useCallback((id: string) => {
    setEtat((e) => ({ ...e, matchs: e.matchs.filter((m) => m.id !== id) }));
  }, []);

  return { etat, setEtat, pret, majMatch, ajouterMatchs, supprimerMatch };
}
