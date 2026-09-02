# 📲 Guide d'installation — Budget Nolhan

Ce guide te permet de mettre l'application en ligne **dans ton compte Google**, en ~10 minutes.
Aucune compétence technique requise : c'est du copier-coller.

> L'app fonctionne dans le navigateur du téléphone comme une vraie app. Tout est **gratuit** (Google Apps Script + Google Sheets).

---

## Étape 1 — Créer le classeur

1. Va sur **[sheets.new](https://sheets.new)** (connecté à **ton** compte : `mducheman@gmail.com`).
2. Renomme le classeur, en haut à gauche, par ex. **« Budget Nolhan »**.

> Les onglets (Transactions, Loyer, EmploiDuTemps, Paramètres) seront créés **automatiquement** au premier lancement — tu n'as rien à préparer.

---

## Étape 2 — Ouvrir l'éditeur de script

1. Dans le menu du classeur : **Extensions → Apps Script**.
2. Une nouvelle fenêtre s'ouvre (l'éditeur de code).

---

## Étape 3 — Copier les fichiers

Tu vas recréer **4 fichiers** dans l'éditeur. Ils se trouvent dans ce dossier (`suivi-budget/`).

### a) Le code principal
1. Dans l'éditeur, il y a déjà un fichier `Code.gs` (avec `function myFunction`).
2. **Efface tout** son contenu et **colle** le contenu de **`Code.gs`** (ce dossier).

### b) Les 3 fichiers d'interface (HTML)
Pour chacun : clique sur le **+** (à côté de « Fichiers ») → **HTML** → donne le nom exact (sans `.html`, l'éditeur l'ajoute) → colle le contenu.

| Créer un fichier HTML nommé | Coller le contenu de |
|---|---|
| `Index`      | `Index.html`      |
| `Stylesheet` | `Stylesheet.html` |
| `JavaScript` | `JavaScript.html` |

> ⚠️ Les noms doivent être **exactement** `Index`, `Stylesheet`, `JavaScript` (respecte les majuscules).

### c) (Optionnel) Le manifeste
1. Roue crantée **⚙️ Paramètres du projet** → coche **« Afficher le fichier manifeste `appsscript.json` »**.
2. Ouvre `appsscript.json`, efface son contenu et colle le contenu de **`appsscript.json`** (ce dossier).

Clique sur **💾 Enregistrer** (icône disquette).

---

## Étape 4 — Déployer l'application web

1. En haut à droite : **Déployer → Nouveau déploiement**.
2. Clique sur l'engrenage **⚙️ → Application Web**.
3. Renseigne :
   - **Description** : `Budget Nolhan`
   - **Exécuter en tant que** : **Moi** (`mducheman@gmail.com`)
   - **Qui a accès** : **Toute personne disposant d'un compte Google**
4. **Déployer**.
5. Google demande d'**autoriser** → choisis ton compte → « Paramètres avancés » → « Accéder à … (non sécurisé) » → **Autoriser**.
   *(C'est normal : Google prévient pour toute app perso non vérifiée. C'est la tienne.)*
6. Copie l'**URL de l'application Web** qui s'affiche. **C'est le lien de l'app.** 🎉

---

## Étape 5 — Activer les alertes automatiques

Pour que les emails (solde bas, rappel loyer, récap hebdo) partent tout seuls :

1. Dans l'éditeur, en haut, sélectionne la fonction **`installerDeclencheurs`** dans le menu déroulant.
2. Clique sur **▶ Exécuter**.
3. Autorise si demandé. C'est fait : vérification quotidienne (8h) + récap le dimanche (18h).

---

## Étape 6 — Partager avec la famille

1. Envoie le lien de l'app (Étape 4) à Nolhan et à ton épouse.
2. Sur le téléphone de Nolhan, ouvrir le lien puis **« Ajouter à l'écran d'accueil »** (Safari/Chrome) → l'app apparaît comme une icône, plein écran. 📱

> Les 3 (toi, ton épouse, Nolhan) se connectent avec **leur propre compte Google** et écrivent tous dans le **même** classeur (le tien). Garde le lien privé à la famille.

---

## ✅ Vérifications rapides

- **Ajouter une dépense** en CAD → elle apparaît dans l'onglet Budget, convertie en €.
- **Onglet Loyer** → Août/Sept/Oct 2026 déjà cochés « payé ». Coche Novembre pour tester.
- **Voyant loyer** : vert aujourd'hui, il passera orange vers le 20 octobre puis rouge après le 25 si Novembre n'est pas coché.

---

## 🔧 Réglages (onglet « Paramètres » du classeur)

Tout est modifiable **sans toucher au code**, directement dans l'onglet `Paramètres` :

| Clé | Rôle |
|---|---|
| `sources` | Qui envoie de l'argent (menu déroulant) |
| `categories` | Catégories de dépenses |
| `emails_alerte` | Adresses qui reçoivent les alertes (séparées par des virgules) |
| `seuil_solde_eur` | Seuil de l'alerte solde bas (100 €) |
| `taux_cad_eur_manuel` | Taux de secours si la conversion auto échoue |
| `recap_hebdo` | `oui` / `non` pour le récap du dimanche |

Le taux de change automatique se met à jour tout seul (cellule `taux_cad_eur_auto`).

---

## 🔁 Mettre à jour l'app plus tard

Si je te fournis une nouvelle version : recolle les fichiers modifiés, puis **Déployer → Gérer les déploiements → ✏️ → Version : Nouvelle version → Déployer**. Le lien reste le même.

---

## 🆘 Problèmes courants

- **« Autorisation requise »** au 1er lancement : normal, autorise avec ton compte.
- **Conversion à 0 ou taux bizarre** : GOOGLEFINANCE met parfois quelques secondes. Vérifie le taux manuel dans Paramètres.
- **Les emails ne partent pas** : relance l'Étape 5 (`installerDeclencheurs`).
