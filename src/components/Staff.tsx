"use client";

import { useState } from "react";
import { Briefcase, Plus, Trash2 } from "lucide-react";
import { calculerDeplacementStaff, calculerStaff } from "@/lib/club";
import { fmtEuro, type Parametres } from "@/lib/couts";
import { estimerDistanceAR, type Coordonnees } from "@/lib/distances";
import { LIBELLES_COURTS, TYPES_VEHICULES } from "@/lib/emissions";
import { fmt, fmtCO2 } from "@/lib/format";
import { nouvelId } from "@/lib/excel";
import { MOTIFS_STAFF, type DeplacementStaff, type MotifStaff } from "@/lib/types";
import { ChampNombre, EnTete, Tuile } from "./Champs";
import { ICONES_VEHICULES } from "./IconesVehicules";

interface Props {
  deplacements: DeplacementStaff[];
  villeClub: string;
  cacheGeo: Record<string, Coordonnees>;
  parametres: Parametres;
  onChange: (d: DeplacementStaff[]) => void;
}

export function Staff({ deplacements, villeClub, cacheGeo, parametres: p, onChange }: Props) {
  const [motifFiltre, setMotifFiltre] = useState<"tous" | MotifStaff>("tous");
  const maj = (id: string, m: Partial<DeplacementStaff>) => onChange(deplacements.map((d) => (d.id === id ? { ...d, ...m } : d)));
  const t = calculerStaff(deplacements, p);
  const liste = deplacements.filter((d) => motifFiltre === "tous" || d.motif === motifFiltre);

  function ajouter() {
    onChange([
      {
        id: nouvelId(),
        date: new Date().toISOString().slice(0, 10),
        motif: "Réunion",
        destination: "",
        distanceAR: null,
        sourceDistance: "inconnue",
        participants: 1,
        vehicules: { thermique: 1, hybride: 0, electrique: 0, minibus: 0 },
        repetitions: 1,
      },
      ...deplacements,
    ]);
  }

  function changerDestination(d: DeplacementStaff, destination: string) {
    if (d.sourceDistance === "manuelle" && d.distanceAR !== null) return maj(d.id, { destination });
    const est = estimerDistanceAR(villeClub, destination, cacheGeo);
    maj(d.id, { destination, distanceAR: est, sourceDistance: est === null ? "inconnue" : "estimee" });
  }

  return (
    <div className="space-y-4">
      <EnTete
        titre="Déplacements staff"
        actions={
          <>
            <select value={motifFiltre} onChange={(e) => setMotifFiltre(e.target.value as typeof motifFiltre)} className="champ w-auto" aria-label="Filtrer par motif">
              <option value="tous">Tous les motifs</option>
              {MOTIFS_STAFF.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <button onClick={ajouter} className="btn-primaire">
              <Plus className="h-4 w-4" /> Ajouter un déplacement
            </button>
          </>
        }
      >
        Entraîneurs, dirigeants et bénévoles : venue aux entraînements, réunions, assemblée générale, formations. Un trajet
        refait chaque semaine se saisit une fois, avec le nombre de répétitions (par exemple 30 séances). La distance est
        estimée depuis {villeClub} quand la destination est connue.
      </EnTete>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tuile libelle="Déplacements" valeur={fmt(deplacements.reduce((s, d) => s + Math.max(1, d.repetitions || 1), 0))} detail={`${deplacements.length} ligne(s) saisie(s)`} />
        <Tuile libelle="Km parcourus" valeur={fmt(t.km)} unite="km" />
        <Tuile libelle="CO2 du staff" valeur={fmtCO2(t.co2).valeur} unite={fmtCO2(t.co2).unite} />
        <Tuile libelle="Coût (barème km)" valeur={fmtEuro(t.cout)} detail={`${fmt(p.tarifKmVoiture, 2)} € / km par voiture`} />
      </div>

      {deplacements.length === 0 ? (
        <div className="carte flex flex-col items-center gap-3 p-10 text-center">
          <Briefcase className="h-10 w-10 text-foret-300" />
          <p className="text-sm text-foret-700/80">Aucun déplacement saisi pour le moment.</p>
        </div>
      ) : (
        <section className="carte overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm">
              <thead className="bg-sauge-100 text-left text-xs uppercase tracking-wide text-foret-700">
                <tr>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Motif</th>
                  <th className="px-3 py-2.5">Destination</th>
                  <th className="px-3 py-2.5 text-right">A/R (km)</th>
                  <th className="px-3 py-2.5 text-right">Pers.</th>
                  {TYPES_VEHICULES.map((v) => (
                    <th key={v} className="px-2 py-2.5 text-center" title={LIBELLES_COURTS[v]}>
                      {LIBELLES_COURTS[v].slice(0, 5)}.
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right">Répét.</th>
                  <th className="px-3 py-2.5 text-right">CO2</th>
                  <th className="px-3 py-2.5 text-right">Coût</th>
                  <th className="px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-sauge-100">
                {liste.map((d) => {
                  const b = calculerDeplacementStaff(d, p);
                  return (
                    <tr key={d.id}>
                      <td className="px-3 py-2">
                        <input type="date" aria-label="Date" value={d.date} onChange={(e) => maj(d.id, { date: e.target.value })} className="champ w-[8.5rem]" />
                      </td>
                      <td className="px-3 py-2">
                        <select aria-label="Motif" value={d.motif} onChange={(e) => maj(d.id, { motif: e.target.value as MotifStaff })} className="champ w-40">
                          {MOTIFS_STAFF.map((m) => (
                            <option key={m}>{m}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          aria-label="Destination"
                          defaultValue={d.destination}
                          placeholder="Ville"
                          onBlur={(e) => e.target.value !== d.destination && changerDestination(d, e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                          className="champ w-32"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {d.sourceDistance === "estimee" && <span className="pastille bg-sauge-100 text-foret-700">est.</span>}
                          <ChampNombre
                            label="Distance A/R"
                            vide
                            valeur={d.distanceAR}
                            placeholder="?"
                            onChange={(n) => maj(d.id, { distanceAR: n, sourceDistance: n === null ? "inconnue" : "manuelle" })}
                            className={`w-16 ${d.distanceAR === null ? "border-terracotta-400" : ""}`}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <ChampNombre label="Personnes" valeur={d.participants} onChange={(n) => maj(d.id, { participants: Math.max(1, Math.round(n ?? 1)) })} className="ml-auto w-14" />
                      </td>
                      {TYPES_VEHICULES.map((v) => {
                        const Icone = ICONES_VEHICULES[v];
                        return (
                          <td key={v} className="px-2 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <Icone className="h-3.5 w-3.5 text-foret-400" />
                              <ChampNombre
                                label={LIBELLES_COURTS[v]}
                                valeur={d.vehicules[v]}
                                onChange={(n) => maj(d.id, { vehicules: { ...d.vehicules, [v]: Math.round(n ?? 0) } })}
                                className="w-12"
                              />
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right">
                        <ChampNombre label="Répétitions" valeur={d.repetitions} onChange={(n) => maj(d.id, { repetitions: Math.max(1, Math.round(n ?? 1)) })} className="ml-auto w-14" />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{b.complet ? `${fmt(b.co2, 1)} kg` : "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{b.complet ? fmtEuro(b.cout) : "—"}</td>
                      <td className="px-2 py-2 text-right">
                        <button onClick={() => onChange(deplacements.filter((x) => x.id !== d.id))} className="p-1.5 text-foret-700/50 hover:text-terracotta-600" aria-label="Supprimer ce déplacement">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {Object.keys(t.parMotif).length > 0 && (
        <section className="carte p-5">
          <h3 className="text-base font-bold text-foret-900">Par motif</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(t.parMotif)
              .sort((a, b) => b[1].co2 - a[1].co2)
              .map(([motif, v]) => (
                <li key={motif} className="flex items-center justify-between rounded-lg bg-sauge-50 px-3 py-2 text-sm">
                  <span className="text-foret-800">
                    {motif} <span className="text-xs text-foret-700/60">× {v.nb}</span>
                  </span>
                  <span className="tabular-nums text-foret-700">
                    {fmt(v.co2, 1)} kg · {fmtEuro(v.cout)}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
