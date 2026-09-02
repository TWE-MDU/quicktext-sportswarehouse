/**
 * Suivi de budget – Nolhan (études au Canada)
 * ------------------------------------------------------------
 * Application Google Apps Script + Google Sheets.
 * Backend : lecture/écriture dans le Google Sheet, conversion de devises,
 * suivi du loyer, alertes email et récapitulatif hebdomadaire.
 *
 * Auteur : famille Ducheman-Demaestri
 * ------------------------------------------------------------
 */

/* ============================================================
 * CONSTANTES / PARAMÈTRES PAR DÉFAUT
 * (tout est ensuite modifiable dans l'onglet « Paramètres »)
 * ============================================================ */

var FEUILLES = {
  TRANSACTIONS: 'Transactions',
  LOYER: 'Loyer',
  EMPLOI: 'EmploiDuTemps',
  PARAMS: 'Paramètres'
};

// Sources d'argent reçu (menu déroulant côté saisie)
var SOURCES_DEFAUT = ['Papa & Nancy', 'Maman', 'Bourse', 'Job étudiant'];

// Profils / prénoms (qui utilise l'app) — sert au « Bonjour X » et à l'auteur
var PRENOMS_DEFAUT = ['Papa', 'Nancy', 'Nolhan'];

// Catégories de dépenses courantes (le LOYER est géré à part, il n'est pas ici)
var CATEGORIES_DEFAUT = [
  'Courses', 'Restaurant', 'Transport', 'Téléphone', 'Santé',
  'Loisirs', 'Frais scolaires', 'Habillement', 'Équipement maison', 'Autres'
];

// Destinataires des alertes email
var EMAILS_DEFAUT = 'mducheman@gmail.com, ducheman.nolhan@gmail.com, nancydemaestri@yahoo.fr';

// Seuil d'alerte sur le solde « argent de poche » (en euros)
var SEUIL_SOLDE_EUR_DEFAUT = 100;

// Code PIN par défaut (à changer dans l'onglet Paramètres, clé « code_pin »).
// Mettre une valeur vide pour désactiver le verrouillage.
var PIN_DEFAUT = '1234';

// Taux de repli si GOOGLEFINANCE est indisponible (1 CAD = X EUR)
var TAUX_CAD_EUR_REPLI = 0.66;

// Échéancier du loyer pré-chargé (montants en CAD). Clé = AAAA-MM.
// Statut initial : payés = Août, Sept, Oct 2026 (d'après le relevé fourni).
var LOYER_ECHEANCIER = [
  { mois: '2026-08', libelle: 'Loyer Août 2026 - Plaza 3',  montant: 1044, paye: true  },
  { mois: '2026-09', libelle: 'Loyer Sept. 2026 - Plaza 3', montant: 919,  paye: true  },
  { mois: '2026-10', libelle: 'Loyer Oct. 2026 - Plaza 3',  montant: 919,  paye: true  },
  { mois: '2026-11', libelle: 'Loyer Nov. 2026 - Plaza 3',  montant: 919,  paye: false },
  { mois: '2026-12', libelle: 'Loyer Déc. 2026 - Plaza 3',  montant: 919,  paye: false },
  { mois: '2027-01', libelle: 'Loyer Jan. 2027 - Plaza 3',  montant: 1044, paye: false },
  { mois: '2027-02', libelle: 'Loyer Fév. 2027 - Plaza 3',  montant: 919,  paye: false },
  { mois: '2027-03', libelle: 'Loyer Mar. 2027 - Plaza 3',  montant: 919,  paye: false },
  { mois: '2027-04', libelle: 'Loyer Avr. 2027 - Plaza 3',  montant: 919,  paye: false },
  { mois: '2027-05', libelle: 'Loyer Mai 2027 - Plaza 3',   montant: 919,  paye: false },
  { mois: '2027-06', libelle: 'Loyer Juin 2027 - Plaza 3',  montant: 969,  paye: false },
  { mois: '2027-07', libelle: 'Loyer Juil. 2027 - Plaza 3', montant: 919,  paye: false }
];

