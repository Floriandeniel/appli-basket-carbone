"use client";

import { ArrowDownRight, ArrowUpRight, CircleCheck, CircleDashed, CircleX, Settings, Target, TriangleAlert } from "lucide-react";
import { LIBELLES_STATUTS, type ResultatObjectif, type Statut } from "@/lib/objectifs";
import { fmt } from "@/lib/format";

/** Couleurs des statuts : vert = atteint, orange = proche, rouge = à améliorer */
export const STYLES_STATUTS: Record<Statut, { pastille: string; barre: string; texte: string; icone: typeof CircleCheck }> = {
  atteint: { pastille: "bg-emeraude-500/15 text-emeraude-600 ring-1 ring-emeraude-500/30", barre: "bg-emeraude-500", texte: "text-emeraude-600", icone: CircleCheck },
  proche: { pastille: "bg-amber-400/20 text-amber-700 ring-1 ring-amber-500/30", barre: "bg-amber-500", texte: "text-amber-700", icone: TriangleAlert },
  rate: { pastille: "bg-red-500/10 text-red-700 ring-1 ring-red-500/30", barre: "bg-red-500", texte: "text-red-700", icone: CircleX },
  "sans-donnee": { pastille: "bg-sauge-100 text-foret-700/70 ring-1 ring-sauge-200", barre: "bg-sauge-300", texte: "text-foret-700/60", icone: CircleDashed },
};

export function Pastille({ statut, libelle }: { statut: Statut; libelle?: string }) {
  const st = STYLES_STATUTS[statut];
  const Icone = st.icone;
  return (
    <span className={`pastille whitespace-nowrap ${st.pastille}`}>
      <Icone className="h-3 w-3" /> {libelle ?? LIBELLES_STATUTS[statut]}
    </span>
  );
}

/** Petite pastille ronde de couleur, pour les tableaux */
export function Point({ statut, titre }: { statut: Statut; titre?: string }) {
  return <span title={titre ?? LIBELLES_STATUTS[statut]} className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${STYLES_STATUTS[statut].barre}`} />;
}

function CarteObjectif({ o }: { o: ResultatObjectif }) {
  const st = STYLES_STATUTS[o.statut];
  const sansDonnee = o.valeur === null;
  // flèche : vers le haut si la valeur dépasse la cible, vers le bas sinon ; la couleur dit si c'est bien
  const auDessus = (o.ecart ?? 0) > 0;
  const Fleche = auDessus ? ArrowUpRight : ArrowDownRight;
  const echelle = Math.max(o.cible, o.valeur ?? 0) * 1.15 || 1;
  const posCible = (o.cible / echelle) * 100;
  const posValeur = ((o.valeur ?? 0) / echelle) * 100;
  const ecartTexte =
    o.ecart === null
      ? null
      : `${o.ecart > 0 ? "+" : o.ecart < 0 ? "−" : ""}${fmt(Math.abs(o.ecart), o.decimales)} ${o.unite} ${
          o.ecart === 0 ? "pile sur l'objectif" : auDessus ? "au-dessus de l'objectif" : "sous l'objectif"
        }`;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white/80 p-4 shadow-carte ring-1 ring-sauge-200/80">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-semibold leading-snug text-foret-900">{o.libelle}</p>
        <Pastille statut={o.statut} />
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="font-display text-3xl font-bold tabular-nums leading-none text-foret-900">
          {sansDonnee ? "—" : fmt(o.valeur!, o.decimales)} <span className="text-sm font-semibold text-foret-600">{sansDonnee ? "" : o.unite}</span>
        </p>
        {!sansDonnee && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${st.pastille}`} title={ecartTexte ?? undefined}>
            <Fleche className="h-5 w-5" strokeWidth={2.5} />
          </span>
        )}
      </div>
      <div>
        <div className="relative h-2 rounded-full bg-sauge-100">
          {!sansDonnee && <div className={`absolute inset-y-0 left-0 rounded-full ${st.barre}`} style={{ width: `${Math.min(100, posValeur)}%` }} />}
          <div className="absolute -top-1 h-4 w-0.5 rounded bg-foret-900" style={{ left: `calc(${posCible}% - 1px)` }} title="Objectif" />
        </div>
        <p className="mt-1.5 flex flex-wrap justify-between gap-x-2 text-[11px] text-foret-700/80">
          <span>
            Objectif {o.sens === "max" ? "≤" : "≥"} {fmt(o.cible, o.decimales)} {o.unite}
          </span>
          {ecartTexte && <span className={`font-medium ${st.texte}`}>{ecartTexte}</span>}
        </p>
        {o.remarque && <p className="mt-1 text-[11px] text-foret-700/60">{o.remarque}</p>}
      </div>
    </div>
  );
}

export function TableauObjectifs({ resultats, onReglages }: { resultats: ResultatObjectif[]; onReglages: () => void }) {
  const evalues = resultats.filter((r) => r.statut !== "sans-donnee");
  const atteints = evalues.filter((r) => r.statut === "atteint").length;
  const proches = evalues.filter((r) => r.statut === "proche").length;
  const rates = evalues.filter((r) => r.statut === "rate").length;
  const global: Statut = !evalues.length ? "sans-donnee" : rates > 0 ? "rate" : proches > 0 ? "proche" : "atteint";

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="flex items-center gap-2 text-xl font-bold text-foret-900">
            <Target className="h-5 w-5 text-terracotta-500" /> Objectifs
          </h2>
          <Pastille statut={global === "atteint" ? "atteint" : "sans-donnee"} libelle={`${atteints} / ${evalues.length} atteints`} />
          {proches > 0 && <Pastille statut="proche" libelle={`${proches} proche${proches > 1 ? "s" : ""}`} />}
          {rates > 0 && <Pastille statut="rate" libelle={`${rates} à améliorer`} />}
        </div>
        <button onClick={onReglages} className="inline-flex items-center gap-1.5 text-xs font-semibold text-foret-700 hover:text-foret-900">
          <Settings className="h-3.5 w-3.5" /> Régler les objectifs
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {resultats.map((r) => (
          <CarteObjectif key={r.cle} o={r} />
        ))}
      </div>
      <p className="text-[11px] text-foret-700/60">
        Vert : objectif atteint · Orange : à moins de 10 % de l&apos;objectif · Rouge : à améliorer. La flèche indique si la valeur est
        au-dessus ou en dessous de la cible.
      </p>
    </section>
  );
}
