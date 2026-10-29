import * as XLSX from "xlsx";
import { calculerBilanGlobal, calculerBilanMatch, FACTEURS_EMISSION, LIBELLES_VEHICULES, TYPES_VEHICULES } from "./emissions";
import { equivalences } from "./equivalences";
import { estimerDistanceAR, normaliser, type Coordonnees } from "./distances";
import { VEHICULES_VIDES, type CreneauEntrainement, type DeplacementStaff, type LigneImport, type Match, type WeekendBuvette } from "./types";
import { calculerBuvette, calculerCreneau, calculerDeplacementStaff, calculerEntrainements, calculerStaff, CONSOMMABLES, estEstime, LIBELLES_CONSOMMABLES, quantiteBuvette } from "./club";
import { calculerCoutGlobal, calculerCoutMatch, coutKmMinibus, type Parametres } from "./couts";

/* ------------------------------------------------------------------ */
/* Import                                                              */
/* ------------------------------------------------------------------ */

type Colonne = "date" | "equipe" | "adversaire" | "distance" | "participants";

/** Mots-clés reconnus dans les en-têtes (comparés après normalisation) */
const MOTS_CLES: Record<Colonne, string[]> = {
  date: ["date"],
  equipe: ["equipe du club", "equipe", "categorie", "team"],
  adversaire: ["ville club adverse", "club adverse", "adversaire", "ville", "adverse", "lieu"],
  distance: ["distance", "km"],
  participants: ["participants", "nombre total", "nombre", "effectif", "personnes"],
};

function associerColonnes(entetes: string[]): Partial<Record<Colonne, number>> {
  const norm = entetes.map((e) => normaliser(String(e ?? "")));
  const res: Partial<Record<Colonne, number>> = {};
  const prises = new Set<number>();
  // ordre : on attribue d'abord les colonnes les moins ambiguës
  for (const col of ["date", "distance", "participants", "equipe", "adversaire"] as Colonne[]) {
    for (const mot of MOTS_CLES[col]) {
      const i = norm.findIndex((h, idx) => !prises.has(idx) && h.includes(mot));
      if (i >= 0) {
        res[col] = i;
        prises.add(i);
        break;
      }
    }
  }
  return res;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Convertit une date Excel (numéro de série) ou texte (JJ/MM/AAAA, AAAA-MM-JJ…) en AAAA-MM-JJ */
export function lireDate(v: unknown): string | null {
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = XLSX.SSF.parse_date_code(v);
    return d ? `${d.y}-${pad(d.m)}-${pad(d.d)}` : null;
  }
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
  if (m) {
    const annee = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    const [j, mo] = [+m[1], +m[2]];
    if (mo >= 1 && mo <= 12 && j >= 1 && j <= 31) return `${annee}-${pad(mo)}-${pad(j)}`;
  }
  return null;
}

export function lireNombre(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v ?? "").replace(/\s|km/gi, "").replace(",", ".");
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Décode un CSV en UTF-8, ou en Windows-1252 (export Excel français) si besoin */
function decoderTexte(buf: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(buf);
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(buf) : utf8;
}

let compteurId = 0;
export const nouvelId = () => `m${Date.now().toString(36)}${(compteurId++).toString(36)}`;

/** Lit les lignes brutes (tableau de tableaux) d'un fichier .xlsx, .xls ou .csv */
export function lireClasseur(buf: ArrayBuffer, nomFichier: string): unknown[][] {
  const estCsv = /\.(csv|txt)$/i.test(nomFichier);
  const wb = estCsv
    ? XLSX.read(decoderTexte(buf), { type: "string", raw: true }) // raw : garde "12/03/2026" en texte (pas d'inversion jour/mois)
    : XLSX.read(buf, { type: "array" });
  const feuille = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<unknown[]>(feuille, { header: 1, defval: "", raw: true, blankrows: false });
}