var TZ = 'America/Toronto'; // fuseau de référence pour les échéances

/* ============================================================
 * POINT D'ENTRÉE WEB
 * ============================================================ */

function doGet() {
  ensureSetup_();
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Budget Nolhan')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setFaviconUrl('https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico');
}

/** Permet d'inclure un fichier HTML dans un autre (CSS / JS). */
function include(nom) {
  return HtmlService.createHtmlOutputFromFile(nom).getContent();
}

/* ============================================================
 * INITIALISATION DU CLASSEUR
 * ============================================================ */

/**
 * Renvoie le classeur de données — TOUJOURS un vrai Google Sheets dédié.
 *
 * On n'adopte jamais la feuille « active » : si le projet est rattaché à un
 * fichier Excel (.xlsx), Apps Script ne peut pas y écrire les formules ni tout
 * lire correctement. On crée donc notre propre classeur natif et on retient
 * son ID. (Ancienne clé SPREADSHEET_ID ignorée volontairement.)
 */
function getClasseur_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('DATA_SHEET_ID');
  if (id) {
    try {
      var existant = SpreadsheetApp.openById(id);
      existant.getName();                 // force l'accès (échoue si supprimé)
      return existant;
    } catch (e) { /* recréé ci-dessous */ }
  }
  var neuf = SpreadsheetApp.create('Budget Nolhan — Données');
  props.setProperty('DATA_SHEET_ID', neuf.getId());
  return neuf;
}

/** Crée les onglets et les données de départ si nécessaire. Idempotent. */
function ensureSetup_() {
  var ss = getClasseur_();

  // --- Transactions ---
  var tx = ss.getSheetByName(FEUILLES.TRANSACTIONS);
  if (!tx) {
    tx = ss.insertSheet(FEUILLES.TRANSACTIONS);
    tx.appendRow(['ID', 'Date', 'Type', 'Montant', 'Devise',
      'Montant_CAD', 'Montant_EUR', 'Source/Catégorie', 'Note', 'Auteur', 'Horodatage']);
    tx.setFrozenRows(1);
  }

  // --- Loyer ---
  var lo = ss.getSheetByName(FEUILLES.LOYER);
  if (!lo) {
    lo = ss.insertSheet(FEUILLES.LOYER);
    lo.appendRow(['Mois', 'Libellé', 'Montant_CAD', 'Statut', 'Date_paiement', 'Auteur']);
    lo.setFrozenRows(1);
    LOYER_ECHEANCIER.forEach(function (m) {
      lo.appendRow([m.mois, m.libelle, m.montant, m.paye ? 'Payé' : 'Non payé',
        m.paye ? new Date() : '', m.paye ? 'Import initial' : '']);
    });
  }

  // --- Emploi du temps ---
  var et = ss.getSheetByName(FEUILLES.EMPLOI);
  if (!et) {
    et = ss.insertSheet(FEUILLES.EMPLOI);
    et.appendRow(['ID', 'Matière', 'Jour', 'Heure_début', 'Heure_fin', 'Salle', 'Professeur', 'Note', 'Fichier_URL']);
    et.setFrozenRows(1);
  }

  // --- Paramètres ---
  var pa = ss.getSheetByName(FEUILLES.PARAMS);
  if (!pa) {
    pa = ss.insertSheet(FEUILLES.PARAMS);
    pa.appendRow(['Clé', 'Valeur']);
    pa.appendRow(['sources', SOURCES_DEFAUT.join(', ')]);
    pa.appendRow(['prenoms', PRENOMS_DEFAUT.join(', ')]);
    pa.appendRow(['categories', CATEGORIES_DEFAUT.join(', ')]);
    pa.appendRow(['emails_alerte', EMAILS_DEFAUT]);
    pa.appendRow(['seuil_solde_eur', SEUIL_SOLDE_EUR_DEFAUT]);
    pa.appendRow(['taux_cad_eur_manuel', TAUX_CAD_EUR_REPLI]);
    pa.appendRow(['recap_hebdo', 'oui']);
    pa.appendRow(['code_pin', PIN_DEFAUT]);
    // Cellules techniques pour le taux de change automatique (GOOGLEFINANCE)
    pa.appendRow(['taux_cad_eur_auto', '']);
    pa.getRange('B' + pa.getLastRow()).setFormula('=IFERROR(GOOGLEFINANCE("CURRENCY:CADEUR"),"")');
    pa.setFrozenRows(1);
    pa.setColumnWidth(1, 180);
    pa.setColumnWidth(2, 320);
  }

  // Supprime la feuille vide par défaut (« Feuille 1 » / « Sheet1 ») si présente
  if (ss.getSheets().length > 1) {
    ['Feuille 1', 'Sheet1', 'Feuille1'].forEach(function (n) {
      var f = ss.getSheetByName(n);
      if (f && f.getLastRow() === 0) { try { ss.deleteSheet(f); } catch (e) {} }
    });
  }
}

