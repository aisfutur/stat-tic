# Barre — base Supabase

Projet : `bjlimtvimfcaxqtyqgqx` · `https://bjlimtvimfcaxqtyqgqx.supabase.co`

Les quatre migrations y sont **déjà appliquées**. Le catalogue courant compte
132 exercices, 21 échelles, 121 barreaux, 19 routines et 90 lignes de routine ;
après chaque modification de `src/data/*.ts`, il faut régénérer le seed puis le
rejouer sur le projet (voir « Régénérer le catalogue »). Ce qui suit sert aussi
à rejouer le tout sur un projet neuf.

## Brancher l'app

```bash
cp ../.env.example ../.env.local   # VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
```

La clé publiable est faite pour le navigateur : c'est la RLS qui protège les
lignes, jamais le secret de la clé. Ne jamais exposer `service_role`.

Il n'y a **ni compte ni écran de connexion** : l'app a un seul utilisateur.
Toutes les lignes portent le propriétaire fixe `public.owner_id()`
(`00000000-0000-4000-8000-000000000001`), qui doit rester identique à `OWNER_ID`
dans `src/data/constants.ts`. La RLS est toujours active et compare à ce
propriétaire ; elle garde son second rôle, empêcher l'API de modifier le
catalogue intégré (`user_id is null`).

Conséquence à assumer : le rôle `anon` — celui de la clé publiable, embarquée
dans le bundle — a l'accès en écriture. Qui récupère la clé peut lire et
modifier le journal d'entraînement. C'est le prix du « pas de compte ». Pour
refermer : rendre les politiques à `auth.uid()` et remettre un écran de
connexion (`git revert` de la migration `single_owner` et du commit applicatif).

## Appliquer

### Option A — SQL Editor (le plus simple)

1. Dashboard Supabase → **SQL Editor** → **New query**
2. Colle `migrations/20261019120000_init.sql`, exécute
3. Puis `migrations/20261019130000_harden_functions.sql`
4. Puis `migrations/20261022131720_single_owner.sql` (propriétaire fixe, sans compte)
5. Puis `migrations/20261022132049_historique_view.sql` (vue de lecture)
6. Nouvelle requête : colle `seed/catalogue.sql`, exécute

### Option B — CLI

```bash
supabase link --project-ref <ton-ref>
supabase db push                      # applique migrations/
psql "$DATABASE_URL" -f supabase/seed/catalogue.sql
```

Les deux fichiers sont **rejouables** : le seed utilise `on conflict do update`
et reconstruit les tables de liaison, donc le relancer après avoir modifié le
catalogue le met simplement à jour.

## Régénérer le catalogue

Le catalogue n'est décrit qu'à un seul endroit : `src/data/*.ts`.
Après toute modification des exercices, progressions ou routines :

```bash
npm run gen:seed     # réécrit supabase/seed/catalogue.sql
```

N'édite jamais `seed/catalogue.sql` à la main, il serait écrasé.

## Les 11 tables

| Table | Rôle | Correspondance TypeScript |
|---|---|---|
| `profiles` | Nom affiché, routine active, exercice suivi | `AppState.settings` |
| `exercises` | Catalogue d'exercices | `Exercise` |
| `progression_paths` | Une échelle de progression | `ProgressionPath` |
| `progression_steps` | Un barreau + son critère de passage | `ProgressionStep` + `Criterion` |
| `user_progress` | Barreau en cours par échelle | `UserProgress.currentStep` |
| `progression_unlocks` | Date de validation de chaque barreau | `UserProgress.unlockedAt` |
| `routines` | Plan d'entraînement | `Routine` |
| `routine_exercises` | Exercice prescrit dans une routine | `RoutineExercise` |
| `sessions` | Séance loggée | `Session` |
| `session_exercises` | Un exercice dans une séance | `SessionExercise` |
| `sets` | Une série réalisée | `SetEntry` |

`UserProgress.unlockedAt` était un objet JSON côté localStorage ; il devient une
table à part, pour pouvoir répondre à « qu'ai-je débloqué ce trimestre ? ».

## Trois décisions à connaître

**Clés primaires en `text`.** Le catalogue garde les identifiants déjà utilisés
par l'app (`ex-pullup`, `prog-pushup`), et les lignes créées par l'utilisateur
reçoivent un `gen_random_uuid()::text`. Conséquence pratique : un export JSON de
la version localStorage s'importe tel quel, sans table de correspondance.

