import { formatDay, formatNumber, type Strings } from './en';

const essais = (n: number) => `${n} ${n === 1 ? 'essai' : 'essais'}`;
const formatKm = (km: number) => `${formatNumber('fr', km)} km`;

/** French UI text (FR-13). Same shape as en.ts, enforced by the Strings type. */
export const fr: Strings = {
  lang: 'fr',
  otherLanguage: { short: 'EN', name: 'English', lang: 'en' },
  title: 'Getting Warmer',
  menu: 'Menu',
  expandPanel: 'Agrandir le panneau',
  collapsePanel: 'Réduire le panneau',
  dayLabel: (n: number) => `N° ${String(n).padStart(3, '0')}`,
  formatDate: (iso: string) => formatDay('fr-FR', iso),

  intro: 'Trouvez le pays.',
  introSub: 'Un pays mystère par jour. Plus vous approchez, plus ça chauffe.',

  inputLabel: 'Proposer un pays',
  inputPlaceholder: 'Tapez un pays',
  submit: 'Valider',
  didYouMean: 'Vouliez-vous dire',
  yes: 'Oui',
  no: 'Non',
  unknownCountry: (input: string) => `« ${input} » ne fait pas partie de notre liste.`,
  alreadyGuessed: (name: string) => `Vous avez déjà proposé ${name}.`,

  bands: {
    found: 'Trouvé',
    burning: 'Brûlant',
    hot: 'Chaud',
    warm: 'Tiède',
    cool: 'Frais',
    freezing: 'Glacial',
  },
  bandRanges: {
    burning: 'moins de 250 km',
    hot: '250 à 1 000 km',
    warm: '1 000 à 2 500 km',
    cool: '2 500 à 5 000 km',
    freezing: 'plus de 5 000 km',
  },
  trends: {
    first: 'Premier essai.',
    warmer: 'Ça chauffe.',
    colder: 'Ça refroidit.',
    same: 'Aussi proche que votre meilleur essai.',
    found: 'Vous l’avez trouvé.',
  },
  trendHeadline: {
    first: 'Premier essai.',
    warmer: 'Ça chauffe.',
    colder: 'Ça refroidit.',
    same: 'Pareil.',
    found: 'Trouvé.',
  },
  trendSub: {
    first: 'Suivez la couleur pour vous rapprocher.',
    warmer: 'Plus proche que tous vos essais.',
    colder: 'Plus loin que votre meilleur essai.',
    same: 'Exactement aussi proche que votre meilleur essai.',
    found: '',
  },
  trendArrow: { first: '', warmer: '▲', colder: '▼', same: '=', found: '●' },
  bordersIt: 'Frontalier',
  adjacentHeadline: 'Tout près.',
  adjacentSub: (name: string) => `${name} a une frontière commune avec le pays mystère.`,
  bestSoFar: 'Meilleur essai',
  thermometerLabel: (band: string, km: number | null) =>
    km === null ? 'Aucun essai' : `Meilleur essai : ${band}, ${formatKm(km)}`,
  noGuessesYet: 'Aucun essai',

  guessesHeading: essais,
  viewRanked: 'Plus proches',
  viewChronological: 'Dans l’ordre',
  km: formatKm,

  giveUp: 'Abandonner',
  confirmGiveUp: 'Abandonner et voir la réponse ? La partie comptera comme perdue.',
  foundIn: (n: number) => `Trouvé en ${essais(n)}`,
  gaveUpAfter: (n: number) => `Abandon après ${essais(n)}`,
  answerWas: 'La réponse était',
  yourPath: 'Votre parcours',
  todayStats: 'Aujourd’hui dans le monde',
  statsPlayers: 'Joueurs',
  statsMedian: 'Essais (médiane)',
  statsWithin5: 'Trouvé en 5 ou moins',
  statsUnavailable: 'Les statistiques mondiales sont indisponibles pour le moment.',
  statsMean: 'Moyenne',
  statsTopFirst: 'Premier essai le plus courant',
  streakLabel: 'Série',
  share: 'Partager',
  shareCopied: 'Copié',
  shareFailed: 'Copie automatique impossible. Sélectionnez et copiez ce texte :',
  shareTitle: (day: number, n: number, won: boolean) =>
    won
      ? `Getting Warmer n° ${day} · ${essais(n)}`
      : `Getting Warmer n° ${day} · abandon après ${essais(n)}`,
  shareStreak: (n: number) => `Série : ${n} ${n === 1 ? 'jour' : 'jours'}`,

  stats: 'Stats',
  statPlayed: 'Parties',
  statWinRate: 'Victoires',
  statStreak: 'Série en cours',
  statBestStreak: 'Meilleure série',
  statDistribution: 'Victoires par nombre d’essais',
  statAverage: 'Moyenne',
  statEmpty: 'Terminez une partie pour lancer vos statistiques.',
  statDeviceOnly: 'Enregistré sur cet appareil uniquement. Sans compte, sans pistage.',

  about: 'À propos',
  repoUrl: 'https://github.com/jih7ne/globle-clone',
  aboutRepo: 'Code source sur GitHub',
  aboutSections: [
    {
      title: 'Le jeu',
      body: 'Un pays mystère par jour, le même pour tous ceux qui ont la même date locale. Chaque essai indique la distance, de frontière à frontière, et l’échelle va de Glacial à Brûlant. Inspiré de Globle.',
    },
    {
      title: 'Données cartographiques',
      body: 'Frontières et noms viennent de Natural Earth (domaine public). Les 195 pays jouables sont les États membres de l’ONU et les deux États observateurs. Le Sahara occidental est représenté comme partie du Maroc. Les frontières sont simplifiées et ne prennent parti dans aucun différend.',
    },
    {
      title: 'Jeu équitable',
      body: 'La réponse reste sur le serveur jusqu’à ce que vous gagniez ou abandonniez. Chaque essai est vérifié par un jeton signé : les statistiques mondiales ne comptent que de vraies parties.',
    },
    {
      title: 'Confidentialité',
      body: 'Pas de compte, pas de cookies, pas de pistage. Vos statistiques restent dans ce navigateur. Le serveur garde une ligne anonyme par partie terminée pour les statistiques du jour, jamais votre adresse IP.',
    },
    {
      title: 'Comment c’est testé',
      body: 'Tests unitaires et de propriétés pour la logique du jeu, tests de données pour chaque distance, tests d’intégration de l’API sur une vraie base locale, le tout lancé en CI à chaque push.',
    },
  ],
  nextCountry: 'Prochain pays dans',
  aboutFeedback: 'Donner votre avis',

  feedback: {
    pageTitle: 'Votre avis',
    intro: 'Six questions rapides, deux minutes au plus. Anonyme : sans e-mail, sans pistage.',
    required: 'Obligatoire',
    optional: 'Facultatif',
    device: 'Sur quoi avez-vous joué ?',
    devices: { mobile: 'Téléphone', desktop: 'Ordinateur', both: 'Les deux' },
    rating: 'Le jeu vous a-t-il plu ?',
    ratingHint: 'De Glacial (pas du tout) à Brûlant (adoré).',
    again: 'Reviendriez-vous demain ?',
    agains: { yes: 'Oui', maybe: 'Peut-être', no: 'Non' },
    problems: 'Quelque chose de confus, lent ou cassé ?',
    problemsHint: 'Ce qui s’est passé, et sur quel écran.',
    ideas: 'Des idées pour la suite : que faudrait-il ajouter ou changer ?',
    ideasHint: 'Fonctions, modes, design, tout.',
    setup: 'Quel téléphone ou navigateur ?',
    setupHint: 'Pour reproduire les bugs. Par exemple : iPhone 13, Safari.',
    submit: 'Envoyer',
    sending: 'Envoi…',
    missing: 'Merci de répondre aux deux questions obligatoires.',
    failed: 'Envoi impossible. Vérifiez votre connexion et réessayez.',
    tooMany: 'Trop d’essais. Attendez une minute puis réessayez.',
    thanks: 'Merci.',
    thanksSub: 'Votre avis a bien été envoyé. Il nous aide vraiment.',
    backToGame: 'Retour au jeu',
  },

  howToPlay: 'Comment jouer',
  close: 'Fermer',
  howToSteps: [
    {
      title: 'Proposez un pays',
      body: 'Tapez n’importe quel pays. Il s’allume sur le globe, coloré selon sa distance au pays mystère.',
    },
    {
      title: 'Lisez la chaleur',
      body: 'La distance se mesure de frontière à frontière : deux voisins sont à 0 km. Rouge, c’est proche ; bleu, c’est loin.',
    },
    {
      title: 'Resserrez',
      body: 'Essais illimités. Un nouveau pays chaque jour à minuit, heure locale.',
    },
  ],
  bandsHeading: 'L’échelle',
  start: 'Commencer',
  globeHint: 'Glisser pour tourner · Molette pour zoomer',
  globeUnavailable:
    'Le globe ne peut pas s’afficher dans ce navigateur. Les distances vous guident toujours.',

  offline: 'Serveur injoignable. Votre partie est enregistrée ; réessayez dans un instant.',
  retry: 'Réessayer',
  clockWrong: 'La date de votre appareil semble fausse. Vérifiez l’horloge puis rechargez.',
  beforeLaunch: 'Le jeu n’a pas encore commencé. Revenez bientôt !',
  finishedElsewhere: 'La partie du jour a déjà été terminée sur cet appareil.',
};