/* ============================================================
 * PARAMÈTRES
 * ============================================================ */

function getParam_(cle, defaut) {
  var pa = getClasseur_().getSheetByName(FEUILLES.PARAMS);
  if (!pa) return defaut;
  var valeurs = pa.getDataRange().getValues();
  for (var i = 1; i < valeurs.length; i++) {
    if (String(valeurs[i][0]).trim() === cle) {
      var v = valeurs[i][1];
      return (v === '' || v === null || v === undefined) ? defaut : v;
    }
  }
  return defaut;
}

function listeDepuisParam_(cle, defaut) {
  var brut = String(getParam_(cle, defaut.join(', ')));
  return brut.split(',').map(function (s) { return s.trim(); }).filter(String);
}

/* ============================================================
 * TAUX DE CHANGE
 * ============================================================ */

/**
 * Renvoie le taux 1 CAD -> EUR.
 * 1) tente GOOGLEFINANCE (cellule technique, mise en cache 1h) ;
 * 2) sinon le taux manuel de l'onglet Paramètres ;
 * 3) sinon le taux de repli codé en dur.
 */
function getTauxCadEur_() {
  var cache = CacheService.getScriptCache();
  var enCache = cache.get('taux_cad_eur');
  if (enCache) return parseFloat(enCache);

  var taux = null;
  var pa = getClasseur_().getSheetByName(FEUILLES.PARAMS);
  if (pa) {
    SpreadsheetApp.flush();
    var valeurs = pa.getDataRange().getValues();
    for (var i = 1; i < valeurs.length; i++) {
      if (valeurs[i][0] === 'taux_cad_eur_auto') {
        var v = parseFloat(valeurs[i][1]);
        if (!isNaN(v) && v > 0) taux = v;
      }
    }
  }
  if (!taux) {
    var manuel = parseFloat(getParam_('taux_cad_eur_manuel', TAUX_CAD_EUR_REPLI));
    taux = (!isNaN(manuel) && manuel > 0) ? manuel : TAUX_CAD_EUR_REPLI;
  }
  cache.put('taux_cad_eur', String(taux), 3600); // 1 heure
  return taux;
}

/** Convertit un montant d'une devise vers { cad, eur }. */
function convertir_(montant, devise) {
  var taux = getTauxCadEur_();       // 1 CAD = taux EUR
  var m = parseFloat(montant) || 0;
  if (devise === 'EUR') {
    return { cad: arrondi_(m / taux), eur: arrondi_(m) };
  }
  // par défaut : CAD
  return { cad: arrondi_(m), eur: arrondi_(m * taux) };
}

function arrondi_(x) { return Math.round(x * 100) / 100; }

/* ============================================================
 * SÉCURITÉ – VERROUILLAGE PAR CODE PIN
 * ============================================================ */