export function analyserLignes(
  lignes: unknown[][],
  villeClub: string,
  cache: Record<string, Coordonnees> = {},
): { lignes: LigneImport[]; erreurGlobale?: string } {
  const iEntete = lignes.slice(0, 15).findIndex((l) => l.some((c) => normaliser(String(c)).includes("date")));
  if (iEntete < 0) {
    return { lignes: [], erreurGlobale: "Aucune ligne d'en-tête contenant « Date » n'a été trouvée." };
  }
  const cols = associerColonnes(lignes[iEntete].map(String));
  const manquantes = (["date", "equipe", "adversaire", "participants"] as Colonne[]).filter((c) => cols[c] === undefined);
  if (manquantes.length) {
    return {
      lignes: [],
      erreurGlobale: `Colonnes introuvables : ${manquantes.join(", ")}. Utilisez le modèle Excel fourni.`,
    };
  }

  const res: LigneImport[] = [];
  lignes.slice(iEntete + 1).forEach((l, k) => {
    const cell = (c: Colonne) => (cols[c] === undefined ? "" : l[cols[c]!]);
    if (l.every((c) => String(c).trim() === "")) return;

    const erreurs: string[] = [];
    const avertissements: string[] = [];

    const date = lireDate(cell("date"));
    if (!date) erreurs.push("Date illisible");
    const equipe = String(cell("equipe")).trim();
    if (!equipe) erreurs.push("Équipe manquante");
    const adversaire = String(cell("adversaire")).trim();
    if (!adversaire) erreurs.push("Ville / club adverse manquant");
    const participants = lireNombre(cell("participants"));
    if (!participants || participants < 1) erreurs.push("Nombre de participants manquant");

    let distanceAR = lireNombre(cell("distance"));
    let sourceDistance: Match["sourceDistance"] = "fichier";
    if (distanceAR === null || distanceAR <= 0) {
      distanceAR = adversaire ? estimerDistanceAR(villeClub, adversaire, cache) : null;
      if (distanceAR !== null) {
        sourceDistance = "estimee";
        avertissements.push("Distance estimée automatiquement");
      } else {
        sourceDistance = "inconnue";
        avertissements.push("Ville inconnue : distance à saisir");
      }
    }

    res.push({
      numeroLigne: iEntete + k + 2,
      erreurs,
      avertissements,
      match: {
        id: nouvelId(),
        date: date ?? "",
        equipe,
        adversaire,
        distanceAR,
        sourceDistance,
        participants: Math.round(participants ?? 0),
        vehicules: { ...VEHICULES_VIDES },
      },
    });
  });
  return { lignes: res };
}

/* ------------------------------------------------------------------ */
/* Modèle & export                                                     */
/* ------------------------------------------------------------------ */

export const ENTETES_MODELE = [
  "Date du match",
  "Équipe du club",
  "Ville / Club adverse",
  "Distance A/R (km)",
  "Nombre total de participants",
];

function telecharger(wb: XLSX.WorkBook, nom: string) {
  XLSX.writeFile(wb, nom, { compression: true });
}

