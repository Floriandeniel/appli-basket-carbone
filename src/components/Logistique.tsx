"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Fuel, MapPin, Minus, Plus, Trash2, TriangleAlert, Users, WandSparkles } from "lucide-react";
import {
  calculerBilanMatch,
  FACTEURS_EMISSION,
  LIBELLES_COURTS,
  LIBELLES_VEHICULES,
  PLACES_PAR_VEHICULE,
  suggererRepartition,
  TYPES_VEHICULES,
} from "@/lib/emissions";
import type { Match } from "@/lib/types";
import { calculerCoutMatch, fmtEuro, vehiculesParDefaut, type Parametres } from "@/lib/couts";
import { dateCourte, fmt, fmtCO2 } from "@/lib/format";
import { ICONES_VEHICULES, TEINTES_VEHICULES } from "./IconesVehicules";

interface Props {
  matchs: Match[];
  equipes: string[];
  onMaj: (id: string, maj: Partial<Match>) => void;
  onSupprimer: (id: string) => void;
  parametres: Parametres;
}

function Compteur({ valeur, onChange }: { valeur: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center rounded-lg border border-sauge-300 bg-white">
      <button
        aria-label="Retirer"
        onClick={() => onChange(Math.max(0, valeur - 1))}
        className="px-2 py-1.5 text-foret-600 hover:text-foret-900 disabled:opacity-30"
        disabled={valeur === 0}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums">{valeur}</span>
      <button aria-label="Ajouter" onClick={() => onChange(valeur + 1)} className="px-2 py-1.5 text-foret-600 hover:text-foret-900">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function Logistique({ matchs, equipes, parametres, onMaj, onSupprimer }: Props) {
  const [equipe, setEquipe] = useState("toutes");
  const [aCompleter, setACompleter] = useState(false);

  const liste = useMemo(
    () =>
      matchs.filter(
        (m) => (equipe === "toutes" || m.equipe === equipe) && (!aCompleter || !calculerBilanMatch(m).complet),
      ),
    [matchs, equipe, aCompleter],
  );
  const nbACompleter = matchs.filter((m) => !calculerBilanMatch(m).complet).length;

  return (
    <div className="space-y-4">
      <div className="carte flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foret-900">Logistique des déplacements</h2>
          <p className="mt-1 text-sm text-foret-700/80">
            Renseignez les véhicules de chaque rencontre.{" "}
            {nbACompleter > 0 ? (
              <span className="font-medium text-terracotta-600">{nbACompleter} match(s) à compléter.</span>
            ) : (
              "Tous les matchs sont complets."
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={equipe} onChange={(e) => setEquipe(e.target.value)} className="champ w-auto">
            <option value="toutes">Toutes les équipes</option>
            {equipes.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-foret-800">
            <input
              type="checkbox"
              checked={aCompleter}
              onChange={(e) => setACompleter(e.target.checked)}
              className="h-4 w-4 accent-foret-700"
            />
            À compléter uniquement
          </label>
        </div>
      </div>

      {liste.length === 0 && (
        <p className="carte p-8 text-center text-sm text-foret-700/70">Aucun match pour ce filtre.</p>
      )}

      {liste.map((m) => {
        const b = calculerBilanMatch(m);
        const co2 = fmtCO2(b.emissionsReelles);
        const evite = fmtCO2(b.emissionsEvitees);
        const cout = calculerCoutMatch(m, parametres);
        return (
          <article key={m.id} className="carte overflow-hidden">
            <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-foret-600">{dateCourte(m.date)}</span>
                  <span className="pastille bg-foret-700 text-white">{m.equipe}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-foret-400" />
                  <span className="inline-flex items-center gap-1 font-display text-lg font-bold text-foret-900">
                    <MapPin className="h-4 w-4 text-terracotta-500" /> {m.adversaire}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-4">
                  <label className="text-xs font-medium text-foret-700">
                    Distance A/R (km)
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={m.distanceAR ?? ""}
                        placeholder="à saisir"
                        onChange={(e) =>
                          onMaj(m.id, {
                            distanceAR: e.target.value === "" ? null : Math.max(0, +e.target.value),
                            sourceDistance: e.target.value === "" ? "inconnue" : "manuelle",
                          })
                        }
                        className={`champ w-28 ${m.distanceAR === null ? "border-terracotta-400" : ""}`}
                      />
                      {m.sourceDistance === "estimee" && <span className="pastille bg-sauge-100 text-foret-700">estimée</span>}
                    </div>
                  </label>
                  <label className="text-xs font-medium text-foret-700">
                    Participants
                    <div className="mt-1 flex items-center gap-2">
                      <Users className="h-4 w-4 text-foret-400" />
                      <input
                        type="number"
                        min={1}
                        value={m.participants}
                        onChange={(e) => onMaj(m.id, { participants: Math.max(1, Math.round(+e.target.value || 1)) })}
                        className="champ w-20"
                      />
                    </div>
                  </label>
                  <button
                    onClick={() => onMaj(m.id, { vehicules: vehiculesParDefaut(m.participants, parametres) })}
                    className="btn-secondaire py-2 text-xs"
                    title={`${parametres.personnesParVoiture} participants par voiture thermique (réglable dans Paramètres)`}
                  >
                    <Fuel className="h-3.5 w-3.5" /> Par défaut
                  </button>
                  <button
                    onClick={() => onMaj(m.id, { vehicules: suggererRepartition(m.participants) })}
                    className="btn-secondaire py-2 text-xs"
                    title="Remplit un minibus puis des voitures pleines"
                  >
                    <WandSparkles className="h-3.5 w-3.5" /> Répartition optimale
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-4">
                  {TYPES_VEHICULES.map((t) => {
                    const Icone = ICONES_VEHICULES[t];
                    return (
                      <div key={t} className="flex items-center justify-between gap-2 rounded-xl bg-sauge-50 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TEINTES_VEHICULES[t]}`}>
                            <Icone className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-foret-900" title={LIBELLES_VEHICULES[t]}>{LIBELLES_COURTS[t]}</p>
                            <p className="whitespace-nowrap text-[11px] text-foret-700/70">
                              {fmt(FACTEURS_EMISSION[t], 3)} kg/km · {PLACES_PAR_VEHICULE[t]} places
                            </p>
                          </div>
                        </div>
                        <Compteur
                          valeur={m.vehicules[t]}
                          onChange={(n) => onMaj(m.id, { vehicules: { ...m.vehicules, [t]: n } })}
                        />
                      </div>
                    );
                  })}
                </div>

                {b.placesInsuffisantes && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-terracotta-600">
                    <TriangleAlert className="h-3.5 w-3.5" /> Places insuffisantes pour {m.participants} participants.
                  </p>
                )}
              </div>

              <aside className="grid grid-cols-3 gap-px border-t border-sauge-200 bg-sauge-200 lg:flex lg:w-56 lg:flex-col lg:border-l lg:border-t-0">
                {b.complet ? (
                  <>
                    <div className="flex-1 bg-white p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-foret-600">Émis</p>
                      <p className="font-display text-2xl font-bold text-foret-900">
                        {co2.valeur} <span className="text-xs font-medium">{co2.unite}</span>
                      </p>
                      <p className="text-[11px] text-foret-700/70">
                        vs {fmtCO2(b.emissionsSansCovoiturage).valeur} sans covoiturage
                      </p>
                    </div>
                    <div className="flex-1 bg-foret-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-foret-600">Évité</p>
                      <p className="font-display text-2xl font-bold text-emeraude-600">
                        {evite.valeur} <span className="text-xs font-medium">{evite.unite}</span>
                      </p>
                      <p className="text-[11px] text-foret-700/70">{fmt(b.tauxOccupation ?? 0, 1)} pers./véhicule</p>
                    </div>
                    <div className="flex-1 bg-white p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-foret-600">Coût</p>
                      <p className="font-display text-2xl font-bold tabular-nums text-foret-900">{fmtEuro(cout.total)}</p>
                      <p className="text-[11px] text-foret-700/70">
                        {m.vehicules.minibus > 0
                          ? `dont minibus ${fmtEuro(cout.carburantMinibus + cout.locationMinibus)}`
                          : `${fmt(parametres.tarifKmVoiture, 2)} €/km par voiture`}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="col-span-3 flex flex-1 items-center bg-sable-100 p-4 text-xs text-foret-700">
                    {m.distanceAR === null ? "Saisissez la distance A/R." : "Ajoutez au moins un véhicule."}
                  </div>
                )}
                <button
                  onClick={() => onSupprimer(m.id)}
                  className="col-span-3 flex items-center justify-center gap-1.5 bg-white px-4 py-2 text-xs text-foret-700/60 hover:text-terracotta-600"
                  aria-label={`Supprimer le match contre ${m.adversaire}`}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer
                </button>
              </aside>
            </div>
          </article>
        );
      })}
    </div>
  );
}