/** Jeton de session interne (créé une fois, mémorisé). */
function getJetonSecret_() {
  var props = PropertiesService.getScriptProperties();
  var s = props.getProperty('jeton_secret');
  if (!s) { s = Utilities.getUuid(); props.setProperty('jeton_secret', s); }
  return s;
}

/** Le code PIN attendu (vide = verrouillage désactivé). */
function pinAttendu_() {
  return String(getParam_('code_pin', PIN_DEFAUT)).trim();
}

/** Vérifie le jeton fourni par le client ; lève une erreur si invalide. */
function verifierAcces_(jeton) {
  if (pinAttendu_() === '') return;               // verrouillage désactivé
  if (jeton && jeton === getJetonSecret_()) return;
  throw new Error('Accès non autorisé — code PIN requis.');
}

/** Le client demande si un PIN est nécessaire (au chargement). */
function getEtatVerrou() {
  ensureSetup_();
  return { verrou: pinAttendu_() !== '' };
}

/**
 * Déverrouille l'app avec le PIN. En cas de succès, renvoie un jeton
 * (à transmettre aux appels suivants) et la configuration.
 */
function deverrouiller(pin) {
  ensureSetup_();
  if (pinAttendu_() !== '' && String(pin).trim() !== pinAttendu_()) {
    return { ok: false };
  }
  return { ok: true, jeton: getJetonSecret_(), config: configInterne_() };
}

function configInterne_() {
  return {
    sources: listeDepuisParam_('sources', SOURCES_DEFAUT),
    prenoms: listeDepuisParam_('prenoms', PRENOMS_DEFAUT),
    categories: listeDepuisParam_('categories', CATEGORIES_DEFAUT),
    tauxCadEur: getTauxCadEur_(),
    seuilEur: parseFloat(getParam_('seuil_solde_eur', SEUIL_SOLDE_EUR_DEFAUT))
  };
}

/* ============================================================
 * API CÔTÉ CLIENT – DASHBOARD
 * ============================================================ */

/** Toutes les données du tableau de bord en un appel (protégé par PIN). */
function getDashboard(jeton) {
  verifierAcces_(jeton);
  return dashboardInterne_();
}

function dashboardInterne_() {
  ensureSetup_();
  var tx = lireTransactions_();
  var maintenant = new Date();
  var moisCourant = Utilities.formatDate(maintenant, TZ, 'yyyy-MM');

  var totalRecuEur = 0, totalDepEur = 0;
  var recuMoisEur = 0, depMoisEur = 0;
  var parCategorie = {};

  tx.forEach(function (t) {
    var moisT = Utilities.formatDate(new Date(t.date), TZ, 'yyyy-MM');
    if (t.type === 'Reçu') {
      totalRecuEur += t.eur;
      if (moisT === moisCourant) recuMoisEur += t.eur;
    } else {
      totalDepEur += t.eur;
      if (moisT === moisCourant) {
        depMoisEur += t.eur;
        parCategorie[t.cat] = (parCategorie[t.cat] || 0) + t.eur;
      }
    }
  });

  var soldeEur = arrondi_(totalRecuEur - totalDepEur);
  var taux = getTauxCadEur_();
  var seuil = parseFloat(getParam_('seuil_solde_eur', SEUIL_SOLDE_EUR_DEFAUT));

  // Top catégories triées
  var cats = Object.keys(parCategorie).map(function (c) {
    return { categorie: c, eur: arrondi_(parCategorie[c]) };
  }).sort(function (a, b) { return b.eur - a.eur; });

  return {
    soldeEur: soldeEur,
    soldeCad: arrondi_(soldeEur / taux),
    sousLeSeuil: soldeEur < seuil,
    seuilEur: seuil,
    totalRecuEur: arrondi_(totalRecuEur),
    totalDepEur: arrondi_(totalDepEur),
    recuMoisEur: arrondi_(recuMoisEur),
    depMoisEur: arrondi_(depMoisEur),
    tauxCadEur: taux,
    categories: cats,
    recentes: tx.slice(-8).reverse(),
    loyer: getStatutLoyer_()
  };
}

