# 📲 Guide d'installation — Budget Nolhan

Ce guide te permet de mettre l'application en ligne **dans ton compte Google**, en ~10 minutes.
Aucune compétence technique requise : c'est du copier-coller.

> L'app fonctionne dans le navigateur du téléphone comme une vraie app. Tout est **gratuit** (Google Apps Script + Google Sheets).

---

## Étape 1 — Créer le projet Apps Script

Deux méthodes, au choix (les deux marchent, le code crée sa feuille de données tout seul) :

- **Simple** : va sur **[script.new](https://script.new)** (connecté à **ton** compte `mducheman@gmail.com`). Un « Projet sans titre » s'ouvre — renomme-le en haut à gauche, ex. **« Budget Nolhan »**.
- **Ou** depuis un Google Sheet existant : **Extensions → Apps Script**.

> 📁 **Le classeur de données est créé automatiquement** au premier lancement, en **vrai Google Sheets** (jamais un fichier Excel), dans ton Drive sous le nom **« Budget Nolhan — Données »**. C'est là que tu changeras le PIN, les prénoms, etc. (onglet `Paramètres`). Tu n'as aucune feuille à préparer.
>
> ⚠️ **Important :** ne rattache pas le projet à un fichier **Excel (.xlsx)** — Apps Script n'y sait pas tout faire (formules, lectures). Si tu passes par [script.new](https://script.new), tu n'as pas ce souci : l'app fabrique elle-même son Google Sheets.

---

## Étape 2 — Ouvrir l'éditeur

Tu es déjà dans l'éditeur de code (l'icône **`< >`** dans la barre de gauche). C'est là qu'on colle les fichiers.

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
   - **Qui a accès** : **Toute personne** *(indispensable pour que ton épouse, sans compte Google, puisse ouvrir l'app — l'accès est protégé par le **code PIN**, voir plus bas)*
4. **Déployer**.
5. Google demande d'**autoriser** → choisis ton compte → « Paramètres avancés » → « Accéder à … (non sécurisé) » → **Autoriser**.
   *(C'est normal : Google prévient pour toute app perso non vérifiée. C'est la tienne.)*
6. Copie l'**URL de l'application Web** qui s'affiche. **C'est le lien de l'app.** 🎉

---

## Étape 5 — Activer les alertes automatiques

Pour que les emails (solde bas, rappel loyer, récap hebdo) partent tout seuls :

1. Reviens dans l'**Éditeur** : clique sur l'icône **`< >`** dans la barre de gauche.
   *(Le sélecteur de fonction n'apparaît QUE dans l'éditeur, pas sur la page « Exécutions ».)*
2. Ouvre le fichier **`Code.gs`**.
3. Tout en haut, à côté des boutons **▶ Exécuter / Déboguer**, il y a un **menu déroulant de fonctions** (il affiche sûrement `doGet`). Clique dessus et choisis **`installerDeclencheurs`**.
4. Clique sur **▶ Exécuter**. Autorise si demandé.
5. C'est fait : vérification quotidienne (8h) + récap le dimanche (18h). Un message vert confirme l'installation.

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

## 🔒 Code PIN (sécurité)

Comme l'app est ouverte à « Toute personne » (pour ta femme sans compte Google), elle est **protégée par un code PIN** vérifié côté serveur — sans le bon code, impossible de voir ou saisir quoi que ce soit.

- **Code par défaut : `1234`** → **change-le** directement dans l'app : menu **⋮** (en haut à droite) → **« Changer le code PIN »**. *(Ou via l'onglet `Paramètres`, clé `code_pin`.)*
- Le menu **⋮** contient aussi **« Se déconnecter »**. Une flèche **←** ramène à l'accueil.
- Chacun le saisit une fois en ouvrant l'app.
- Pour **désactiver** le verrouillage : laisse la valeur `code_pin` **vide**.

> Après avoir changé le PIN dans le Sheet, il est actif immédiatement (pas besoin de re-déployer).

---

## 🔧 Réglages (onglet « Paramètres » du classeur)

Tout est modifiable **sans toucher au code**, directement dans l'onglet `Paramètres` :

| Clé | Rôle |
|---|---|
| `sources` | Qui envoie de l'argent (menu déroulant) |
| `prenoms` | Prénoms proposés à l'ouverture (Papa, Nancy, Nolhan) |
| `categories` | Catégories de dépenses |
| `emails_alerte` | Adresses qui reçoivent les alertes (séparées par des virgules) |
| `seuil_solde_eur` | Seuil de l'alerte solde bas (100 €) |
| `taux_cad_eur_manuel` | Taux de secours si la conversion auto échoue |
| `recap_hebdo` | `oui` / `non` pour le récap du dimanche |
| `code_pin` | Code d'accès de l'app (vide = pas de verrouillage) |

Le taux de change automatique se met à jour tout seul (cellule `taux_cad_eur_auto`).

---

## 🔁 Mettre à jour l'app plus tard

Si je te fournis une nouvelle version : recolle les fichiers modifiés, puis **Déployer → Gérer les déploiements → ✏️ → Version : Nouvelle version → Déployer**. Le lien reste le même.

---

## 🆘 Problèmes courants

- **« Autorisation requise »** au 1er lancement : normal, autorise avec ton compte.
- **Conversion à 0 ou taux bizarre** : GOOGLEFINANCE met parfois quelques secondes. Vérifie le taux manuel dans Paramètres.
- **Les emails ne partent pas** : relance l'Étape 5 (`installerDeclencheurs`).
