# Prompt — Développer "Barre", une web app de suivi calisthénie

Copie-colle ce prompt dans Claude Code (ou tout autre outil de dev) pour démarrer le projet.

---

## Contexte et vision

Construis une web app personnelle de suivi d'entraînement en calisthénie, appelée **"Barre"**. C'est l'équivalent de l'app Hevy mais spécialisé calisthénie, **sans aucune fonctionnalité sociale** (pas de partage, pas de feed, pas de profils publics). Un seul utilisateur, usage 100% personnel.

L'app doit permettre de :
1. Logger des séances d'entraînement en temps réel
2. Suivre sa progression sur des compétences de calisthénie via des arbres de progression (ex : pompe → pompe à un bras)
3. Construire et suivre des routines/plans d'entraînement par niveaux
4. Visualiser ses statistiques dans le temps

## Stack technique recommandée

- **Frontend** : React + TypeScript, Vite
- **Style** : Tailwind CSS (utility classes) + un peu de CSS custom pour les éléments signature
- **Stockage** : commence en local (localStorage / IndexedDB) pour un MVP fonctionnel sans backend ; prévois une couche d'accès aux données isolée (ex: un hook `useData()` ou repository pattern) pour pouvoir brancher une vraie base de données plus tard sans tout réécrire
- **Graphiques** : Recharts pour les courbes de progression
- **Routing** : React Router, navigation par onglets en bas façon app mobile

## Direction visuelle ("Acier & Craie")

- **Fond** : béton foncé `#1A1D1E`, cartes `#24282A` / `#2C3133`
- **Texte** : blanc craie `#EDEAE2`, texte secondaire `#9CA6A3`
- **Accent principal (actions)** : bleu acier `#6E9BC7`
- **Accent effort/streak/PR** : braise `#C1502E`
- **Accent succès/complété** : mousse `#7A9A63`
- **Verrouillé/inactif** : `#4A4E4F`
- **Typographie** : titres en `Bebas Neue` (condensé, majuscules, esprit panneau de gym), corps de texte en `Inter`, toutes les données chiffrées (reps, poids, chronos, tempo) en `JetBrains Mono` pour un rendu "tableau de bord"
- **Coins arrondis** : 12-18px sur les cartes, pilules à 100% pour les tags/chips
- Mobile-first, mais responsive jusqu'au desktop (colonnes multiples sur grand écran)

### Élément signature : l'échelle de progression

Chaque compétence (pompe, traction, planche, front lever, pistol squat...) se visualise comme une **échelle verticale** : un rail pointillé vertical relie des barreaux, chacun représentant une étape de progression. Chaque barreau a un état visuel distinct :
- **Acquis** : nœud plein vert mousse avec ✓
- **En cours** : nœud contour bleu acier avec halo lumineux, numéro de l'étape
- **Verrouillé** : nœud gris avec icône cadenas, texte atténué

Réutilise ce motif d'échelle (même en miniature) ailleurs dans l'app dès que c'est pertinent (ex: mini-aperçu sur l'accueil), pour une identité cohérente.

## Écrans à construire (5 vues principales + navigation par onglets)

### 1. Accueil
- Salutation + date du jour
- Compteur de streak (jours consécutifs) avec icône flamme, couleur braise
- Carte "Séance du jour" mise en avant : nom de la routine active, nombre d'exercices, durée estimée, dernière séance, bouton "Commencer la séance"
- 3 stats rapides (ex : max reps tractions, temps de maintien planche, reps pistol squat par jambe)
- Mini calendrier de la semaine (7 cases, remplies si séance faite, case du jour mise en avant)

### 2. Séance en cours (logging)
- Header avec bouton quitter + chrono de séance total
- Carte exercice actif : nom, référence "dernière fois" (poids/reps/repos), tableau des séries avec colonnes poids / reps / tempo / case à cocher validée
- Bouton "+ Ajouter une série"
- Bloc "repos" avec minuteur circulaire décompte + nom du prochain exercice/série
- Support visuel des **supersets** : tag distinctif quand plusieurs exercices s'enchaînent sans repos
- Support des exercices **isométriques** (temps de maintien au lieu de reps) — prévoir un mode d'affichage différent (chrono au lieu de compteur de reps)

