"use client";

import { Bike, Bus, Car, Dumbbell, Plus, Trash2, TriangleAlert, Users } from "lucide-react";
import { calculerCreneau, calculerEntrainements, totalParts } from "@/lib/club";
import type { Parametres } from "@/lib/couts";
import { fmt, fmtCO2 } from "@/lib/format";
import { nouvelId } from "@/lib/excel";
import type { CreneauEntrainement, Match } from "@/lib/types";
import { ChampNombre, EnTete, Tuile } from "./Champs";

interface Props {
  creneaux: CreneauEntrainement[];
  matchs: Match[];
  equipes: string[];
  parametres: Parametres;
  onChange: (c: CreneauEntrainement[]) => void;
}

const MODES = [
  { cle: "partVoiture", libelle: "Voiture seul", icone: Car },
  { cle: "partCovoiturage", libelle: "Covoiturage", icone: Users },
  { cle: "partBus", libelle: "Bus / car", icone: Bus },
  { cle: "partVeloMarche", libelle: "Vélo / marche", icone: Bike },
] as const;

function nouveauCreneau(equipe: string, joueurs = 10): CreneauEntrainement {
  return {
    id: nouvelId(),
    equipe,
    joueurs,
    distanceAR: 8,
    seancesParSemaine: 2,
    semaines: 32,
    partVoiture: 60,
    partCovoiturage: 20,
    partBus: 0,
    partVeloMarche: 20,
  };
}