/* ============================================================
 * TRANSACTIONS
 * ============================================================ */

function lireTransactions_() {
  var sh = getClasseur_().getSheetByName(FEUILLES.TRANSACTIONS);
  if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 11).getValues();
  return v.map(function (r) {
    return {
      id: r[0], date: r[1], type: r[2], montant: r[3], devise: r[4],
      cad: r[5], eur: r[6], cat: r[7], note: r[8], auteur: r[9]
    };
  });
}

/**
 * Ajoute une transaction (reçu ou dépense).
 * data = { type, montant, devise, categorie, note, date(optionnel) }
 */
function ajouterTransaction(jeton, data) {
  verifierAcces_(jeton);
  ensureSetup_();
  var sh = getClasseur_().getSheetByName(FEUILLES.TRANSACTIONS);
  var montant = parseFloat(data.montant);
  if (!montant || montant <= 0) throw new Error('Montant invalide.');
  var devise = (data.devise === 'EUR') ? 'EUR' : 'CAD';
  var type = (data.type === 'Reçu') ? 'Reçu' : 'Dépense';
  var conv = convertir_(montant, devise);
  var date = data.date ? new Date(data.date) : new Date();
  var id = 'TX' + new Date().getTime();
  var auteur = (data.auteur || (Session.getActiveUser().getEmail() || 'famille').split('@')[0]);

  sh.appendRow([
    id,
    Utilities.formatDate(date, TZ, 'yyyy-MM-dd'),
    type, montant, devise, conv.cad, conv.eur,
    data.categorie || '', data.note || '', auteur, new Date()
  ]);
  return dashboardInterne_();
}

function supprimerTransaction(jeton, id) {
  verifierAcces_(jeton);
  var sh = getClasseur_().getSheetByName(FEUILLES.TRANSACTIONS);
  var v = sh.getDataRange().getValues();
  for (var i = v.length - 1; i >= 1; i--) {
    if (v[i][0] === id) { sh.deleteRow(i + 1); break; }
  }
  return dashboardInterne_();
}

/* ============================================================
 * LOYER
 * ============================================================ */

function lireLoyer_() {
  var sh = getClasseur_().getSheetByName(FEUILLES.LOYER);
  if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
  return v.map(function (r, idx) {
    return {
      ligne: idx + 2,
      mois: r[0], libelle: r[1], montant: r[2],
      paye: String(r[3]).trim() === 'Payé',
      datePaiement: r[4], auteur: r[5]
    };
  });
}

/** Liste complète de l'échéancier (pour l'écran Loyer, protégé par PIN). */
function getLoyer(jeton) {
  verifierAcces_(jeton);
  return loyerInterne_();
}

function loyerInterne_() {
  ensureSetup_();
  var taux = getTauxCadEur_();
  var lignes = lireLoyer_().map(function (l) {
    return {
      mois: l.mois, libelle: l.libelle,
      montantCad: l.montant, montantEur: arrondi_(l.montant * taux),
      paye: l.paye,
      datePaiement: l.datePaiement ? Utilities.formatDate(new Date(l.datePaiement), TZ, 'dd/MM/yyyy') : ''
    };
  });
  return { lignes: lignes, statut: getStatutLoyer_(), tauxCadEur: taux };
}

/** Coche / décoche un mois de loyer comme payé. */
function basculerLoyer(jeton, mois, paye) {
  verifierAcces_(jeton);
  var sh = getClasseur_().getSheetByName(FEUILLES.LOYER);
  var v = sh.getDataRange().getValues();
  var auteur = (Session.getActiveUser().getEmail() || 'inconnu').split('@')[0];
  for (var i = 1; i < v.length; i++) {
    if (v[i][0] === mois) {
      sh.getRange(i + 1, 4).setValue(paye ? 'Payé' : 'Non payé');
      sh.getRange(i + 1, 5).setValue(paye ? new Date() : '');
      sh.getRange(i + 1, 6).setValue(paye ? auteur : '');
      break;
    }
  }
  return loyerInterne_();
}

