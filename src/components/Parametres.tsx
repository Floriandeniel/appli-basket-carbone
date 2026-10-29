"use client";

import { useState } from "react";
import { Bus, Car, CupSoda, Dumbbell, Euro, Fuel, RotateCcw, Target, Users } from "lucide-react";
import { CONSOMMABLES, LIBELLES_CONSOMMABLES } from "@/lib/club";
import { OBJECTIFS_DEFAUT, type Objectifs } from "@/lib/objectifs";
import { coutKmMinibus, fmtEuro, PARAMETRES_DEFAUT, type Parametres as TParametres } from "@/lib/couts";
import { FACTEURS_EMISSION, LIBELLES_VEHICULES, TYPES_VEHICULES } from "@/lib/emissions";
import { fmt } from "@/lib/format";

interface Props {
  objectifs: Objectifs;
  onObjectifs: (o: Objectifs) => void;
  parametres: TParametres;
  onChange: (p: TParametres) => void;
  nbMatchs: number;
  nbSansVehicule: number;
  /** tous = true : remplace la répartition de tous les matchs */
  onAppliquerDefaut: (tous: boolean) => void;
}

function Champ({
  id,
  libelle,
  aide,
  unite,
  valeur,
  pas,
  onChange,
}: {
  id: string;
  libelle: string;
  aide?: string;
  unite: string;
  valeur: number;
  pas: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <label htmlFor={id} className="min-w-0">
        <span className="block text-sm font-semibold text-foret-900">{libelle}</span>
        {aide && <span className="block text-xs text-foret-700/70">{aide}</span>}
      </label>
      <div className="flex shrink-0 items-center gap-2">
        <input
          id={id}
          type="number"
          min={0}
          step={pas}
          value={Number.isFinite(valeur) ? valeur : ""}
          onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value.replace(",", ".")) || 0))}
          className="champ w-28 text-right tabular-nums"
        />
        <span className="w-20 text-sm text-foret-700">{unite}</span>
      </div>
    </div>
  );
}

