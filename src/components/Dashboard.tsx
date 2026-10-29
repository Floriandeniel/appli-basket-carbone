"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  FileSpreadsheet,
  Gauge,
  Info,
  Leaf,
  Route,
  Smartphone,
  Sprout,
  TrainFront,
  TreeDeciduous,
  Users,
  type LucideIcon,
} from "lucide-react";
import { calculerBilanGlobal, calculerBilanMatch, FACTEURS_EMISSION, LIBELLES_VEHICULES, TYPES_VEHICULES } from "@/lib/emissions";
import { equivalences } from "@/lib/equivalences";
import { exporterBilanCsv, exporterBilanExcel } from "@/lib/excel";
import { fmt, fmtCO2, libelleMois } from "@/lib/format";
import type { Match } from "@/lib/types";

interface Props {
  matchs: Match[];
  equipes: string[];
  onAllerLogistique: () => void;
}

function CarteImpact({
  icone: Icone,
  titre,
  valeur,
  unite,
  detail,
  variante = "clair",
}: {
  icone: LucideIcon;
  titre: string;
  valeur: string;
  unite: string;
  detail?: React.ReactNode;
  variante?: "clair" | "fonce";
}) {
  const fonce = variante === "fonce";
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 shadow-carte ${
        fonce ? "bg-foret-800 text-white" : "carte"
      }`}
    >
      {fonce && <Leaf className="absolute -bottom-6 -right-6 h-32 w-32 rotate-12 text-foret-700/60" strokeWidth={1.2} />}
      <div className="relative">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              fonce ? "bg-emeraude-500/20 text-emeraude-400" : "bg-foret-100 text-foret-700"
            }`}
          >
            <Icone className="h-[18px] w-[18px]" />
          </span>
          <p className={`text-sm font-semibold ${fonce ? "text-foret-100" : "text-foret-700"}`}>{titre}</p>
        </div>
        <p className="mt-4 font-display text-4xl font-bold tabular-nums tracking-tight">
          {valeur} <span className={`text-base font-semibold ${fonce ? "text-foret-200" : "text-foret-600"}`}>{unite}</span>
        </p>
        {detail && <div className={`mt-1 text-xs ${fonce ? "text-foret-200" : "text-foret-700/70"}`}>{detail}</div>}
      </div>
    </div>
  );
}