/**
 * Calcule l'état du loyer : voyant vert / orange / rouge, prochain mois dû,
 * date limite (le 25 du mois précédent).
 */
function getStatutLoyer_() {
  var lignes = lireLoyer_().sort(function (a, b) { return a.mois < b.mois ? -1 : 1; });
  var dernierPaye = null;
  var prochainDu = null;
  for (var i = 0; i < lignes.length; i++) {
    if (lignes[i].paye) dernierPaye = lignes[i];
    else if (!prochainDu) prochainDu = lignes[i];
  }

  if (!prochainDu) {
    return {
      couleur: 'vert', titre: 'Tout est réglé 🎉',
      message: dernierPaye ? ('Payé jusqu\'à ' + moisJoli_(dernierPaye.mois)) : '',
      dernierPayeMois: dernierPaye ? moisJoli_(dernierPaye.mois) : '',
      prochainMois: '', dateLimite: '', montantCad: 0
    };
  }

  var limite = dateLimite_(prochainDu.mois); // 25 du mois précédent
  var aujourdhui = dateAujourdhui_();
  var joursRestants = Math.floor((limite - aujourdhui) / 86400000);

  var couleur, titre, message;
  if (joursRestants < 0) {
    couleur = 'rouge';
    titre = 'Loyer en retard';
    message = 'Le loyer de ' + moisJoli_(prochainDu.mois) + ' (' + prochainDu.montant +
      ' $) n\'est pas saisi. Échéance dépassée (25 ' + moisJoli_(moisPrecedent_(prochainDu.mois)) + ').';
  } else if (joursRestants <= 5) {
    couleur = 'orange';
    titre = 'Loyer à régler bientôt';
    message = 'Loyer de ' + moisJoli_(prochainDu.mois) + ' (' + prochainDu.montant +
      ' $) à régler avant le 25 ' + moisJoli_(moisPrecedent_(prochainDu.mois)) +
      ' (dans ' + joursRestants + ' j).';
  } else {
    couleur = 'vert';
    titre = 'Loyer à jour';
    message = (dernierPaye ? 'Payé jusqu\'à ' + moisJoli_(dernierPaye.mois) + '. ' : '') +
      'Prochain : ' + moisJoli_(prochainDu.mois) + ' (' + prochainDu.montant + ' $).';
  }

  return {
    couleur: couleur, titre: titre, message: message,
    dernierPayeMois: dernierPaye ? moisJoli_(dernierPaye.mois) : '',
    prochainMois: moisJoli_(prochainDu.mois),
    dateLimite: Utilities.formatDate(limite, TZ, 'dd/MM/yyyy'),
    joursRestants: joursRestants,
    montantCad: prochainDu.montant
  };
}

/* ============================================================
 * EMPLOI DU TEMPS
 * ============================================================ */

var ORDRE_JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function getEmploiDuTemps(jeton) {
  verifierAcces_(jeton);
  return emploiInterne_();
}

function emploiInterne_() {
  ensureSetup_();
  var sh = getClasseur_().getSheetByName(FEUILLES.EMPLOI);
  if (!sh || sh.getLastRow() < 2) return { cours: [] };
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 9).getValues();
  var cours = v.map(function (r) {
    return {
      id: r[0], matiere: r[1], jour: r[2], debut: r[3], fin: r[4],
      salle: r[5], prof: r[6], note: r[7], fichierUrl: r[8]
    };
  });
  cours.sort(function (a, b) {
    var ja = ORDRE_JOURS.indexOf(a.jour), jb = ORDRE_JOURS.indexOf(b.jour);
    if (ja !== jb) return ja - jb;
    return String(a.debut).localeCompare(String(b.debut));
  });
  return { cours: cours };
}

