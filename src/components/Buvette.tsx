"use client";

import { useState } from "react";
import { CalendarPlus, CupSoda, Plus, Trash2, Undo2 } from "lucide-react";
import {
  calculerBuvette,
  CONSOMMABLES,
  estEstime,
  LIBELLES_COURTS_CONSOMMABLES,
  quantiteBuvette,
  samediDuWeekend,
} from "@/lib/club";
import type { Parametres } from "@/lib/couts";
import { dateCourte, fmt, fmtCO2 } from "@/lib/format";
import { nouvelId } from "@/lib/excel";
import type { Match, WeekendBuvette } from "@/lib/types";
import { ChampNombre, EnTete, Tuile } from "./Champs";

interface Props {
  weekends: WeekendBuvette[];
  matchs: Match[];
  parametres: Parametres;
  onChange: (w: WeekendBuvette[]) => void;
}

const prochainSamedi = () => samediDuWeekend(new Date().toISOString().slice(0, 10));

export function Buvette({ weekends, matchs, parametres: p, onChange }: Props) {
  const [nouvelleDate, setNouvelleDate] = useState(prochainSamedi());
  const tri = (ws: WeekendBuvette[]) => [...ws].sort((a, b) => a.date.localeCompare(b.date));
  const maj = (id: string, m: Partial<WeekendBuvette>) => onChange(weekends.map((w) => (w.id === id ? { ...w, ...m } : w)));
  const b = calculerBuvette(weekends, p);

  const datesExistantes = new Set(weekends.map((w) => w.date));
  const weekendsCalendrier = [...new Set(matchs.map((m) => samediDuWeekend(m.date)))].filter((d) => !datesExistantes.has(d));

  const ajouter = (dates: string[]) =>
    onChange(
      tri([
        ...weekends,
        ...dates.map((date) => ({ id: nouvelId(), date, matchsDomicile: 2, bouteilles: null, sirops: null, canettes: null })),
      ]),
    );

  return (
    <div className="space-y-4">
      <EnTete
        titre="Buvette"
        actions={
          <>
            <input
              type="date"
              aria-label="Date du week-end à ajouter"
              value={nouvelleDate}
              onChange={(e) => setNouvelleDate(e.target.value)}
              className="champ w-auto"
            />
            <button
              onClick={() => nouvelleDate && ajouter([samediDuWeekend(nouvelleDate)].filter((d) => !datesExistantes.has(d)))}
              className="btn-primaire"
            >
              <Plus className="h-4 w-4" /> Ajouter le week-end
            </button>
            {weekendsCalendrier.length > 0 && (
              <button onClick={() => ajouter(weekendsCalendrier)} className="btn-secondaire">
                <CalendarPlus className="h-4 w-4" /> {weekendsCalendrier.length} week-end(s) du calendrier
              </button>
            )}
          </>
        }
      >
        Pour chaque week-end, indiquez le nombre de <strong>matchs à domicile</strong>. Les boissons sont estimées avec la
        moyenne par match (réglable dans Paramètres). Tapez les vrais chiffres quand vous les avez : ils remplacent
        l&apos;estimation.
      </EnTete>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Tuile libelle="Week-ends" valeur={fmt(b.weekends)} detail={`${fmt(b.matchs)} matchs à domicile`} />
        {CONSOMMABLES.map((c) => (
          <Tuile
            key={c}
            libelle={LIBELLES_COURTS_CONSOMMABLES[c]}
            valeur={fmt(b.quantites[c])}
            detail={`${fmtCO2(b.co2[c]).valeur} ${fmtCO2(b.co2[c]).unite}`}
          />
        ))}
        <Tuile libelle="CO2 de la buvette" valeur={fmtCO2(b.co2Total).valeur} unite={fmtCO2(b.co2Total).unite} />
      </div>

      {weekends.length === 0 ? (
        <div className="carte flex flex-col items-center gap-3 p-10 text-center">
          <CupSoda className="h-10 w-10 text-foret-300" />
          <p className="text-sm text-foret-700/80">Aucun week-end saisi. Ajoutez-en un avec la date ci-dessus.</p>
        </div>
      ) : (
        <section className="carte overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-sauge-100 text-left text-xs uppercase tracking-wide text-foret-700">
                <tr>
                  <th className="px-4 py-2.5">Week-end</th>
                  <th className="px-4 py-2.5 text-right">Matchs à domicile</th>
                  {CONSOMMABLES.map((c) => (
                    <th key={c} className="px-4 py-2.5 text-right">
                      {LIBELLES_COURTS_CONSOMMABLES[c]}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-right">CO2</th>
                  <th className="px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-sauge-100">
                {weekends.map((w) => {
                  const co2 = calculerBuvette([w], p).co2Total;
                  return (
                    <tr key={w.id}>
                      <td className="whitespace-nowrap px-4 py-2 font-medium text-foret-900">
                        {dateCourte(w.date)} – {dateCourte(new Date(new Date(w.date + "T12:00:00").getTime() + 864e5).toISOString().slice(0, 10))}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <ChampNombre
                          label="Matchs à domicile"
                          valeur={w.matchsDomicile}
                          onChange={(n) => maj(w.id, { matchsDomicile: Math.round(n ?? 0) })}
                          className="ml-auto w-16"
                        />
                      </td>
                      {CONSOMMABLES.map((c) => (
                        <td key={c} className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {estEstime(w, c) ? (
                              <span className="pastille bg-sauge-100 text-foret-700">estimé</span>
                            ) : (
                              <button
                                onClick={() => maj(w.id, { [c]: null })}
                                title="Revenir à l'estimation"
                                aria-label="Revenir à l'estimation"
                                className="text-foret-400 hover:text-foret-700"
                              >
                                <Undo2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <ChampNombre
                              label={LIBELLES_COURTS_CONSOMMABLES[c]}
                              vide
                              valeur={w[c]}
                              placeholder={String(quantiteBuvette(w, c, p))}
                              onChange={(n) => maj(w.id, { [c]: n === null ? null : Math.round(n) })}
                              className="w-20 placeholder:italic placeholder:text-foret-500"
                            />
                          </div>
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{fmt(co2, 1)} kg</td>
                      <td className="px-2 py-2 text-right">
                        <button
                          onClick={() => onChange(weekends.filter((x) => x.id !== w.id))}
                          className="p-1.5 text-foret-700/50 hover:text-terracotta-600"
                          aria-label="Supprimer ce week-end"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-sauge-100 bg-sauge-50/60 px-4 py-2 text-xs text-foret-700/80">
            Chiffres en italique = estimation ({fmt(p.buvetteParMatch.bouteilles, 1)} bouteilles, {fmt(p.buvetteParMatch.sirops, 1)} sirop et{" "}
            {fmt(p.buvetteParMatch.canettes, 1)} canettes par match). Effacez un chiffre saisi pour revenir à l&apos;estimation.
          </p>
        </section>
      )}
    </div>
  );
}
