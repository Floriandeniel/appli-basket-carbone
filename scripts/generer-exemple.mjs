// Génère des calendriers d'exemple (.xlsx et .csv) dans ./exemples : npm run exemple
import * as XLSX from "xlsx";
import { mkdirSync, writeFileSync } from "node:fs";

const lignes = [
  ["Date du match", "Équipe du club", "Ville / Club adverse", "Distance A/R (km)", "Nombre total de participants"],
  ["14/11/2026", "U13M", "Cesson-Sévigné", 18, 10],
  ["15/11/2026", "U15F", "Betton", "", 9],
  ["21/11/2026", "Senior Garçons 2", "Vitré", "", 12],
  ["22/11/2026", "U17M", "Avenir Basket St Grégoire", "", 11],
  ["28/11/2026", "Senior Filles 1", "Saint-Malo", "", 11],
  ["29/11/2026", "U13M", "Fougères", "", 10],
  ["05/12/2026", "U15F", "Bruz", 32, 9],
  ["06/12/2026", "Senior Garçons 2", "Vannes", "", 12],
  ["12/12/2026", "U17M", "Liffré", "", 11],
  ["13/12/2026", "Senior Filles 1", "Pleurtuit", "", 11],
  ["09/01/2027", "U13M", "Redon", "", 10],
  ["10/01/2027", "U15F", "Montfort-sur-Meu", "", 9],
];

mkdirSync("exemples", { recursive: true });
const ws = XLSX.utils.aoa_to_sheet(lignes);
ws["!cols"] = [{ wch: 14 }, { wch: 20 }, { wch: 28 }, { wch: 18 }, { wch: 28 }];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Calendrier");
XLSX.writeFile(wb, "exemples/calendrier-exemple.xlsx");
writeFileSync("exemples/calendrier-exemple.csv", "﻿" + lignes.map((l) => l.join(";")).join("\r\n"));
console.log("Exemples générés dans ./exemples");
