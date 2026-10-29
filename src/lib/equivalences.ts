/**
 * Équivalences pédagogiques (ordres de grandeur, à ajuster selon vos sources de référence).
 * - Recharge de smartphone : ~8,2 gCO2e par recharge complète (US EPA).
 * - TGV : ~2,9 gCO2e par passager.km (Base Empreinte ADEME / impactco2.fr).
 * - Arbre : ~25 kgCO2 absorbés par an par un arbre adulte.
 */
export const EQUIVALENCES = {
  kgParRechargeSmartphone: 0.00822,
  kgParKmTGV: 0.00293,
  kgAbsorbesParArbreParAn: 25,
};

export function equivalences(kgCO2e: number) {
  const kg = Math.max(0, kgCO2e);
  return {
    recharges: kg / EQUIVALENCES.kgParRechargeSmartphone,
    kmTGV: kg / EQUIVALENCES.kgParKmTGV,
    arbresAn: kg / EQUIVALENCES.kgAbsorbesParArbreParAn,
  };
}