function ajouterCours(jeton, data) {
  verifierAcces_(jeton);
  ensureSetup_();
  var sh = getClasseur_().getSheetByName(FEUILLES.EMPLOI);
  if (!data.matiere) throw new Error('La matière est obligatoire.');
  var id = 'C' + new Date().getTime();
  sh.appendRow([id, data.matiere, data.jour || '', data.debut || '', data.fin || '',
    data.salle || '', data.prof || '', data.note || '', data.fichierUrl || '']);
  return emploiInterne_();
}

function supprimerCours(jeton, id) {
  verifierAcces_(jeton);
  var sh = getClasseur_().getSheetByName(FEUILLES.EMPLOI);
  var v = sh.getDataRange().getValues();
  for (var i = v.length - 1; i >= 1; i--) {
    if (v[i][0] === id) { sh.deleteRow(i + 1); break; }
  }
  return emploiInterne_();
}

/**
 * Enregistre un fichier d'emploi du temps (PDF/photo) dans un dossier Drive
 * et renvoie son URL consultable.
 * b64 = données base64 ; nom = nom de fichier ; type = mime.
 */
function televerserFichierEmploi(jeton, b64, nom, type) {
  verifierAcces_(jeton);
  var dossier = getDossierEmploi_();
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), type, nom);
  var fichier = dossier.createFile(blob);
  fichier.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return fichier.getUrl();
}

function getDossierEmploi_() {
  var nom = 'Budget Nolhan - Emplois du temps';
  var it = DriveApp.getFoldersByName(nom);
  return it.hasNext() ? it.next() : DriveApp.createFolder(nom);
}

/* ============================================================
 * ALERTES EMAIL & RÉCAP (déclencheurs temporels)
 * ============================================================ */

/**
 * À exécuter une fois pour installer les déclencheurs automatiques :
 * - vérification quotidienne (solde + loyer)
 * - récapitulatif hebdomadaire (dimanche)
 */
function installerDeclencheurs() {
  // Nettoyage des anciens déclencheurs de ce projet
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });

  ScriptApp.newTrigger('verifierAlertesQuotidiennes')
    .timeBased().everyDays(1).atHour(8).inTimezone(TZ).create();

  ScriptApp.newTrigger('envoyerRecapHebdo')
    .timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(18).inTimezone(TZ).create();

  return 'Déclencheurs installés ✅ (vérif quotidienne 8h, récap le dimanche 18h).';
}

function verifierAlertesQuotidiennes() {
  ensureSetup_();
  verifierSeuilSolde_();
  verifierEcheanceLoyer_();
}

/** Alerte si le solde « argent de poche » passe sous le seuil. */
function verifierSeuilSolde_() {
  var d = dashboardInterne_();
  if (!d.sousLeSeuil) return;

  var props = PropertiesService.getScriptProperties();
  var aujourdhui = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  if (props.getProperty('derniereAlerteSolde') === aujourdhui) return; // 1x/jour max

  var sujet = '⚠️ Budget Nolhan : solde bas (' + d.soldeEur + ' €)';
  var corps =
    'Le solde d\'argent de poche de Nolhan est de ' + d.soldeEur + ' € (' + d.soldeCad + ' $ CAD),\n' +
    'sous le seuil d\'alerte de ' + d.seuilEur + ' €.\n\n' +
    'Reçu total : ' + d.totalRecuEur + ' € — Dépensé total : ' + d.totalDepEur + ' €.\n\n' +
    'Pensez à faire un virement si besoin.';
  envoyerEmailAlerte_(sujet, corps);
  props.setProperty('derniereAlerteSolde', aujourdhui);
}