export function Parametres({ objectifs, onObjectifs, parametres: p, onChange, nbMatchs, nbSansVehicule, onAppliquerDefaut }: Props) {
  const [confirmerTous, setConfirmerTous] = useState(false);
  type CleNombre = { [K in keyof TParametres]: TParametres[K] extends number ? K : never }[keyof TParametres];
  const maj = (cle: CleNombre) => (n: number) => onChange({ ...p, [cle]: n });

  return (
    <div className="space-y-6">
      <div className="carte p-5">
        <h2 className="text-2xl font-bold text-foret-900">Paramètres</h2>
        <p className="mt-1 text-sm text-foret-700/80">
          Ces réglages servent au remplissage automatique des véhicules et au calcul du coût des déplacements. Ils sont
          enregistrés dans ce navigateur.
        </p>
      </div>

      <section className="carte divide-y divide-sauge-100">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
          <h3 className="flex items-center gap-2 text-base font-bold text-foret-900">
            <Target className="h-4 w-4 text-terracotta-500" /> Objectifs du club
          </h3>
          <button onClick={() => onObjectifs(OBJECTIFS_DEFAUT)} className="text-xs text-foret-700/60 hover:text-terracotta-600">
            Objectifs par défaut
          </button>
        </div>
        <div className="grid gap-x-10 gap-y-4 p-5 lg:grid-cols-2">
          {(
            [
              ["co2SaisonMaxT", "Empreinte carbone maximale sur la saison", "tCO2e", 1, "Tous modules confondus."],
              ["occupationMin", "Remplissage minimum des véhicules (matchs)", "pers./véh.", 0.1, "Participants par véhicule."],
              ["reductionCovoitMin", "Baisse minimale du CO2 grâce au covoiturage", "%", 1, "Par rapport à une voiture par participant."],
              ["co2ParParticipantMax", "CO2 maximum par participant et par match", "kgCO2e", 0.1],
              ["partBasCarboneMin", "Part minimale de km en hybride, électrique ou minibus", "%", 1, "Sur les matchs."],
              ["partModesDouxMin", "Joueurs venant à l'entraînement sans voiture solo", "%", 1, "Covoiturage, bus, vélo ou marche."],
              ["coutParParticipantMax", "Coût de transport maximum par participant", "€", 0.1, "Par déplacement de match."],
              ["co2BuvetteParMatchMax", "CO2 maximum de la buvette par match", "kgCO2e", 0.1],
            ] as [keyof Objectifs, string, string, number, string?][]
          ).map(([cle, libelle, unite, pas, aide]) => (
            <Champ
              key={cle}
              id={`objectif-${cle}`}
              libelle={libelle}
              aide={aide}
              unite={unite}
              pas={pas}
              valeur={objectifs[cle]}
              onChange={(n) => onObjectifs({ ...objectifs, [cle]: n })}
            />
          ))}
        </div>
        <p className="px-5 py-3 text-xs text-foret-700/70">
          Sur le tableau de bord, chaque objectif reçoit une pastille : vert si atteint, orange s&apos;il manque moins de 10 %, rouge
          sinon.
        </p>
      </section>

      <section className="carte divide-y divide-sauge-100">
        <h3 className="flex items-center gap-2 px-5 py-4 text-base font-bold text-foret-900">
          <Users className="h-4 w-4 text-foret-600" /> Véhicules par défaut
        </h3>
        <div className="space-y-4 p-5">
          <Champ
            id="personnes-par-voiture"
            libelle="Participants par voiture"
            aide="À l'import, chaque match reçoit automatiquement ce nombre de voitures thermiques : participants ÷ cette valeur, arrondi au-dessus."
            unite="pers."
            pas={1}
            valeur={p.personnesParVoiture}
            onChange={(n) => maj("personnesParVoiture")(Math.max(1, Math.round(n)))}
          />
          <p className="rounded-xl bg-sauge-50 px-4 py-3 text-xs text-foret-700">
            Exemple : 10 participants à {Math.max(1, p.personnesParVoiture)} par voiture ={" "}
            <strong>{Math.ceil(10 / Math.max(1, p.personnesParVoiture))} voitures thermiques</strong>. Vous modifiez
            ensuite à la main dans l&apos;onglet Transport matchs les matchs faits en hybride, électrique ou minibus.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onAppliquerDefaut(false)}
              disabled={!nbSansVehicule}
              className="btn-secondaire"
            >
              <Car className="h-4 w-4" /> Remplir les {nbSansVehicule} match{nbSansVehicule > 1 ? "s" : ""} sans véhicule
            </button>
            {confirmerTous ? (
              <span className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-foret-800">Remplacer la logistique des {nbMatchs} matchs ?</span>
                <button onClick={() => setConfirmerTous(false)} className="text-foret-700/70 hover:text-foret-900">
                  Annuler
                </button>
                <button
                  onClick={() => {
                    onAppliquerDefaut(true);
                    setConfirmerTous(false);
                  }}
                  className="font-semibold text-terracotta-600 hover:text-terracotta-700"
                >
                  Tout remplacer
                </button>
              </span>
            ) : (
              <button onClick={() => setConfirmerTous(true)} disabled={!nbMatchs} className="btn-secondaire">
                <RotateCcw className="h-4 w-4" /> Réappliquer à tous les matchs
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="carte divide-y divide-sauge-100">
        <h3 className="flex items-center gap-2 px-5 py-4 text-base font-bold text-foret-900">
          <Euro className="h-4 w-4 text-foret-600" /> Coûts des déplacements
        </h3>
        <div className="space-y-5 p-5">
          <Champ
            id="tarif-km"
            libelle="Barème kilométrique des voitures"
            aide="Indemnité versée par km parcouru (aller-retour), pour toutes les voitures : thermique, hybride, électrique."
            unite="€ / km"
            pas={0.01}
            valeur={p.tarifKmVoiture}
            onChange={maj("tarifKmVoiture")}
          />
          <div className="border-t border-sauge-100 pt-5">
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-foret-900">
              <Bus className="h-4 w-4 text-foret-600" /> Minibus
            </p>
            <div className="space-y-4">
              <Champ
                id="conso-minibus"
                libelle="Consommation"
                unite="L / 100 km"
                pas={0.5}
                valeur={p.consoMinibusL100}
                onChange={maj("consoMinibusL100")}
              />
              <Champ
                id="prix-carburant"
                libelle="Prix du carburant"
                unite="€ / litre"
                pas={0.01}
                valeur={p.prixCarburantLitre}
                onChange={maj("prixCarburantLitre")}
              />
              <Champ
                id="location-minibus"
                libelle="Location du minibus"
                aide="Montant payé pour chaque déplacement en minibus. Mettez 0 si le minibus appartient au club."
                unite="€ / dépl."
                pas={1}
                valeur={p.locationMinibus}
                onChange={maj("locationMinibus")}
              />
              <p className="flex items-center gap-2 rounded-xl bg-sauge-50 px-4 py-3 text-xs text-foret-700">
                <Fuel className="h-4 w-4 shrink-0" />
                Carburant du minibus : {fmtEuro(coutKmMinibus(p))} par km, soit {fmtEuro(coutKmMinibus(p) * 100)} pour 100 km A/R
                {p.locationMinibus > 0 && <> + {fmtEuro(p.locationMinibus)} de location</>}.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="carte divide-y divide-sauge-100">
        <h3 className="flex items-center gap-2 px-5 py-4 text-base font-bold text-foret-900">
          <CupSoda className="h-4 w-4 text-foret-600" /> Buvette
        </h3>
        <div className="grid gap-6 p-5 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foret-900">Consommation moyenne par match à domicile</p>
            {CONSOMMABLES.map((c) => (
              <Champ
                key={c}
                id={`moyenne-${c}`}
                libelle={LIBELLES_CONSOMMABLES[c]}
                unite="/ match"
                pas={0.5}
                valeur={p.buvetteParMatch[c]}
                onChange={(n) => onChange({ ...p, buvetteParMatch: { ...p.buvetteParMatch, [c]: n } })}
              />
            ))}
          </div>
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foret-900">Empreinte par unité (produit + emballage)</p>
            {CONSOMMABLES.map((c) => (
              <Champ
                key={c}
                id={`facteur-${c}`}
                libelle={LIBELLES_CONSOMMABLES[c]}
                unite="kgCO2e"
                pas={0.01}
                valeur={p.buvetteFacteurs[c]}
                onChange={(n) => onChange({ ...p, buvetteFacteurs: { ...p.buvetteFacteurs, [c]: n } })}
              />
            ))}
            <p className="rounded-xl bg-sable-100 px-4 py-3 text-xs text-foret-700">
              Valeurs par défaut estimées, à ajuster avec vos fournisseurs ou sur impactco2.fr.
            </p>
          </div>
        </div>
      </section>

      <section className="carte divide-y divide-sauge-100">
        <h3 className="flex items-center gap-2 px-5 py-4 text-base font-bold text-foret-900">
          <Dumbbell className="h-4 w-4 text-foret-600" /> Entraînements
        </h3>
        <div className="space-y-4 p-5">
          <Champ
            id="joueurs-par-voiture-covoit"
            libelle="Joueurs par voiture en covoiturage"
            aide="Nombre moyen de joueurs dans une voiture qui fait du covoiturage pour aller à l'entraînement."
            unite="joueurs"
            pas={1}
            valeur={p.joueursParVoitureCovoit}
            onChange={(n) => maj("joueursParVoitureCovoit")(Math.max(1, Math.round(n)))}
          />
          <Champ
            id="facteur-bus"
            libelle="Empreinte du bus"
            aide="Par passager et par km (bus urbain ou car scolaire)."
            unite="kgCO2e/km"
            pas={0.001}
            valeur={p.facteurBus}
            onChange={maj("facteurBus")}
          />
        </div>
      </section>

      <section className="carte p-5">
        <h3 className="text-base font-bold text-foret-900">Facteurs d&apos;émission (ADEME)</h3>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {TYPES_VEHICULES.map((t) => (
            <li key={t} className="flex justify-between rounded-lg bg-sauge-50 px-3 py-2">
              <span className="text-foret-800">{LIBELLES_VEHICULES[t]}</span>
              <span className="tabular-nums text-foret-700">{fmt(FACTEURS_EMISSION[t], 3)} kgCO2e/km</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex justify-end">
        <button onClick={() => onChange(PARAMETRES_DEFAUT)} className="text-xs text-foret-700/60 hover:text-terracotta-600">
          Revenir aux valeurs par défaut
        </button>
      </div>
    </div>
  );
}
