/**
 * Estimation automatique de la distance aller-retour à partir de la ville adverse.
 *
 * 1. Référentiel local de communes (Ille-et-Vilaine, Bretagne, départements voisins) : hors ligne.
 * 2. Repli en ligne facultatif : géocodage OpenStreetMap (Nominatim), mis en cache.
 *
 * Distance routière ≈ distance à vol d'oiseau × coefficient de détour (1,2), puis × 2 pour l'A/R.
 */

export interface Coordonnees {
  lat: number;
  lon: number;
}

export const COEFFICIENT_DETOUR = 1.2;

export const COMMUNES: Record<string, Coordonnees> = {
  // Rennes Métropole et Ille-et-Vilaine
  Rennes: { lat: 48.1173, lon: -1.6778 },
  "Cesson-Sévigné": { lat: 48.1213, lon: -1.603 },
  Betton: { lat: 48.1822, lon: -1.6436 },
  "Saint-Grégoire": { lat: 48.1508, lon: -1.6853 },
  Pacé: { lat: 48.1478, lon: -1.7739 },
  Chantepie: { lat: 48.0886, lon: -1.6158 },
  "Saint-Jacques-de-la-Lande": { lat: 48.065, lon: -1.7194 },
  Bruz: { lat: 48.0247, lon: -1.7456 },
  "Vern-sur-Seiche": { lat: 48.0458, lon: -1.6014 },
  "Thorigné-Fouillard": { lat: 48.1592, lon: -1.5786 },
  Acigné: { lat: 48.1333, lon: -1.5367 },
  "Noyal-sur-Vilaine": { lat: 48.1117, lon: -1.5233 },
  Châteaugiron: { lat: 48.0469, lon: -1.5039 },
  "Le Rheu": { lat: 48.1014, lon: -1.7956 },
  Mordelles: { lat: 48.0739, lon: -1.8431 },
  "Montfort-sur-Meu": { lat: 48.1375, lon: -1.9558 },
  "L'Hermitage": { lat: 48.1253, lon: -1.8236 },
  Melesse: { lat: 48.2181, lon: -1.6947 },
  Liffré: { lat: 48.2142, lon: -1.5072 },
  "Noyal-Châtillon-sur-Seiche": { lat: 48.0617, lon: -1.6669 },
  "Saint-Erblon": { lat: 48.0192, lon: -1.6511 },
  Orgères: { lat: 47.9989, lon: -1.6658 },
  Laillé: { lat: 47.9786, lon: -1.7172 },
  Guichen: { lat: 47.9672, lon: -1.7947 },
  Janzé: { lat: 47.9608, lon: -1.4983 },
  "Bain-de-Bretagne": { lat: 47.8436, lon: -1.6825 },
  Châteaubourg: { lat: 48.1114, lon: -1.4011 },
  Vitré: { lat: 48.1236, lon: -1.2097 },
  "La Guerche-de-Bretagne": { lat: 47.9411, lon: -1.2286 },
  Fougères: { lat: 48.3525, lon: -1.1986 },
  "Saint-Aubin-d'Aubigné": { lat: 48.26, lon: -1.6033 },
  Combourg: { lat: 48.4089, lon: -1.7511 },
  "Dol-de-Bretagne": { lat: 48.5497, lon: -1.7508 },
  "Saint-Malo": { lat: 48.6493, lon: -2.0257 },
  Dinard: { lat: 48.6325, lon: -2.0617 },
  Cancale: { lat: 48.6767, lon: -1.8519 },
  Romillé: { lat: 48.2156, lon: -1.8897 },
  Bédée: { lat: 48.1786, lon: -1.945 },
  "Montauban-de-Bretagne": { lat: 48.1997, lon: -2.0478 },
  "Saint-Méen-le-Grand": { lat: 48.1897, lon: -2.1939 },
  Redon: { lat: 47.6517, lon: -2.0844 },
  // Reste de la Bretagne
  Dinan: { lat: 48.4556, lon: -2.0503 },
  Lamballe: { lat: 48.4689, lon: -2.5167 },
  "Saint-Brieuc": { lat: 48.5136, lon: -2.7653 },
  Loudéac: { lat: 48.1778, lon: -2.7536 },
  Guingamp: { lat: 48.5619, lon: -3.15 },
  Lannion: { lat: 48.7325, lon: -3.4569 },
  Ploërmel: { lat: 47.9317, lon: -2.3975 },
  Pontivy: { lat: 48.0681, lon: -2.9628 },
  Vannes: { lat: 47.6582, lon: -2.7608 },
  Auray: { lat: 47.6681, lon: -2.9817 },
  Lorient: { lat: 47.7483, lon: -3.37 },
  Quimper: { lat: 47.996, lon: -4.1025 },
  Concarneau: { lat: 47.8753, lon: -3.9189 },
  Morlaix: { lat: 48.5775, lon: -3.8278 },
  Landerneau: { lat: 48.4508, lon: -4.2494 },
  Brest: { lat: 48.3904, lon: -4.4861 },
  // Départements voisins
  Nantes: { lat: 47.2184, lon: -1.5536 },
  "Saint-Nazaire": { lat: 47.2735, lon: -2.2138 },
  Châteaubriant: { lat: 47.7172, lon: -1.3761 },
  Ancenis: { lat: 47.365, lon: -1.1772 },
  Laval: { lat: 48.0706, lon: -0.7703 },
  Angers: { lat: 47.4784, lon: -0.5632 },
  "Le Mans": { lat: 48.0061, lon: 0.1996 },
  Avranches: { lat: 48.6847, lon: -1.3567 },
  Caen: { lat: 49.1829, lon: -0.3707 },
};

