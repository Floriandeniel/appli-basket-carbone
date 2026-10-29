"use client";

import { useMemo, useState } from "react";
import { Briefcase, Car, CupSoda, Dumbbell, LayoutDashboard, MapPin, RotateCcw, Settings, Sparkles, Upload } from "lucide-react";
import { Logo } from "@/components/Logo";
import { BoutonInstaller } from "@/components/BoutonInstaller";
import { Dashboard } from "@/components/Dashboard";
import { ImportExcel } from "@/components/ImportExcel";
import { Logistique } from "@/components/Logistique";
import { Parametres } from "@/components/Parametres";
import { Buvette } from "@/components/Buvette";
import { Entrainements } from "@/components/Entrainements";
import { Staff } from "@/components/Staff";
import { completerVehicules, vehiculesParDefaut } from "@/lib/couts";
import { useEtatClub } from "@/lib/store";
import { buvetteExemple, calendrierExemple, entrainementsExemple, staffExemple } from "@/lib/exemple";
import { estimerDistanceAR, trouverCommune } from "@/lib/distances";
import { calculerBilanMatch } from "@/lib/emissions";

type Onglet = "dashboard" | "import" | "logistique" | "entrainements" | "staff" | "buvette" | "parametres";

export default function Accueil() {
  const { etat, setEtat, pret, majMatch, ajouterMatchs, supprimerMatch } = useEtatClub();
  const [onglet, setOnglet] = useState<Onglet>("dashboard");
  const [villeSaisie, setVilleSaisie] = useState<string | null>(null);
  const [confirmerReset, setConfirmerReset] = useState(false);

  const equipes = useMemo(() => [...new Set(etat.matchs.map((m) => m.equipe))].sort(), [etat.matchs]);
  const nbACompleter = etat.matchs.filter((m) => !calculerBilanMatch(m).complet).length;
  const villeConnue = !!trouverCommune(etat.villeClub, etat.cacheGeo);

  /** Change la ville du club et recalcule les distances estimées */
  function changerVilleClub(ville: string) {
    setVilleSaisie(null);
    const v = ville.trim() || "Rennes";
    setEtat((e) => ({
      ...e,
      villeClub: v,
      matchs: e.matchs.map((m) => {
        if (m.sourceDistance !== "estimee" && m.sourceDistance !== "inconnue") return m;
        const d = estimerDistanceAR(v, m.adversaire, e.cacheGeo);
        return { ...m, distanceAR: d, sourceDistance: d === null ? "inconnue" : "estimee" };
      }),
    }));
  }

  const onglets: { id: Onglet; libelle: string; icone: typeof Car; badge?: number }[] = [
    { id: "dashboard", libelle: "Tableau de bord", icone: LayoutDashboard },
    { id: "import", libelle: "Import Excel", icone: Upload },
    { id: "logistique", libelle: "Transport matchs", icone: Car, badge: nbACompleter },
    { id: "entrainements", libelle: "Entraînements", icone: Dumbbell },
    { id: "staff", libelle: "Staff", icone: Briefcase },
    { id: "buvette", libelle: "Buvette", icone: CupSoda },
    { id: "parametres", libelle: "Paramètres", icone: Settings },
  ];

  const vide =
    pret && !etat.matchs.length && !etat.entrainements.length && !etat.staff.length && !etat.buvette.length;
  const nbDonnees = etat.matchs.length + etat.entrainements.length + etat.staff.length + etat.buvette.length;

  function chargerExemple() {
    const matchs = completerVehicules(calendrierExemple(etat.villeClub), etat.parametres);
    setEtat((e) => ({
      ...e,
      matchs,
      entrainements: entrainementsExemple(),
      staff: staffExemple(e.villeClub),
      buvette: buvetteExemple(matchs),
    }));
  }
  const nbSansVehicule = etat.matchs.filter((m) => Object.values(m.vehicules).every((n) => !n)).length;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-sauge-200/80 bg-sable-50/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="text-xl font-extrabold leading-none text-foret-900">
                Appli Basket <span className="text-emeraude-600">Carbone</span>
              </h1>
              <p className="mt-1 text-xs text-foret-700/70">Bilan carbone du club</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
          <BoutonInstaller />
          <label className="flex items-center gap-2 rounded-xl border border-sauge-200 bg-white px-3 py-1.5 text-sm" title="Point de départ des estimations de distance">
            <MapPin className="h-4 w-4 text-terracotta-500" />
            <span className="hidden text-foret-700/70 sm:inline">Club basé à</span>
            <input
              value={villeSaisie ?? etat.villeClub}
              onChange={(e) => setVilleSaisie(e.target.value)}
              onBlur={(e) => changerVilleClub(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className={`w-36 bg-transparent font-semibold text-foret-900 focus:outline-none ${villeConnue ? "" : "text-terracotta-600"}`}
              aria-label="Ville du club"
            />
          </label>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 md:px-6">
          {onglets.map(({ id, libelle, icone: Icone, badge }) => (
            <button
              key={id}
              onClick={() => setOnglet(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
                onglet === id ? "border-terracotta-500 text-foret-900" : "border-transparent text-foret-700/70 hover:text-foret-900"
              }`}
            >
              <Icone className="h-4 w-4" /> {libelle}
              {!!badge && <span className="pastille bg-terracotta-500 text-white">{badge}</span>}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {!villeConnue && (
          <p className="mb-4 rounded-xl bg-sable-200/70 px-4 py-2 text-sm text-foret-800">
            « {etat.villeClub} » n&apos;est pas dans le référentiel local : les distances ne peuvent pas être estimées
            hors ligne. Utilisez « Localiser en ligne » lors de l&apos;import.
          </p>
        )}

        {vide && (onglet === "dashboard" || onglet === "logistique") ? (
          <section className="carte relative overflow-hidden p-8 md:p-12">
            <div className="max-w-xl">
              <span className="pastille bg-foret-100 text-foret-700">
                <Sparkles className="h-3 w-3" /> Saison 2026-2027
              </span>
              <h2 className="mt-4 text-3xl font-extrabold text-foret-900 md:text-4xl">
                Mesurez l&apos;empreinte carbone du club, valorisez le covoiturage.
              </h2>
              <p className="mt-3 text-foret-700/80">
                Matchs à l&apos;extérieur, entraînements, déplacements du staff et buvette : l&apos;application calcule les émissions,
                les coûts de transport et le CO2e évité grâce au covoiturage.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => setOnglet("import")} className="btn-primaire">
                  <Upload className="h-4 w-4" /> Importer un calendrier
                </button>
                <button onClick={chargerExemple} className="btn-accent">
                  <Sparkles className="h-4 w-4" /> Charger un exemple
                </button>
              </div>
            </div>
            <Logo className="pointer-events-none absolute -bottom-6 right-4 hidden h-64 w-64 opacity-90 md:block" />
          </section>
        ) : onglet === "dashboard" ? (
          <Dashboard
            matchs={etat.matchs}
            entrainements={etat.entrainements}
            staff={etat.staff}
            buvette={etat.buvette}
            equipes={equipes}
            parametres={etat.parametres}
            onAllerLogistique={() => setOnglet("logistique")}
            objectifs={etat.objectifs}
            onReglerObjectifs={() => setOnglet("parametres")}
          />
        ) : onglet === "import" ? (
          <ImportExcel
            villeClub={etat.villeClub}
            cacheGeo={etat.cacheGeo}
            aDejaDesMatchs={etat.matchs.length > 0}
            onCache={(ajouts) => setEtat((e) => ({ ...e, cacheGeo: { ...e.cacheGeo, ...ajouts } }))}
            onValider={(matchs, remplacer) => {
              ajouterMatchs(completerVehicules(matchs, etat.parametres), remplacer);
              setOnglet("logistique");
            }}
          />
        ) : onglet === "logistique" ? (
          <Logistique matchs={etat.matchs} equipes={equipes} parametres={etat.parametres} onMaj={majMatch} onSupprimer={supprimerMatch} />
        ) : onglet === "entrainements" ? (
          <Entrainements
            creneaux={etat.entrainements}
            matchs={etat.matchs}
            equipes={equipes}
            parametres={etat.parametres}
            onChange={(entrainements) => setEtat((e) => ({ ...e, entrainements }))}
          />
        ) : onglet === "staff" ? (
          <Staff
            deplacements={etat.staff}
            villeClub={etat.villeClub}
            cacheGeo={etat.cacheGeo}
            parametres={etat.parametres}
            onChange={(staff) => setEtat((e) => ({ ...e, staff }))}
          />
        ) : onglet === "buvette" ? (
          <Buvette
            weekends={etat.buvette}
            matchs={etat.matchs}
            parametres={etat.parametres}
            onChange={(buvette) => setEtat((e) => ({ ...e, buvette }))}
          />
        ) : (
          <Parametres
            objectifs={etat.objectifs}
            onObjectifs={(objectifs) => setEtat((e) => ({ ...e, objectifs }))}
            parametres={etat.parametres}
            onChange={(parametres) => setEtat((e) => ({ ...e, parametres }))}
            nbMatchs={etat.matchs.length}
            nbSansVehicule={nbSansVehicule}
            onAppliquerDefaut={(tous) =>
              setEtat((e) => ({
                ...e,
                matchs: tous
                  ? e.matchs.map((m) => ({ ...m, vehicules: vehiculesParDefaut(m.participants, e.parametres) }))
                  : completerVehicules(e.matchs, e.parametres),
              }))
            }
          />
        )}

        {nbDonnees > 0 && (
          <div className="mt-10 flex items-center justify-end gap-3 text-xs">
            {confirmerReset ? (
              <>
                <span className="text-foret-700">Effacer les matchs, entraînements, déplacements staff et week-ends buvette enregistrés dans ce navigateur ?</span>
                <button onClick={() => setConfirmerReset(false)} className="text-foret-700/70 hover:text-foret-900">
                  Annuler
                </button>
                <button
                  onClick={() => {
                    setEtat((e) => ({ ...e, matchs: [], entrainements: [], staff: [], buvette: [] }));
                    setConfirmerReset(false);
                  }}
                  className="font-semibold text-terracotta-600 hover:text-terracotta-700"
                >
                  Tout effacer
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmerReset(true)}
                className="inline-flex items-center gap-1.5 text-foret-700/50 hover:text-terracotta-600"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser les données
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
