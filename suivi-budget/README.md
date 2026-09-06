# 💰 Budget Nolhan

Application de suivi de budget pour un étudiant à l'étranger (Canada), utilisable
facilement au smartphone par toute la famille. Construite en **Google Apps Script + Google Sheets**
(gratuit, hébergé dans ton compte Google, aucune maintenance serveur).

👉 **Pour l'installer : voir [`INSTALLATION.md`](./INSTALLATION.md)** (10 min, copier-coller).

---

## Fonctionnalités

### ➕ Saisie ultra-simple (pensée mobile)
- Un bouton **Dépense** / **Argent reçu**.
- Montant + **devise au choix (CAD ou EUR)** — Nolhan tape en dollars quand il fait ses courses, aucune conversion mentale.
- Conversion **automatique et en temps réel** (taux via GOOGLEFINANCE), affichée pendant la saisie.
- Menus déroulants :
  - **Reçu de** : Papa & Nancy · Maman · Bourse · Job étudiant
  - **Catégories** : Courses · Restaurant · Transport · Téléphone · Santé · Loisirs · Frais scolaires · Habillement · Équipement maison · Autres

### 📊 Tableau de bord
- **Solde d'argent de poche** (reçu − dépenses) en gros, avec **bascule EUR ⇄ CAD**.
- Totaux du mois (reçu / dépensé), répartition des dépenses par catégorie.
- **Graphique historique mensuel** (reçu vs dépenses, 6 derniers mois).
- Dernières opérations, avec **modification** et suppression.
- **Onglet Historique filtrable** : 7 jours · ce mois · mois dernier · tout · plage de dates perso, filtre par catégorie/source, total de la période.
- **Alerte email** quand le solde passe **sous 100 €**.

### 🏠 Suivi du loyer (Plaza 3)
- Échéancier **pré-chargé** (Août 2026 → Juillet 2027, montants réels en CAD).
- Coche un mois quand il est payé (paiement d'avance possible).
- **Voyant 🟢🟠🔴** : la règle « payer avant le 25 du mois précédent » est automatisée.
  - 🟢 à jour · 🟠 échéance sous 5 jours · 🔴 en retard.
- **Rappel email** automatique (le 20 puis le 24) si le mois suivant n'est pas réglé.
- Suivi **séparé** du solde de poche (le loyer ne fausse pas le budget quotidien de Nolhan).

### 📅 Emploi du temps
- Saisie manuelle des cours (matière, jour, horaires, salle, prof) → agenda hebdomadaire lisible.
- Import d'un **fichier** (PDF / photo) stocké dans Google Drive, consultable depuis l'app.

### 📧 Emails automatiques
Envoyés à `mducheman@gmail.com`, `ducheman.nolhan@gmail.com`, `nancydemaestri@yahoo.fr` :
- alerte solde bas, rappels loyer, et **récapitulatif hebdomadaire** (dimanche).

---

## Structure du projet

| Fichier | Rôle |
|---|---|
| `Code.gs` | Backend : données, conversion, loyer, alertes email |
| `Index.html` | Structure de l'interface (4 onglets) |
| `Stylesheet.html` | Styles (responsive, mobile-first) |
| `JavaScript.html` | Logique côté client |
| `appsscript.json` | Manifeste (autorisations, déploiement) |
| `INSTALLATION.md` | Guide de mise en ligne pas-à-pas |

## Données (dans le Google Sheet)

- **Transactions** — chaque reçu/dépense (montant, devise, équivalents CAD & EUR, catégorie, auteur…).
- **Loyer** — échéancier mensuel et statut de paiement.
- **EmploiDuTemps** — les cours.
- **Paramètres** — sources, catégories, emails, seuil, taux, options (tout réglable sans code).

## Sécurité & confidentialité

- **Code PIN** vérifié côté serveur : l'app est ouverte par lien (pour permettre l'accès sans compte Google), mais aucune donnée n'est lisible sans le bon code. PIN par défaut `1234`, à changer dans l'onglet `Paramètres` (clé `code_pin`).
- Tout reste dans **ton** compte Google. L'app s'exécute en ton nom et n'écrit que dans **ton** classeur.
- Le lien de l'app est à garder privé à la famille.
