"use client";

import { useCallback, useEffect, useState } from "react";
import type { Coordonnees } from "./distances";
import type { Match } from "./types";

/** État de l'application, conservé dans le navigateur (localStorage) */
export interface EtatClub {
  villeClub: string;
  matchs: Match[];
  /** Coordonnées obtenues en ligne, indexées par nom normalisé */
  cacheGeo: Record<string, Coordonnees>;
}

const CLE = "appli-basket-carbone:v1";
const ETAT_INITIAL: EtatClub = { villeClub: "Rennes", matchs: [], cacheGeo: {} };

function charger(): EtatClub {
  try {
    const brut = window.localStorage.getItem(CLE);
    return brut ? { ...ETAT_INITIAL, ...JSON.parse(brut) } : ETAT_INITIAL;
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
