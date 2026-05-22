# Synthetic Life Trajectories — site de présentation

Site statique — TRANSP-OR, EPFL.
Trois onglets : **Présentation**, **Méthodologie**, **Résultats**.
https://nolanprad.github.io/generated-population/

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure des 3 onglets |
| `styles.css` | Mise en forme |
| `app.js` | Navigation + galerie PNG + chargeur CSV |

## Remplir le contenu

### Présentation & Méthodologie
Les deux onglets sont **vides** : ajoutez votre contenu entre les commentaires
`<!-- ===== DÉBUT CONTENU … ===== -->` et `<!-- ===== FIN … ===== -->`.
Classes utiles déjà stylées si besoin : `.section-title`, `.prose`, `.card`,
`.callout`, `.formula`, `.dim`, `.flow`.

### Résultats — plots PNG
Déposez vos exports dans `img/`, puis renseignez `src="img/plot_01.png"` et le
`<figcaption>` de chaque `<figure class="plot">`. 13 emplacements prévus.

### Résultats — tableaux CSV
Deux options (cumulables) :
1. **Auto** : mettez vos fichiers dans `data/` et listez-les dans `app.js`
   (constante `CSV_FILES`), ex. `{ file: "data/cantons.csv", title: "Cantons" }`.
   Chargés au démarrage **une fois le site en ligne**.
2. **Manuel** : bouton *Charger un CSV…* dans l'onglet Résultats — marche
   partout, y compris en local. Sélection multiple possible.

Le séparateur (`,` `;` ou tabulation) est **détecté automatiquement**, les
guillemets et le BOM sont gérés. Les colonnes s'affichent dans l'ordre du fichier.

> Note : le chargement auto via `data/` échoue si vous ouvrez `index.html` en
> `file://` (restriction CORS). Utilisez le bouton manuel en local, ou lancez
> un petit serveur : `python3 -m http.server 8000`.
