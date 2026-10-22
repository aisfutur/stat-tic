# Barre

Web app personnelle de suivi d'entraînement en calisthénie. Mono-utilisateur,
**sans aucune fonctionnalité sociale**, données sur Supabase (ou dans le
navigateur si aucun projet n'est configuré).

## Démarrer

```bash
npm install
cp .env.example .env.local   # URL + clé publiable du projet Supabase
npm run dev                  # http://localhost:5173
```

Sans `.env.local`, l'app démarre quand même : elle retombe sur `localStorage`.

Autres scripts : `npm run build` (typecheck + bundle), `npm run preview`,
`npm run typecheck`.

## Stack

React 18 + TypeScript, Vite 5, Tailwind CSS 3, React Router 6, Recharts,
`@supabase/supabase-js`. Persistance : Postgres + RLS côté Supabase, ou
`localStorage` si le projet n'est pas configuré.

## Écrans

| Route | Écran | Contenu |
|---|---|---|
| `/` | Accueil | Streak, semaine en cours, séance du jour, records, aperçu des progressions |
| `/seance` | Séance en cours | Logging série par série, minuteur de repos, supersets, isométriques |
| `/progressions` | Progressions | Échelles par compétence, détail et critère de passage |
| `/routines` | Routines | Plans par niveaux + création de routine personnalisée |
| `/stats` | Statistiques | Onglet Analyse (courbe, ratio pousser/tirer, heatmap) + onglet Historique |
| `/historique` | Historique | Séances passées, détail, suppression |
| `/reglages` | Réglages | Nom, thème (sombre / clair / système), export / import JSON, effacement, démo |

Pas d'écran de connexion : l'app est mono-propriétaire (voir « Un seul
propriétaire, pas de compte »).

## Architecture

```
src/
  types/index.ts        Modèle de données (Exercise, ProgressionPath, Routine, Session…)
  data/
    constants.ts        Clé et version de stockage
    repository.ts       Interface Repository + implémentation localStorage
    supabaseRepository.ts  Implémentation Supabase (séances, progressions, perso)
    seed.ts             État de départ vide + historique de démonstration
    syncStatus.ts       État de la dernière écriture (canal d'alerte)
    exercises.ts        Catalogue d'exercices + registre des exercices perso
    progressions.ts     Échelles de progression et critères
    routines.ts         Routines intégrées
  hooks/
    useData.tsx         Store applicatif + toutes les actions
    useTheme.tsx        Thème sombre / clair (réglage par appareil)
    useTimers.ts        Chrono de séance et minuteur de repos
  lib/
    supabase.ts         Client Supabase, `null` si le projet n'est pas configuré
    stats.ts            Streak, records, heatmap, ratios (calculés à la volée)
    utils.ts            Dates, durées, helpers
  components/           TabBar, ProgressionLadder, RestTimer, Sheet, Heatmap,
                        SessionHistory (liste de séances partagée), SyncIndicator,
                        ExercisePicker…
  screens/              Un fichier par écran

scripts/gen-seed.ts     Génère le seed SQL depuis src/data/*.ts
supabase/
  migrations/           Schéma Postgres (tables, RLS, index, vues)
  seed/catalogue.sql    Catalogue intégré — GÉNÉRÉ, ne pas éditer
```

### Supabase

Le schéma Postgres vit dans `supabase/` (11 tables, RLS, vues de stats) et il
est appliqué sur le projet — voir [`supabase/README.md`](supabase/README.md).

Le catalogue (exercices, échelles, routines intégrées) reste décrit une seule
fois dans `src/data/*.ts`, d'où le seed SQL est généré ; l'app continue de le
lire depuis ces fichiers, et la base en garde une copie à jour pour les
requêtes et les vues. Seules les **données de l'athlète** font l'aller-retour :
séances, progressions, routines perso et réglages.

Deux précautions dans `supabaseRepository`, parce que `save()` reçoit l'état
entier à chaque frappe : les écritures sont regroupées (700 ms) et sérialisées,
et un instantané du dernier état connu permet de ne réécrire que les séances et
routines dont le JSON a changé.

#### Un seul propriétaire, pas de compte

L'app n'a qu'un utilisateur : son auteur. Il n'y a donc ni inscription, ni
écran de connexion. Toutes les lignes portent un propriétaire fixe,
`OWNER_ID` dans `src/data/constants.ts`, qui doit rester identique à la
fonction `public.owner_id()` en base (migration `20261022131720_single_owner`).
La RLS est toujours active et compare à ce propriétaire : elle garde son second
rôle, empêcher l'API de modifier le catalogue intégré (`user_id is null`).

⚠ Le revers : la clé publiable est embarquée dans le bundle de l'app déployée,
et le rôle `anon` a l'accès en écriture. Qui récupère la clé peut lire et
modifier ce journal d'entraînement. C'est le prix du « pas de compte » sur une
app perso ; pour refermer, il suffit de rendre les politiques à `auth.uid()` et
de remettre un écran de connexion.

#### Lire ses séances en SQL

Les séances s'écrivent dans trois tables (`sessions`, `session_exercises`,
`sets`), pratiques pour l'app mais pénibles à lire. La vue `public.historique`
les remet à plat, une ligne par série, et se lit comme un carnet
d'entraînement :