export function telechargerModele() {
  const ws = XLSX.utils.aoa_to_sheet([
    ENTETES_MODELE,
    ["14/11/2026", "U13M", "Cesson-Sévigné", 18, 10],
    ["15/11/2026", "U15F", "Betton", "", 9],
    ["21/11/2026", "Senior Garçons 2", "Vitré", "", 12],
  ]);
  ws["!cols"] = [{ wch: 14 }, { wch: 20 }, { wch: 24 }, { wch: 18 }, { wch: 28 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Calendrier");
  telecharger(wb, "modele-calendrier-basket-carbone.xlsx");
}

const arr = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const dateFr = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");

function lignesBilan(matchs: Match[], p: Parametres) {
  return matchs.map((m) => {
    const b = calculerBilanMatch(m);
    const c = calculerCoutMatch(m, p);
    return {
      Date: dateFr(m.date),
      Équipe: m.equipe,
      "Ville / Club adverse": m.adversaire,
      "Distance A/R (km)": m.distanceAR ?? "",
      "Origine distance": { fichier: "Fichier", estimee: "Estimée", manuelle: "Saisie", inconnue: "À saisir" }[m.sourceDistance],
      Participants: m.participants,
      ...Object.fromEntries(TYPES_VEHICULES.map((t) => [LIBELLES_VEHICULES[t], m.vehicules[t]])),
      "Véhicules total": b.nbVehicules,
      "Taux d'occupation (pers./véh.)": b.tauxOccupation === null ? "" : arr(b.tauxOccupation, 2),
      "Émissions réelles (kgCO2e)": b.complet ? arr(b.emissionsReelles) : "",
      "Sans covoiturage (kgCO2e)": b.complet ? arr(b.emissionsSansCovoiturage) : "",
      "Émissions évitées (kgCO2e)": b.complet ? arr(b.emissionsEvitees) : "",
      "Indemnités km voitures (€)": b.complet ? arr(c.voitures, 2) : "",
      "Carburant minibus (€)": b.complet ? arr(c.carburantMinibus, 2) : "",
      "Location minibus (€)": b.complet ? arr(c.locationMinibus, 2) : "",
      "Coût total (€)": b.complet ? arr(c.total, 2) : "",
      Statut: b.complet ? "Complet" : "Logistique à compléter",
    };
  });
}

function lignesSynthese(matchs: Match[], libelleFiltre: string, p: Parametres) {
  const g = calculerBilanGlobal(matchs);
  const c = calculerCoutGlobal(matchs, p);
  const eq = equivalences(g.emissionsEvitees);
  return [
    ["Appli Basket Carbone : bilan des déplacements"],
    ["Périmètre", libelleFiltre],
    ["Généré le", new Date().toLocaleDateString("fr-FR")],
    [],
    ["Indicateur", "Valeur", "Unité"],
    ["Matchs (total / complets)", `${g.nbMatchs} / ${g.nbMatchsComplets}`, ""],
    ["Km parcourus (A/R)", arr(g.kmParcourus, 0), "km"],
    ["Véhicules.km", arr(g.vehiculesKm, 0), "km"],
    ["Émissions réelles", arr(g.emissionsReelles), "kgCO2e"],
    ["Scénario sans covoiturage", arr(g.emissionsSansCovoiturage), "kgCO2e"],
    ["Émissions évitées", arr(g.emissionsEvitees), "kgCO2e"],
    ["Taux d'occupation moyen", g.tauxOccupationMoyen === null ? "" : arr(g.tauxOccupationMoyen, 2), "pers./véhicule"],
    [],
    ["Coûts", "Montant", "Unité"],
    ["Indemnités km voitures", arr(c.voitures, 2), "€"],
    ["Carburant minibus", arr(c.carburantMinibus, 2), "€"],
    ["Location minibus", arr(c.locationMinibus, 2), "€"],
    ["Coût total des déplacements", arr(c.total, 2), "€"],
    ["Coût si chacun venait avec sa voiture", arr(c.sansCovoiturage, 2), "€"],
    [],
    ["Équivalences des émissions évitées"],
    ["Recharges de smartphone", Math.round(eq.recharges), "recharges"],
    ["Trajet en TGV", Math.round(eq.kmTGV), "km"],
    ["Absorption annuelle d'arbres", arr(eq.arbresAn), "arbres"],
    [],
    ["Facteurs d'émission (ADEME)", "kgCO2e / véhicule.km"],
    ...TYPES_VEHICULES.map((t) => [LIBELLES_VEHICULES[t], FACTEURS_EMISSION[t]]),
    ["Scénario sans covoiturage", "1 voiture thermique par participant"],
    [],
    ["Paramètres de coût"],
    ["Barème kilométrique voitures", p.tarifKmVoiture, "€ / km"],
    ["Consommation minibus", p.consoMinibusL100, "L / 100 km"],
    ["Prix du carburant", p.prixCarburantLitre, "€ / litre"],
    ["Carburant minibus", arr(coutKmMinibus(p), 3), "€ / km"],
    ["Location minibus", p.locationMinibus, "€ / déplacement"],
  ];
}

export interface DonneesClub {
  entrainements: CreneauEntrainement[];
  staff: DeplacementStaff[];
  buvette: WeekendBuvette[];
}

function lignesSyntheseClub(d: DonneesClub, p: Parametres, matchs: Match[]) {
  const be = calculerEntrainements(d.entrainements, p);
  const bs = calculerStaff(d.staff, p);
  const bb = calculerBuvette(d.buvette, p);
  const bm = calculerBilanGlobal(matchs);
  const total = bm.emissionsReelles + be.co2 + bs.co2 + bb.co2Total;
  return [
    [],
    ["Empreinte carbone du club", "kgCO2e", "Part"],
    ["Transport matchs", arr(bm.emissionsReelles), total ? String(arr((bm.emissionsReelles / total) * 100)).replace(".", ",") + " %" : ""],
    ["Entraînements (saison)", arr(be.co2), total ? String(arr((be.co2 / total) * 100)).replace(".", ",") + " %" : ""],
    ["Déplacements staff", arr(bs.co2), total ? String(arr((bs.co2 / total) * 100)).replace(".", ",") + " %" : ""],
    ["Buvette", arr(bb.co2Total), total ? String(arr((bb.co2Total / total) * 100)).replace(".", ",") + " %" : ""],
    ["Total", arr(total), ""],
    ["CO2 évité (covoiturage matchs + modes doux entraînements)", arr(bm.emissionsEvitees + be.evite), "kgCO2e"],
    [],
    ["Buvette", "Quantité", "kgCO2e"],
    ...CONSOMMABLES.map((c) => [LIBELLES_CONSOMMABLES[c], bb.quantites[c], arr(bb.co2[c])]),
    ["Coût des déplacements staff", arr(bs.cout, 2), "€"],
  ];
}

export function exporterBilanExcel(matchs: Match[], libelleFiltre: string, p: Parametres, club?: DonneesClub) {
  const wb = XLSX.utils.book_new();
  const synthese = XLSX.utils.aoa_to_sheet([...lignesSynthese(matchs, libelleFiltre, p), ...(club ? lignesSyntheseClub(club, p, matchs) : [])]);
  synthese["!cols"] = [{ wch: 34 }, { wch: 20 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, synthese, "Synthèse");
  const detail = XLSX.utils.json_to_sheet(lignesBilan(matchs, p));
  detail["!cols"] = Array(21).fill({ wch: 16 });
  XLSX.utils.book_append_sheet(wb, detail, "Bilan par match");
  if (club) {
    const largeur = (ws: XLSX.WorkSheet) => ((ws["!cols"] = Array(14).fill({ wch: 16 })), ws);
    XLSX.utils.book_append_sheet(
      wb,
      largeur(XLSX.utils.json_to_sheet(club.entrainements.map((c) => {
        const b = calculerCreneau(c, p);
        return {
          Équipe: c.equipe, Joueurs: c.joueurs, "Distance A/R (km)": c.distanceAR, "Séances / semaine": c.seancesParSemaine,
          Semaines: c.semaines, "Voiture seul (%)": c.partVoiture, "Covoiturage (%)": c.partCovoiturage, "Bus (%)": c.partBus,
          "Vélo / marche (%)": c.partVeloMarche, "Km saison": arr(b.kmJoueurs, 0), "CO2 saison (kgCO2e)": arr(b.co2),
          "CO2 évité (kgCO2e)": arr(b.evite),
        };
      }))),
      "Entraînements",
    );
    XLSX.utils.book_append_sheet(
      wb,
      largeur(XLSX.utils.json_to_sheet(club.staff.map((d) => {
        const b = calculerDeplacementStaff(d, p);
        return {
          Date: dateFr(d.date), Motif: d.motif, Destination: d.destination, "Distance A/R (km)": d.distanceAR ?? "",
          Personnes: d.participants, Véhicules: Object.values(d.vehicules).reduce((x, y) => x + y, 0), Répétitions: d.repetitions,
          "Km total": b.complet ? arr(b.km, 0) : "", "CO2 (kgCO2e)": b.complet ? arr(b.co2) : "", "Coût (€)": b.complet ? arr(b.cout, 2) : "",
        };
      }))),
      "Staff",
    );
    XLSX.utils.book_append_sheet(
      wb,
      largeur(XLSX.utils.json_to_sheet(club.buvette.map((w) => ({
        "Week-end (samedi)": dateFr(w.date),
        "Matchs à domicile": w.matchsDomicile,
        ...Object.fromEntries(CONSOMMABLES.flatMap((c) => [[LIBELLES_CONSOMMABLES[c], quantiteBuvette(w, c, p)], [`${LIBELLES_CONSOMMABLES[c]} : origine`, estEstime(w, c) ? "Estimé" : "Compté"]])),
        "CO2 (kgCO2e)": arr(calculerBuvette([w], p).co2Total),
      })))),
      "Buvette",
    );
  }
  telecharger(wb, `bilan-carbone-deplacements-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exporterBilanCsv(matchs: Match[], p: Parametres) {
  // décimales à la française (virgule) pour Excel FR
  const lignes = lignesBilan(matchs, p).map((l) =>
    Object.fromEntries(Object.entries(l).map(([k, v]) => [k, typeof v === "number" ? String(v).replace(".", ",") : v])),
  );
  const ws = XLSX.utils.json_to_sheet(lignes);
  // ";" et BOM UTF-8 : ouverture directe dans Excel en français
  const csv = "﻿" + XLSX.utils.sheet_to_csv(ws, { FS: ";" });
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `bilan-carbone-deplacements-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