export function Entrainements({ creneaux, matchs, equipes, parametres: p, onChange }: Props) {
  const maj = (id: string, m: Partial<CreneauEntrainement>) => onChange(creneaux.map((c) => (c.id === id ? { ...c, ...m } : c)));
  const t = calculerEntrainements(creneaux, p);
  const sansCreneau = equipes.filter((e) => !creneaux.some((c) => c.equipe === e));

  /** Effectif probable d'une équipe : participants du calendrier moins 1 coach */
  const effectif = (e: string) => {
    const ms = matchs.filter((m) => m.equipe === e);
    return ms.length ? Math.max(5, Math.max(...ms.map((m) => m.participants)) - 1) : 10;
  };

  return (
    <div className="space-y-4">
      <EnTete
        titre="Entraînements"
        actions={
          <>
            <button onClick={() => onChange([...creneaux, nouveauCreneau("Nouvelle équipe")])} className="btn-secondaire">
              <Plus className="h-4 w-4" /> Ajouter une équipe
            </button>
            {sansCreneau.length > 0 && (
              <button onClick={() => onChange([...creneaux, ...sansCreneau.map((e) => nouveauCreneau(e, effectif(e)))])} className="btn-primaire">
                <Plus className="h-4 w-4" /> Créer les {sansCreneau.length} équipe(s) du calendrier
              </button>
            )}
          </>
        }
      >
        Trajets des joueurs entre leur domicile et le gymnase, sur toute la saison. Pour chaque équipe : nombre de joueurs,
        distance moyenne aller-retour par séance, et comment ils viennent. Si un parent dépose puis revient chercher
        l&apos;enfant, comptez la distance deux fois.
      </EnTete>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tuile libelle="Joueurs" valeur={fmt(t.joueurs)} detail={`${creneaux.length} équipe(s)`} />
        <Tuile libelle="Km parcourus sur la saison" valeur={fmt(t.kmJoueurs)} unite="km" detail="total des trajets des joueurs" />
        <Tuile libelle="CO2 des entraînements" valeur={fmtCO2(t.co2).valeur} unite={fmtCO2(t.co2).unite} detail="sur la saison" />
        <Tuile
          libelle="CO2 évité"
          valeur={fmtCO2(t.evite).valeur}
          unite={fmtCO2(t.evite).unite}
          detail="par rapport à tous en voiture seul"
        />
      </div>

      {creneaux.length === 0 && (
        <div className="carte flex flex-col items-center gap-3 p-10 text-center">
          <Dumbbell className="h-10 w-10 text-foret-300" />
          <p className="text-sm text-foret-700/80">Aucune équipe. Créez-les à partir du calendrier ou ajoutez-en une.</p>
        </div>
      )}

      {creneaux.map((c) => {
        const b = calculerCreneau(c, p);
        const total = totalParts(c);
        return (
          <article key={c.id} className="carte p-5">
            <div className="flex flex-wrap items-end gap-4">
              <label className="text-xs font-medium text-foret-700">
                Équipe
                <div className="mt-1">
                  <input
                    list="liste-equipes"
                    value={c.equipe}
                    onChange={(e) => maj(c.id, { equipe: e.target.value })}
                    className="champ w-44 font-semibold"
                  />
                </div>
              </label>
              <label className="text-xs font-medium text-foret-700">
                Joueurs
                <div className="mt-1">
                  <ChampNombre label="Joueurs" valeur={c.joueurs} onChange={(n) => maj(c.id, { joueurs: Math.round(n ?? 0) })} />
                </div>
              </label>
              <label className="text-xs font-medium text-foret-700">
                Distance A/R moyenne
                <div className="mt-1 flex items-center gap-1.5">
                  <ChampNombre label="Distance A/R" pas={0.5} valeur={c.distanceAR} onChange={(n) => maj(c.id, { distanceAR: n ?? 0 })} />
                  <span className="text-xs">km</span>
                </div>
              </label>
              <label className="text-xs font-medium text-foret-700">
                Séances / semaine
                <div className="mt-1">
                  <ChampNombre label="Séances par semaine" valeur={c.seancesParSemaine} onChange={(n) => maj(c.id, { seancesParSemaine: n ?? 0 })} className="w-16" />
                </div>
              </label>
              <label className="text-xs font-medium text-foret-700">
                Semaines / saison
                <div className="mt-1">
                  <ChampNombre label="Semaines par saison" valeur={c.semaines} onChange={(n) => maj(c.id, { semaines: Math.round(n ?? 0) })} className="w-16" />
                </div>
              </label>
              <div className="ml-auto flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-foret-600">CO2 saison</p>
                  <p className="font-display text-2xl font-bold tabular-nums text-foret-900">
                    {fmtCO2(b.co2).valeur} <span className="text-xs font-medium">{fmtCO2(b.co2).unite}</span>
                  </p>
                  <p className="text-[11px] text-emeraude-600">−{fmtCO2(b.evite).valeur} {fmtCO2(b.evite).unite} évités</p>
                </div>
                <button
                  onClick={() => onChange(creneaux.filter((x) => x.id !== c.id))}
                  className="p-1.5 text-foret-700/50 hover:text-terracotta-600"
                  aria-label={`Supprimer ${c.equipe}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
              {MODES.map(({ cle, libelle, icone: Icone }) => (
                <div key={cle} className="flex items-center justify-between gap-2 rounded-xl bg-sauge-50 px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-foret-900">
                    <Icone className="h-4 w-4 shrink-0 text-foret-600" /> <span className="truncate">{libelle}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-foret-700">
                    <ChampNombre label={libelle} max={100} valeur={c[cle]} onChange={(n) => maj(c.id, { [cle]: Math.round(n ?? 0) })} className="w-14" />%
                  </span>
                </div>
              ))}
            </div>
            {total !== 100 && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-terracotta-600">
                <TriangleAlert className="h-3.5 w-3.5" /> La répartition fait {total} % au lieu de 100 %.
              </p>
            )}
          </article>
        );
      })}

      <datalist id="liste-equipes">
        {equipes.map((e) => (
          <option key={e} value={e} />
        ))}
      </datalist>

      {creneaux.length > 0 && (
        <p className="text-xs text-foret-700/60">
          Voiture seul : 1 voiture thermique par joueur (0,218 kgCO2e/km). Covoiturage : {fmt(p.joueursParVoitureCovoit)} joueurs par
          voiture. Bus : {fmt(p.facteurBus, 3)} kgCO2e par passager et par km. Vélo et marche : 0. Réglages dans Paramètres.
        </p>
      )}
    </div>
  );
}