export function Dashboard({ matchs, equipes, onAllerLogistique }: Props) {
  const [equipe, setEquipe] = useState("toutes");
  const [mois, setMois] = useState("tous");

  const moisDispos = useMemo(() => [...new Set(matchs.map((m) => m.date.slice(0, 7)).filter(Boolean))].sort(), [matchs]);
  const filtres = useMemo(
    () => matchs.filter((m) => (equipe === "toutes" || m.equipe === equipe) && (mois === "tous" || m.date.startsWith(mois))),
    [matchs, equipe, mois],
  );
  const g = useMemo(() => calculerBilanGlobal(filtres), [filtres]);
  const eq = equivalences(g.emissionsEvitees);

  const libelleFiltre = [equipe === "toutes" ? "Toutes les équipes" : equipe, mois === "tous" ? "toute la saison" : libelleMois(mois)].join(" · ");

  // Évolution mensuelle (sur le filtre équipe uniquement)
  const parMois = useMemo(() => {
    const base = matchs.filter((m) => equipe === "toutes" || m.equipe === equipe);
    return moisDispos.map((cle) => ({ cle, ...calculerBilanGlobal(base.filter((m) => m.date.startsWith(cle))) }));
  }, [matchs, equipe, moisDispos]);
  const maxMois = Math.max(1, ...parMois.map((p) => p.emissionsSansCovoiturage));

  // Bilan par équipe (sur le filtre mois uniquement)
  const parEquipe = useMemo(() => {
    const base = matchs.filter((m) => mois === "tous" || m.date.startsWith(mois));
    return equipes
      .map((e) => ({ equipe: e, ...calculerBilanGlobal(base.filter((m) => m.equipe === e)) }))
      .filter((x) => x.nbMatchs > 0)
      .sort((a, b) => b.emissionsEvitees - a.emissionsEvitees);
  }, [matchs, equipes, mois]);

  // Répartition des véhicules.km par motorisation
  const parMotorisation = TYPES_VEHICULES.map((t) => {
    let km = 0;
    for (const m of filtres) if (calculerBilanMatch(m).complet) km += (m.vehicules[t] || 0) * (m.distanceAR ?? 0);
    return { t, km, co2: km * FACTEURS_EMISSION[t] };
  });

  const reel = fmtCO2(g.emissionsReelles);
  const evite = fmtCO2(g.emissionsEvitees);
  const reduction = g.emissionsSansCovoiturage > 0 ? (g.emissionsEvitees / g.emissionsSansCovoiturage) * 100 : 0;
  const incomplets = filtres.length - g.nbMatchsComplets;

  return (
    <div className="space-y-6">
      {/* Filtres et export */}
      <div className="carte flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <select aria-label="Filtrer par équipe" value={equipe} onChange={(e) => setEquipe(e.target.value)} className="champ w-auto">
            <option value="toutes">Toutes les équipes</option>
            {equipes.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foret-500" />
            <select aria-label="Filtrer par mois" value={mois} onChange={(e) => setMois(e.target.value)} className="champ w-auto pl-9">
              <option value="tous">Toute la saison</option>
              {moisDispos.map((m) => (
                <option key={m} value={m}>
                  {libelleMois(m).replace(/^./, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exporterBilanCsv(filtres)} className="btn-secondaire" disabled={!filtres.length}>
            <Download className="h-4 w-4" /> CSV
          </button>
          <button onClick={() => exporterBilanExcel(filtres, libelleFiltre)} className="btn-primaire" disabled={!filtres.length}>
            <FileSpreadsheet className="h-4 w-4" /> Exporter le bilan Excel
          </button>
        </div>
      </div>

      {incomplets > 0 && (
        <button
          onClick={onAllerLogistique}
          className="flex w-full items-center gap-2 rounded-xl border border-terracotta-300/60 bg-terracotta-300/10 px-4 py-3 text-left text-sm text-terracotta-700 hover:bg-terracotta-300/20"
        >
          <Info className="h-4 w-4 shrink-0" />
          {incomplets} match(s) sans logistique ou sans distance ne sont pas comptés. Compléter dans l&apos;onglet Logistique →
        </button>
      )}

      {/* Cartes d'impact */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CarteImpact
          variante="fonce"
          icone={Sprout}
          titre="CO2e évité grâce au covoiturage"
          valeur={evite.valeur}
          unite={evite.unite}
          detail={<>soit −{fmt(reduction)} % par rapport à « 1 voiture par joueur »</>}
        />
        <CarteImpact
          icone={Leaf}
          titre="Émissions réelles"
          valeur={reel.valeur}
          unite={reel.unite}
          detail={<>contre {fmtCO2(g.emissionsSansCovoiturage).valeur} {fmtCO2(g.emissionsSansCovoiturage).unite} sans covoiturage</>}
        />
        <CarteImpact
          icone={Route}
          titre="Distance parcourue (A/R)"
          valeur={fmt(g.kmParcourus)}
          unite="km"
          detail={<>{g.nbMatchsComplets} déplacement(s) · {fmt(g.vehiculesKm)} véhicules.km</>}
        />
        <CarteImpact
          icone={Users}
          titre="Taux d'occupation moyen"
          valeur={g.tauxOccupationMoyen === null ? "—" : fmt(g.tauxOccupationMoyen, 1)}
          unite="pers./véh."
          detail={
            <div className="mt-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-sauge-100">
                <div
                  className="h-full rounded-full bg-emeraude-500"
                  style={{ width: `${Math.min(100, ((g.tauxOccupationMoyen ?? 0) / 5) * 100)}%` }}
                />
              </div>
              <p className="mt-1">{g.participants} participants dans {g.vehicules} véhicules (5 = voiture pleine)</p>
            </div>
          }
        />
      </div>

      {/* Équivalences */}
      <section className="carte overflow-hidden">
        <div className="flex items-center justify-between border-b border-sauge-200 bg-sauge-50/80 px-5 py-3">
          <h3 className="text-base font-bold text-foret-900">Ce que représentent les {evite.valeur} {evite.unite} évités</h3>
        </div>
        <div className="grid divide-y divide-sauge-200 md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            { icone: Smartphone, valeur: fmt(eq.recharges), libelle: "recharges de smartphone" },
            { icone: TrainFront, valeur: fmt(eq.kmTGV), libelle: "km en TGV" },
            { icone: TreeDeciduous, valeur: fmt(eq.arbresAn, eq.arbresAn < 10 ? 1 : 0), libelle: "arbres absorbant le CO2 pendant 1 an" },
          ].map(({ icone: Icone, valeur, libelle }) => (
            <div key={libelle} className="flex items-center gap-4 p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-terracotta-300/20 text-terracotta-600">
                <Icone className="h-6 w-6" />
              </span>
              <div>
                <p className="font-display text-2xl font-bold tabular-nums text-foret-900">{valeur}</p>
                <p className="text-sm text-foret-700/80">{libelle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Évolution mensuelle */}
        <section className="carte p-5 lg:col-span-3">
          <h3 className="text-base font-bold text-foret-900">Émissions par mois</h3>
          <div className="mt-2 flex gap-4 text-xs text-foret-700">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-foret-600" /> Réel</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sauge-200" /> Sans covoiturage</span>
          </div>
          {parMois.length === 0 ? (
            <p className="py-10 text-center text-sm text-foret-700/60">Aucune donnée.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {parMois.map((p) => (
                <button
                  key={p.cle}
                  onClick={() => setMois(mois === p.cle ? "tous" : p.cle)}
                  className={`block w-full rounded-lg p-1 text-left transition hover:bg-sauge-50 ${mois === p.cle ? "bg-sauge-50 ring-1 ring-foret-300" : ""}`}
                >
                  <div className="flex justify-between text-xs">
                    <span className="font-medium capitalize text-foret-800">{libelleMois(p.cle)}</span>
                    <span className="tabular-nums text-foret-700/80">
                      {fmt(p.emissionsReelles)} / {fmt(p.emissionsSansCovoiturage)} kgCO2e
                    </span>
                  </div>
                  <div className="relative mt-1 h-3 overflow-hidden rounded-full bg-sauge-100">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-sauge-200" style={{ width: `${(p.emissionsSansCovoiturage / maxMois) * 100}%` }} />
                    <div className="absolute inset-y-0 left-0 rounded-full bg-foret-600" style={{ width: `${(p.emissionsReelles / maxMois) * 100}%` }} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Motorisations */}
        <section className="carte p-5 lg:col-span-2">
          <h3 className="flex items-center gap-2 text-base font-bold text-foret-900">
            <Gauge className="h-4 w-4 text-foret-600" /> Émissions par motorisation
          </h3>
          <ul className="mt-4 space-y-3">
            {parMotorisation.map(({ t, km, co2 }) => (
              <li key={t}>
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-foret-800">{LIBELLES_VEHICULES[t]}</span>
                  <span className="tabular-nums text-foret-700/80">{fmt(km)} km · {fmt(co2, 1)} kg</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-sauge-100">
                  <div
                    className={`h-full rounded-full ${t === "thermique" ? "bg-terracotta-500" : t === "electrique" ? "bg-emeraude-500" : "bg-foret-500"}`}
                    style={{ width: `${g.emissionsReelles > 0 ? (co2 / g.emissionsReelles) * 100 : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Par équipe */}
      <section className="carte overflow-hidden">
        <h3 className="border-b border-sauge-200 px-5 py-3 text-base font-bold text-foret-900">Bilan par équipe</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-sauge-50 text-left text-xs uppercase tracking-wide text-foret-700">
              <tr>
                <th className="px-5 py-2.5">Équipe</th>
                <th className="px-5 py-2.5 text-right">Matchs</th>
                <th className="px-5 py-2.5 text-right">Km A/R</th>
                <th className="px-5 py-2.5 text-right">Émis (kg)</th>
                <th className="px-5 py-2.5 text-right">Évité (kg)</th>
                <th className="px-5 py-2.5 text-right">Occupation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sauge-100">
              {parEquipe.map((x) => (
                <tr
                  key={x.equipe}
                  onClick={() => setEquipe(equipe === x.equipe ? "toutes" : x.equipe)}
                  className={`cursor-pointer hover:bg-sauge-50 ${equipe === x.equipe ? "bg-foret-50" : ""}`}
                >
                  <td className="px-5 py-2.5 font-semibold text-foret-900">{x.equipe}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{x.nbMatchsComplets}/{x.nbMatchs}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{fmt(x.kmParcourus)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{fmt(x.emissionsReelles, 1)}</td>
                  <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-emeraude-600">{fmt(x.emissionsEvitees, 1)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{x.tauxOccupationMoyen === null ? "—" : fmt(x.tauxOccupationMoyen, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-foret-700/60">
        Facteurs ADEME (kgCO2e/véhicule.km) : thermique 0,218 · hybride 0,165 · électrique 0,022 · minibus 0,270. Scénario de
        référence : une voiture thermique par participant. Distances estimées : vol d&apos;oiseau × 1,2 × 2. Équivalences données à
        titre indicatif.
      </p>
    </div>
  );
}