### 3. Progressions
- Onglets par catégorie : Pousser / Tirer / Jambes (extensible à d'autres catégories : gainage, mobilité...)
- Vue "échelle" décrite ci-dessus, avec pour chaque barreau : nom de l'exercice, objectif chiffré (ex: "7/10 reps"), badge de statut
- Cliquer sur un barreau ouvre le détail de l'exercice (description, erreurs courantes, critère de passage au niveau suivant)

### 4. Routines
- Liste de cartes "niveau" (1 à 5) par groupe musculaire/compétence
- Chaque carte : numéro de niveau, nom, tags (nb d'exercices, fréquence/semaine, durée estimée), barre de progression vers le niveau suivant
- Niveau actif mis en évidence, niveaux futurs verrouillés visuellement (mais consultables)
- Action "Créer une routine personnalisée" (formulaire simple : nom, liste d'exercices, sets/reps/repos cible, fréquence)

### 5. Statistiques
- Courbe d'évolution d'un exercice choisi (ex: max reps tractions dans le temps) avec variation sur la période
- Donut ratio push/pull (ou autre répartition personnalisable) avec message d'encouragement/alerte si déséquilibre
- Heatmap de fréquence d'entraînement (style calendrier de contributions), sur 12 semaines

## Modèle de données (à définir précisément dans le code)

Prévois au minimum ces entités :
- **Exercise** : id, nom, catégorie (push/pull/legs/core), type (reps | temps), muscles ciblés, description, étape de progression associée (si applicable), niveau de difficulté
- **ProgressionPath** : id, catégorie, liste ordonnée d'Exercise avec un critère de passage au suivant (ex: "8 reps x 3 séries")
- **UserProgress** : pour chaque ProgressionPath, l'étape actuelle atteinte par l'utilisateur, date de déblocage
- **Routine** : id, nom, niveau, liste d'exercices avec sets/reps/repos/tempo cibles, fréquence recommandée, éventuels supersets (groupes d'exercices)
- **Session** (séance loggée) : id, date, routine associée (optionnel), liste de SessionExercise
- **SessionExercise** : exercice, liste de séries (poids, reps ou durée, tempo, complétée ou non), notes libres
- **Streak/Stats** : dérivés calculés à partir de l'historique des séances (pas besoin de stocker en dur, à calculer à la volée)

## Fonctionnalités MVP (priorité 1)

1. Logger une séance manuellement (choisir des exercices, entrer séries/reps/poids, marquer comme complété)
2. Voir l'historique des séances passées
3. Voir au moins un arbre de progression fonctionnel avec passage d'étape manuel ou basé sur un critère simple
4. Dashboard accueil avec stats de base et streak
5. Persistance locale (les données ne doivent pas se perdre au rechargement de la page)

## Fonctionnalités à ajouter ensuite (priorité 2)

- Minuteur de repos avec notifications
- Statistiques avancées et graphiques
- Création de routines personnalisées par l'utilisateur
- Export/import des données (fichier JSON) pour sauvegarde manuelle, puisqu'il n'y a pas de compte cloud
- Mode "focus séance" plein écran

## Contraintes explicites

- **Aucune fonctionnalité sociale** : pas de partage, pas de commentaires, pas de feed, pas de comparaison avec d'autres utilisateurs
- Application mono-utilisateur, pas de système d'authentification multi-comptes nécessaire dans un premier temps
- Priorise la fiabilité du logging pendant une séance (l'usage principal) avant les fonctionnalités secondaires
- Respecte l'accessibilité de base : contrastes suffisants, focus clavier visible, tailles de police lisibles sur mobile

## Livrable attendu

Commence par :
1. Poser la structure du projet (Vite + React + TypeScript + Tailwind)
2. Définir les types TypeScript du modèle de données ci-dessus
3. Construire l'écran Accueil et l'écran Séance en cours en premier (cœur de l'usage quotidien)
4. Puis Progressions, Routines, Statistiques
5. Me proposer une démo fonctionnelle en local avant d'ajouter des fonctionnalités avancées
