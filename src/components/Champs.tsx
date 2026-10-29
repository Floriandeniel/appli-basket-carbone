"use client";

import { useEffect, useState } from "react";

/**
 * Champ numérique tolérant : accepte la virgule, laisse taper librement
 * et ne transmet la valeur qu'une fois lisible. `vide` autorise un champ vide (null).
 */
export function ChampNombre({
  valeur,
  onChange,
  min = 0,
  max,
  pas = 1,
  placeholder,
  vide = false,
  className = "w-20",
  id,
  label,
}: {
  valeur: number | null;
  onChange: (n: number | null) => void;
  min?: number;
  max?: number;
  pas?: number;
  placeholder?: string;
  vide?: boolean;
  className?: string;
  id?: string;
  label?: string;
}) {
  const [texte, setTexte] = useState(valeur === null ? "" : String(valeur).replace(".", ","));

  useEffect(() => {
    const actuel = parseFloat(texte.replace(",", "."));
    if (valeur === null ? texte !== "" : actuel !== valeur) setTexte(valeur === null ? "" : String(valeur).replace(".", ","));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valeur]);

  return (
    <input
      id={id}
      aria-label={label}
      inputMode="decimal"
      value={texte}
      placeholder={placeholder}
      step={pas}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d,.\-]/g, "");
        setTexte(t);
        if (t === "") {
          if (vide) onChange(null);
          return;
        }
        let n = parseFloat(t.replace(",", "."));
        if (!Number.isFinite(n)) return;
        n = Math.max(min, n);
        if (max !== undefined) n = Math.min(max, n);
        onChange(n);
      }}
      onBlur={() => {
        if (texte === "" && !vide) setTexte(String(valeur ?? min).replace(".", ","));
      }}
      className={`champ text-right tabular-nums ${className}`}
    />
  );
}

/** Bandeau d'en-tête d'un onglet */
export function EnTete({ titre, children, actions }: { titre: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="carte flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 max-w-2xl">
        <h2 className="text-2xl font-bold text-foret-900">{titre}</h2>
        {children && <div className="mt-1 text-sm text-foret-700/80">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Petite tuile chiffre clé */
export function Tuile({ libelle, valeur, unite, detail }: { libelle: string; valeur: string; unite?: string; detail?: string }) {
  return (
    <div className="rounded-xl bg-white/80 p-4 shadow-carte ring-1 ring-sauge-200/80">
      <p className="text-xs font-semibold text-foret-700">{libelle}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foret-900">
        {valeur} {unite && <span className="text-sm font-semibold text-foret-600">{unite}</span>}
      </p>
      {detail && <p className="text-[11px] text-foret-700/70">{detail}</p>}
    </div>
  );
}