/** Rappel loyer le 20 et le 24 du mois si le mois suivant n'est pas réglé. */
function verifierEcheanceLoyer_() {
  var jour = parseInt(Utilities.formatDate(new Date(), TZ, 'd'), 10);
  var statut = getStatutLoyer_();
  if (statut.couleur === 'vert' && jour !== 20 && jour !== 24) return;

  // On alerte quand orange/rouge, ou en relance les 20 et 24
  if (statut.couleur === 'vert') return;

  var props = PropertiesService.getScriptProperties();
  var cle = 'alerteLoyer_' + statut.prochainMois + '_' + statut.couleur + '_' +
    Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  if (props.getProperty(cle)) return;

  var sujet = (statut.couleur === 'rouge' ? '🔴' : '🟠') +
    ' Loyer ' + statut.prochainMois + ' — ' + statut.titre;
  var corps = statut.message + '\n\n' +
    'Rappel : le loyer doit être réglé avant le 25 du mois précédent.\n' +
    'Une fois payé, cochez le mois dans l\'application pour arrêter les rappels.';
  envoyerEmailAlerte_(sujet, corps);
  props.setProperty(cle, '1');
}

/** Récapitulatif hebdomadaire (si activé dans les paramètres). */
function envoyerRecapHebdo() {
  if (String(getParam_('recap_hebdo', 'oui')).toLowerCase().indexOf('oui') === -1) return;
  ensureSetup_();

  var tx = lireTransactions_();
  var ilYa7j = new Date(new Date().getTime() - 7 * 86400000);
  var recuSemaine = 0, depSemaine = 0, parCat = {};
  tx.forEach(function (t) {
    if (new Date(t.date) >= ilYa7j) {
      if (t.type === 'Reçu') recuSemaine += t.eur;
      else { depSemaine += t.eur; parCat[t.cat] = (parCat[t.cat] || 0) + t.eur; }
    }
  });

  var d = dashboardInterne_();
  var lignesCat = Object.keys(parCat).sort(function (a, b) { return parCat[b] - parCat[a]; })
    .map(function (c) { return '  • ' + c + ' : ' + arrondi_(parCat[c]) + ' €'; }).join('\n') || '  (aucune dépense)';

  var sujet = '📊 Récap hebdo — Budget Nolhan';
  var corps =
    'Bonjour,\n\nVoici le récapitulatif des 7 derniers jours :\n\n' +
    '• Argent reçu : ' + arrondi_(recuSemaine) + ' €\n' +
    '• Dépenses : ' + arrondi_(depSemaine) + ' €\n\n' +
    'Répartition des dépenses :\n' + lignesCat + '\n\n' +
    '— — —\n' +
    'Solde actuel : ' + d.soldeEur + ' € (' + d.soldeCad + ' $ CAD)\n' +
    'Loyer : ' + d.loyer.titre + ' — ' + d.loyer.message + '\n\n' +
    'Bon week-end !';
  envoyerEmailAlerte_(sujet, corps);
}

function envoyerEmailAlerte_(sujet, corps) {
  var dest = String(getParam_('emails_alerte', EMAILS_DEFAUT));
  MailApp.sendEmail({ to: dest, subject: sujet, body: corps + '\n\n— Application Budget Nolhan' });
}

/* ============================================================
 * UTILITAIRES DATES / LOYER
 * ============================================================ */

var MOIS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/** '2026-11' -> 'Novembre 2026' */
function moisJoli_(cle) {
  var p = String(cle).split('-');
  return MOIS_FR[parseInt(p[1], 10) - 1] + ' ' + p[0];
}

/** '2026-11' -> '2026-10' */
function moisPrecedent_(cle) {
  var p = String(cle).split('-');
  var an = parseInt(p[0], 10), mo = parseInt(p[1], 10) - 1; // mois précédent
  if (mo === 0) { mo = 12; an -= 1; }
  return an + '-' + ('0' + mo).slice(-2);
}

/** Date limite = 25 du mois précédent le mois dû (à 23:59). */
function dateLimite_(moisDu) {
  var prec = moisPrecedent_(moisDu).split('-');
  return new Date(parseInt(prec[0], 10), parseInt(prec[1], 10) - 1, 25, 23, 59, 59);
}

/** Date du jour à minuit (pour comparer en jours pleins). */
function dateAujourdhui_() {
  var s = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd').split('-');
  return new Date(parseInt(s[0], 10), parseInt(s[1], 10) - 1, parseInt(s[2], 10), 0, 0, 0);
}
