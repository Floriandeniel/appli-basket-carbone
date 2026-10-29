"use client";

import { useRef, useState } from "react";
import {
  CircleCheck,
  Download,
  FileSpreadsheet,
  Globe,
  LoaderCircle,
  MapPin,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { analyserLignes, lireClasseur, telechargerModele } from "@/lib/excel";
import { geocoderEnLigne, normaliser, trouverCommune, type Coordonnees } from "@/lib/distances";
import type { LigneImport, Match } from "@/lib/types";
import { dateCourte, fmt } from "@/lib/format";

interface Props {
  villeClub: string;
  cacheGeo: Record<string, Coordonnees>;
  onCache: (ajouts: Record<string, Coordonnees>) => void;
  onValider: (matchs: Match[], remplacer: boolean) => void;
  aDejaDesMatchs: boolean;
}

export function ImportExcel({ villeClub, cacheGeo, onCache, onValider, aDejaDesMatchs }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [nomFichier, setNomFichier] = useState<string | null>(null);
  const [lignesBrutes, setLignesBrutes] = useState<unknown[][] | null>(null);
  const [lignes, setLignes] = useState<LigneImport[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [survol, setSurvol] = useState(false);
  const [remplacer, setRemplacer] = useState(true);
  const [geoEnCours, setGeoEnCours] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

  async function lireFichier(f: File) {
    setErreur(null);
    setGeoMessage(null);
    setNomFichier(f.name);
    try {
      const brutes = lireClasseur(await f.arrayBuffer(), f.name);
      const res = analyserLignes(brutes, villeClub, cacheGeo);
      setLignesBrutes(brutes);
      setLignes(res.lignes);
      if (res.erreurGlobale) setErreur(res.erreurGlobale);
      else if (!res.lignes.length) setErreur("Le fichier ne contient aucune ligne de match.");
    } catch {
      setErreur("Impossible de lire ce fichier. Formats acceptés : .xlsx, .xls, .csv.");
      setLignes([]);
    }
  }

  const reinitialiser = () => {
    setNomFichier(null);
    setLignes([]);
    setLignesBrutes(null);
    setErreur(null);
    setGeoMessage(null);
    if (input.current) input.current.value = "";
  };

  const valides = lignes.filter((l) => !l.erreurs.length);
  const villesInconnues = [
    ...new Set(lignes.filter((l) => l.match.sourceDistance === "inconnue").map((l) => l.match.adversaire)),
  ];
  const nbEstimees = lignes.filter((l) => l.match.sourceDistance === "estimee").length;

  /** Géocode en ligne les villes absentes du référentiel (1 requête / seconde, règle Nominatim) */
  async function geocoderInconnues() {
    setGeoEnCours(true);
    setGeoMessage(null);
    const ajouts: Record<string, Coordonnees> = {};
    let trouvees = 0;
    try {
      const villesAChercher = [...villesInconnues];
      if (!trouverCommune(villeClub, cacheGeo)) villesAChercher.unshift(villeClub);
      for (const [i, ville] of villesAChercher.entries()) {
        if (i > 0) await new Promise((r) => setTimeout(r, 1100));
        const c = await geocoderEnLigne(ville);
        if (c) {
          ajouts[normaliser(ville)] = c;
          if (ville !== villeClub) trouvees++;
        }
      }
      const cache = { ...cacheGeo, ...ajouts };
      onCache(ajouts);
      if (lignesBrutes) setLignes(analyserLignes(lignesBrutes, villeClub, cache).lignes);
      setGeoMessage(`${trouvees} ville(s) sur ${villesInconnues.length} localisée(s).`);
    } catch {
      setGeoMessage("Recherche en ligne indisponible. Vous pourrez saisir ces distances dans l'onglet Logistique.");
    } finally {
      setGeoEnCours(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="carte p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-foret-900">Importer le calendrier des matchs</h2>
            <p className="mt-2 text-sm text-foret-700/80">
              Fichier Excel ou CSV avec les colonnes : <strong>Date du match</strong>, <strong>Équipe du club</strong>,{" "}
              <strong>Ville / Club adverse</strong>, <strong>Distance A/R (km)</strong> (facultative) et{" "}
              <strong>Nombre total de participants</strong>. Les distances vides sont estimées depuis{" "}
              <span className="font-semibold text-foret-800">{villeClub}</span>.
            </p>
          </div>
          <button onClick={telechargerModele} className="btn-secondaire shrink-0">
            <Download className="h-4 w-4" /> Modèle Excel
          </button>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setSurvol(true);
          }}
          onDragLeave={() => setSurvol(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSurvol(false);
            const f = e.dataTransfer.files[0];
            if (f) lireFichier(f);
          }}
          onClick={() => input.current?.click()}
          className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
            survol ? "border-emeraude-500 bg-foret-50" : "border-sauge-300 bg-sauge-50/60 hover:border-foret-400 hover:bg-sauge-50"
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foret-100 text-foret-700">
            {nomFichier ? <FileSpreadsheet className="h-7 w-7" /> : <Upload className="h-7 w-7" />}
          </div>
          <p className="mt-3 font-semibold text-foret-900">
            {nomFichier ?? "Glissez votre fichier ici ou cliquez pour parcourir"}
          </p>
          <p className="mt-1 text-xs text-foret-700/70">.xlsx, .xls ou .csv (séparateur ; ou ,)</p>
          <input
            ref={input}
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && lireFichier(e.target.files[0])}
          />
        </div>

        {erreur && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-terracotta-300/20 p-3 text-sm text-terracotta-700">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {erreur}
          </div>
        )}
      </section>

      {lignes.length > 0 && (
        <section className="carte overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-sauge-200 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-bold text-foret-900">Prévisualisation</h3>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foret-700/80">
                <span>{lignes.length} lignes lues</span>
                <span className="text-foret-700">{valides.length} valides</span>
                {nbEstimees > 0 && <span>{nbEstimees} distances estimées</span>}
                {villesInconnues.length > 0 && (
                  <span className="text-terracotta-600">{villesInconnues.length} ville(s) non reconnue(s)</span>
                )}
              </p>
            </div>
            {villesInconnues.length > 0 && (
              <button onClick={geocoderInconnues} disabled={geoEnCours} className="btn-secondaire">
                {geoEnCours ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                Localiser en ligne
              </button>
            )}
          </div>
          {geoMessage && <p className="border-b border-sauge-200 bg-sauge-50 px-5 py-2 text-sm text-foret-700">{geoMessage}</p>}

          <div className="max-h-[440px] overflow-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 bg-sauge-100 text-left text-xs uppercase tracking-wide text-foret-700">
                <tr>
                  <th className="px-4 py-2.5">Ligne</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Équipe</th>
                  <th className="px-4 py-2.5">Ville / Club adverse</th>
                  <th className="px-4 py-2.5 text-right">Distance A/R</th>
                  <th className="px-4 py-2.5 text-right">Participants</th>
                  <th className="px-4 py-2.5">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sauge-100">
                {lignes.map((l) => (
                  <tr key={l.match.id} className={l.erreurs.length ? "bg-terracotta-300/10" : ""}>
                    <td className="px-4 py-2 text-foret-700/60">{l.numeroLigne}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{dateCourte(l.match.date)}</td>
                    <td className="px-4 py-2 font-medium">{l.match.equipe || "—"}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-foret-400" />
                        {l.match.adversaire || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      {l.match.distanceAR !== null ? `${fmt(l.match.distanceAR)} km` : "—"}
                      {l.match.sourceDistance === "estimee" && (
                        <span className="pastille ml-2 bg-sauge-100 text-foret-700">estimée</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">{l.match.participants || "—"}</td>
                    <td className="px-4 py-2">
                      {l.erreurs.length ? (
                        <span className="pastille bg-terracotta-300/30 text-terracotta-700">
                          <X className="h-3 w-3" /> {l.erreurs.join(", ")}
                        </span>
                      ) : l.match.sourceDistance === "inconnue" ? (
                        <span className="pastille bg-sable-200 text-terracotta-700">
                          <TriangleAlert className="h-3 w-3" /> Distance à saisir
                        </span>
                      ) : (
                        <span className="pastille bg-foret-100 text-foret-700">
                          <CircleCheck className="h-3 w-3" /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-sauge-200 bg-sauge-50/60 p-5 md:flex-row md:items-center md:justify-between">
            {aDejaDesMatchs ? (
              <label className="flex items-center gap-2 text-sm text-foret-800">
                <input
                  type="checkbox"
                  checked={remplacer}
                  onChange={(e) => setRemplacer(e.target.checked)}
                  className="h-4 w-4 accent-foret-700"
                />
                Remplacer le calendrier actuel (sinon les matchs sont ajoutés)
              </label>
            ) : (
              <span className="text-sm text-foret-700/70">Les lignes en erreur seront ignorées.</span>
            )}
            <div className="flex gap-2">
              <button onClick={reinitialiser} className="btn-secondaire">Annuler</button>
              <button
                onClick={() => {
                  onValider(valides.map((l) => l.match), remplacer || !aDejaDesMatchs);
                  reinitialiser();
                }}
                disabled={!valides.length}
                className="btn-primaire"
              >
                <CircleCheck className="h-4 w-4" /> Valider {valides.length} match{valides.length > 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
