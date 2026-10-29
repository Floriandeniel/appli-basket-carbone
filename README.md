# Appli Basket Carbone

Prototype Next.js 15 / React 19 / Tailwind CSS pour mesurer et réduire l'empreinte carbone des déplacements d'équipes d'un club de basket amateur. L'application tourne entièrement dans le navigateur : aucune base de données, les données sont conservées dans le `localStorage`.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # tests des calculs, de l'estimation de distance et de l'import
npm run build      # export statique dans ./out (hébergeable sur Netlify, GitHub Pages, OVH…)
npm run exemple    # régénère ./exemples/calendrier-exemple.xlsx et .csv
```

## Héberger sur Render

Le projet contient un fichier `render.yaml` : Render le détecte et configure tout seul un **site statique** (gratuit, toujours disponible, pas de mise en veille).

1. Créez un dépôt GitHub (privé ou public) et envoyez-y le contenu de ce dossier.
2. Sur Render : **New → Blueprint**, choisissez le dépôt, puis **Apply**.
3. Après 2 à 3 minutes, l'appli est en ligne sur `https://appli-basket-carbone.onrender.com` (ou un nom proche).

Réglages manuels équivalents (**New → Static Site**) : Build Command `npm ci && npm run build`, Publish Directory `out`.
Chaque `git push` sur la branche principale redéploie automatiquement.

## Installer l'appli sur le bureau

Une fois en ligne (HTTPS, par exemple sur Render), ouvrez l'adresse dans **Chrome ou Edge** :
cliquez sur **« Installer l'appli »** dans l'en-tête, ou sur l'icône d'installation à droite de la barre d'adresse.
Un raccourci avec le logo est créé sur le bureau et dans le menu Démarrer ; l'appli s'ouvre dans sa propre fenêtre.
Sur iPhone/iPad : Safari → Partager → « Sur l'écran d'accueil ».

Les icônes sont dans `public/icons/` (générées à partir du logo SVG) et `public/favicon.ico`.

## Fonctionnalités

| Module | Contenu |
|---|---|
| **Import Excel** | `.xlsx`, `.xls`, `.csv` (séparateur `;` ou `,`, UTF-8 ou Windows-1252). En-têtes reconnus de façon souple. Prévisualisation avec statut par ligne, lignes en erreur ignorées. Bouton « Modèle Excel ». |
| **Distances** | Colonne vide → estimation depuis la ville du club (réglable dans l'en-tête) : référentiel hors ligne de ~65 communes (Ille-et-Vilaine, Bretagne, départements voisins), reconnaissance dans les libellés libres (« Avenir Basket St Grégoire » → Saint-Grégoire). Ville inconnue → bouton « Localiser en ligne » (OpenStreetMap Nominatim, résultats mis en cache) ou saisie manuelle. |
| **Logistique** | Par match : nombre de voitures thermiques, hybrides, électriques et de minibus 9 places ; distance et effectif modifiables ; alerte si les places manquent ; bouton « Répartition optimale ». |
| **Tableau de bord** | Cartes d'impact (CO2e évité, émis, km, taux d'occupation), équivalences, émissions par mois, par motorisation, par équipe. Filtres équipe et mois. Export Excel (onglets Synthèse + Bilan par match) et CSV (Excel FR). |

## Formules (`src/lib/emissions.ts`)

Facteurs ADEME en kgCO2e par **véhicule**.km : thermique 0,218 · hybride 0,165 · électrique 0,022 · minibus 0,270.

Pour un match de distance A/R `d` et `P` participants :

- **Émissions réelles** = `d × Σ (nombre de véhicules du type × facteur du type)`
- **Sans covoiturage** = `P × d × 0,218` (une voiture thermique par participant, coachs inclus)
- **Émissions évitées** = sans covoiturage − réelles
- **Taux d'occupation** = `P / nombre de véhicules` ; la moyenne du tableau de bord est pondérée (total participants / total véhicules).

Un match n'entre dans les totaux que s'il a une distance et au moins un véhicule.

**Distance estimée** = distance à vol d'oiseau × 1,2 (coefficient de détour routier) × 2. C'est un ordre de grandeur : pour un bilan officiel, remplissez la colonne distance (Mappy, Google Maps).

## Hypothèses à valider

- Équivalences (`src/lib/equivalences.ts`) : 8,2 g par recharge de smartphone (US EPA), 2,93 g par km en TGV, 25 kg absorbés par an par arbre. Ce sont des ordres de grandeur couramment cités ; vérifiez-les sur [impactco2.fr](https://impactco2.fr) avant une communication externe.
- Places : 5 par voiture, 9 par minibus (conducteur compris).

## Structure

```
src/
  app/            layout, page principale (onglets), styles globaux
  components/     Logo (SVG), ImportExcel, Logistique, Dashboard
  lib/
    emissions.ts  facteurs ADEME et calculs RSE
    distances.ts  référentiel de communes, estimation, géocodage
    excel.ts      import SheetJS, modèle, exports Excel/CSV
    store.ts      état persistant (localStorage)
scripts/          tests et générateur d'exemples
exemples/         calendriers de test (.xlsx, .csv)
```

## Pistes pour la suite

Calcul d'itinéraire routier réel (API OpenRouteService), comptes club et base partagée (Supabase), saisie des covoiturages par les parents, objectifs de réduction par équipe.