```sql
select date, seance, exercice, serie, reps, seconds, lest_kg from public.historique;
select * from public.exercise_daily_bests;  -- records par exercice et par jour
select public.current_streak();             -- streak en cours
```

### Changer de base de données

Toute la persistance passe par l'interface `Repository`
(`load` / `save` / `flush` / `clear`) définie dans `src/data/repository.ts`.
Pour brancher une vraie base, il suffit de fournir une autre implémentation
et de la passer au provider :

```tsx
<DataProvider repository={monRepositoryDistant}>
```

Aucun composant ne touche à `localStorage` directement — à une exception près,
assumée : le thème (`hooks/useTheme.tsx`). C'est un réglage d'appareil, et il
doit s'appliquer avant le chargement des données, donc avant que le
`Repository` ait répondu.

## Données réelles

Un compte neuf démarre **vide**. L'historique de démonstration (36 séances,
un streak de 3 jours, un record de 10 tractions) ne s'écrit plus tout seul : il
se charge depuis Réglages → Zone sensible, et seulement sur demande. Sinon
streak, records et courbes d'évolution décriraient des séances qui n'ont jamais
eu lieu.

Tout le reste est dérivé des séances enregistrées, calculé à la volée par
`lib/stats.ts` : il n'y a aucun compteur de record stocké à maintenir à jour.
La seule chose qui doit donc être garantie, c'est l'écriture :

- les écritures Supabase sont regroupées (700 ms), **sauf** fin de séance et
  suppression de séance, qui déclenchent un envoi immédiat (`Repository.flush()`) ;
- `duration_seconds` est une colonne générée par Postgres à partir de
  `ended_at - started_at` : l'app ne l'écrit pas, et ne peut pas la désynchroniser ;
- un échec d'écriture n'est plus silencieux : il remonte par `data/syncStatus.ts`
  et s'affiche en haut de l'écran avec un bouton « Réessayer ».

## Thème

Les couleurs sont des variables CSS définies deux fois dans `src/index.css`
(sombre par défaut, clair sous `[data-theme='light']`), et `tailwind.config.js`
n'y fait que référence. Les noms décrivent un rôle, pas une teinte :
`concrete-900` est toujours le fond, `chalk` toujours le texte. Un composant
n'a donc rien à faire du thème actif ; seuls Recharts et les attributs `stroke`
des SVG, qui exigent une couleur et non une classe, passent par
`useThemeColors()`. Un script d'amorçage dans `index.html` pose
`data-theme` avant la première peinture pour éviter un flash sombre.

## Exercices personnalisés

Le catalogue intégré (132 exercices) vit dans `src/data/exercises.ts`. Un
exercice créé depuis le sélecteur est stocké dans `AppState.customExercises`
— donc dans la table `exercises` de Supabase avec `user_id = OWNER_ID`, ou
dans `localStorage`. Comme `lib/stats.ts` et le seed doivent résoudre un
identifiant sans contexte React, le `DataProvider` publie la liste dans le
registre de `data/exercises.ts` pendant son rendu, et tout le code lit
`getExercise(id)`.

## Déployer sur Vercel

Vercel détecte Vite tout seul ; `vercel.json` fixe quand même la commande de
build, la sortie `dist/` et la réécriture SPA — sans elle, un rechargement sur
`/stats` renverrait un 404, les routes n'étant pas des fichiers.

Deux réglages à faire une fois :

1. **Vercel → Settings → Environment Variables** : `VITE_SUPABASE_URL` et
   `VITE_SUPABASE_PUBLISHABLE_KEY`, les mêmes valeurs que `.env.local` — qui
   n'est pas versionné. Sans elles, le site déployé retombe sur `localStorage`.
2. **Supabase → Authentication → URL Configuration** : la **Site URL** doit
   être le domaine Vercel, sinon les liens de confirmation d'e-mail renvoient
   vers `localhost`.

## Direction visuelle — « Acier & Craie »

| Rôle | Couleur |
|---|---|
| Fond béton | `#1A1D1E` |
| Cartes | `#24282A` / `#2C3133` |
| Texte craie | `#EDEAE2` — secondaire `#9CA6A3` |
| Accent actions (bleu acier) | `#6E9BC7` |
| Effort / streak / PR (braise) | `#C1502E` |
| Succès / acquis (mousse) | `#7A9A63` |
| Verrouillé | `#4A4E4F` |

Typographie : titres en **Bebas Neue**, corps en **Inter**, toutes les
données chiffrées en **JetBrains Mono**.

L'élément signature est l'**échelle de progression** : un rail pointillé
vertical reliant des barreaux (acquis / en cours / verrouillé), repris en
miniature sur l'accueil (`MiniLadder`).

## Données

Avec Supabase configuré, tout est dans la base, rangé par `user_id` et isolé
par la RLS. Sans Supabase, tout est dans `localStorage` sous la clé
`barre.state.v1`. Dans les deux cas **Réglages → Exporter** produit un fichier
JSON à conserver. **Réglages → Effacer mes données** repart d'un état vide en
gardant le nom et le thème ; l'historique de démonstration est un bouton
distinct, jamais appliqué automatiquement (voir « Données réelles »).