/** Minuscules, sans accents ni ponctuation, abréviations courantes développées */
export function normaliser(texte: string): string {
  return ` ${texte} `
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’\-_./()]/g, " ")
    .replace(/\bste?\b/g, (m) => (m === "st" ? "saint" : "sainte"))
    .replace(/\s+/g, " ")
    .trim();
}

const INDEX_COMMUNES = Object.entries(COMMUNES)
  .map(([nom, c]) => ({ nom, cle: normaliser(nom), c }))
  // les noms longs d'abord : "Noyal-Châtillon-sur-Seiche" avant "Noyal-sur-Vilaine"
  .sort((a, b) => b.cle.length - a.cle.length);

/**
 * Cherche une commune connue dans un libellé libre :
 * "Cesson-Sévigné", "CPB Rennes", "Avenir Basket St Grégoire"…
 */
export function trouverCommune(libelle: string, cache: Record<string, Coordonnees> = {}) {
  const cle = normaliser(libelle);
  if (!cle) return null;
  if (cache[cle]) return { nom: libelle, c: cache[cle] };
  const exacte = INDEX_COMMUNES.find((x) => x.cle === cle);
  if (exacte) return { nom: exacte.nom, c: exacte.c };
  const incluse = INDEX_COMMUNES.find((x) => ` ${cle} `.includes(` ${x.cle} `));
  return incluse ? { nom: incluse.nom, c: incluse.c } : null;
}

export function distanceVolOiseauKm(a: Coordonnees, b: Coordonnees): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distance routière aller-retour estimée, arrondie au km */
export function distanceARRoutiere(a: Coordonnees, b: Coordonnees): number {
  return Math.round(distanceVolOiseauKm(a, b) * COEFFICIENT_DETOUR * 2);
}

export function estimerDistanceAR(
  villeClub: string,
  villeAdverse: string,
  cache: Record<string, Coordonnees> = {},
): number | null {
  const depart = trouverCommune(villeClub, cache);
  const arrivee = trouverCommune(villeAdverse, cache);
  if (!depart || !arrivee) return null;
  return distanceARRoutiere(depart.c, arrivee.c);
}

/** Géocodage en ligne (OpenStreetMap Nominatim) pour une ville absente du référentiel */
export async function geocoderEnLigne(ville: string): Promise<Coordonnees | null> {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fr&q=" +
    encodeURIComponent(ville);
  const rep = await fetch(url, { headers: { Accept: "application/json" } });
  if (!rep.ok) return null;
  const json = (await rep.json()) as { lat: string; lon: string }[];
  if (!json.length) return null;
  return { lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) };
}