**`user_id` sur toutes les tables, même enfants.** Ce n'est pas de la
redondance : les clés étrangères composites
(`foreign key (session_id, user_id) references sessions (id, user_id)`)
rendent *impossible au niveau base* qu'une série appartienne à un autre
utilisateur que sa séance. En échange, les politiques RLS sont de simples
comparaisons indexées au lieu de sous-requêtes.

**Catalogue partagé via `user_id IS NULL`.** Une ligne sans propriétaire est
une donnée intégrée : lisible par tous, modifiable par personne via l'API.
Une ligne avec `user_id` est personnelle. Les références *vers* le catalogue
(`routine_exercises.exercise_id`, `progression_steps.exercise_id`) utilisent
donc une FK simple sur l'id : une FK composite empêcherait une routine perso de
pointer vers un exercice intégré.

## Ce que la base calcule elle-même

| Objet | Remplace, côté app |
|---|---|
| `exercise_daily_bests` | `exerciseChartData()`, `personalRecord()` |
| `training_days` | base du streak et de la heatmap |
| `volume_by_category` | `volumeByCategory()`, `pushPullBalance()` |
| `current_streak()` | `computeStreak()` |
| `historique` | le carnet à plat, une ligne par série |
| `sessions.duration_seconds` | colonne générée depuis `started_at`/`ended_at` |
| `routines.is_custom` | colonne générée depuis `user_id` |

Les quatre vues sont en `security_invoker = on` : elles s'exécutent avec les
droits de l'appelant, donc la RLS des tables sous-jacentes continue de
s'appliquer. Rien n'oblige à les utiliser — les fonctions de `src/lib/stats.ts`
restent valables si tu préfères tout calculer côté client.

## Garde-fous posés en base

- Une série mesure des répétitions **ou** un maintien, jamais les deux
  (`set_is_reps_xor_time`), idem pour les critères et les cibles de routine.
- `ended_at` ne peut pas précéder `started_at`.
- Deux barreaux ne peuvent pas occuper le même rang dans une échelle.
- `difficulty` 1–5, `level` 1–5, `frequency_per_week` 1–7.
- Supprimer une ligne du propriétaire n'affecte pas le catalogue partagé.
- Supprimer une séance supprime ses exercices et séries en cascade ; supprimer
  un exercice du catalogue est **refusé** s'il apparaît dans une séance
  (`on delete restrict`), pour ne pas perdre d'historique.

## Limites connues

- **`duration_seconds` est une colonne générée.** Si tu ajoutes un jour une
  mise en pause de séance, la durée réelle ne sera plus
  `ended_at - started_at` : il faudra la repasser en colonne simple.
- **Référence croisée au catalogue.** `routine_exercises.exercise_id` est une FK
  simple, donc rien n'empêche en théorie de référencer l'exercice personnalisé
  d'un autre compte si on devine son id. La RLS empêche de le *lire*, et
  Postgres ne sait pas exprimer « propriétaire = moi ou nul » dans une FK.
  Sans conséquence pour une app mono-utilisateur ; il faudrait un trigger pour
  verrouiller ça complètement.
- **Le catalogue est dupliqué.** La base en a une copie à jour (seed généré),
  mais l'app le lit toujours depuis `src/data/*.ts`. Les tables `exercises`,
  `progression_paths`, `progression_steps` et les routines intégrées servent
  donc aux vues, aux clés étrangères et aux requêtes directes, pas au rendu.
- **Les écritures sont regroupées.** `supabaseRepository` attend 700 ms avant
  d'envoyer, et ne réécrit que les séances modifiées (comparaison JSON avec le
  dernier état connu). Une séance ouverte dans deux onglets n'est donc pas
  fusionnée : le dernier qui écrit gagne.
- **Un échec de lecture suspend les écritures** plutôt que de risquer
  d'écraser le distant avec un état partiel. Depuis l'ajout de
  `src/data/syncStatus.ts`, l'app l'affiche aussi à l'écran (bandeau « Non
  enregistré » + Réessayer) au lieu de ne le dire qu'à la console.
- **La fin de séance court-circuite le regroupement** : `Repository.flush()`
  envoie tout de suite, pour ne pas perdre la séance si le téléphone se
  verrouille dans la seconde.
