const nf = (d: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: 0 });

export const fmt = (n: number, decimales = 0) => nf(decimales).format(n);

/** kgCO2e lisible : bascule en tonnes au-delà de 1 000 kg */
export function fmtCO2(kg: number): { valeur: string; unite: string } {
  if (Math.abs(kg) >= 1000) return { valeur: fmt(kg / 1000, 2), unite: "tCO2e" };
  return { valeur: fmt(kg, Math.abs(kg) < 10 ? 1 : 0), unite: "kgCO2e" };
}

export const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** "2026-10" → "octobre 2026" */
export const libelleMois = (cle: string) => {
  const [a, m] = cle.split("-");
  return `${MOIS[+m - 1]} ${a}`;
};

export const dateCourte = (iso: string) =>
  iso ? new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "—";
