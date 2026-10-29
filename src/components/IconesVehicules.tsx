import { BatteryCharging, Bus, Car, Fuel, type LucideIcon } from "lucide-react";
import type { TypeVehicule } from "@/lib/types";

export const ICONES_VEHICULES: Record<TypeVehicule, LucideIcon> = {
  thermique: Fuel,
  hybride: Car,
  electrique: BatteryCharging,
  minibus: Bus,
};

/** Couleur d'accent par motorisation (du plus émetteur au moins émetteur) */
export const TEINTES_VEHICULES: Record<TypeVehicule, string> = {
  thermique: "bg-terracotta-300/25 text-terracotta-700",
  hybride: "bg-sable-200 text-foret-800",
  electrique: "bg-foret-100 text-foret-700",
  minibus: "bg-sauge-200 text-foret-800",
};
