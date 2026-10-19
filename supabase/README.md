# Barre — base Supabase

Projet : `bjlimtvimfcaxqtyqgqx` · `https://bjlimtvimfcaxqtyqgqx.supabase.co`

Les deux migrations et le catalogue y sont **déjà appliqués** (33 exercices,
5 échelles, 26 barreaux, 9 routines, 38 lignes de routine). Ce qui suit sert à
rejouer le tout sur un projet neuf.

## Brancher l'app

```bash
cp ../.env.example ../.env.local   # VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
```

La clé publiable est faite pour le navigateur : c'est la RLS qui protège les
lignes, jamais le secret de la clé. Ne jamais exposer `service_role`.

Au premier lancement, l'app demande un e-mail et un mot de passe. Ce compte ne
sert qu'à fournir un `auth.uid()` à la RLS ; le trigger `handle_new_user` crée
le profil, et `supabaseRepository` écrit l'historique de démonstration dans la
base. Les confirmations d'e-mail sont actives par défaut sur un projet
Supabase : le lien reçu doit être ouvert avant la première connexion.

Variante sans compte : activer **Authentication → Sign In / Up → Anonymous
sign-ins** dans le dashboard, puis remplacer l'appel `signInWithPassword` de
`AuthGate` par `signInAnonymously()`. La RLS continue de fonctionner, un
utilisateur anonyme recevant lui aussi un `auth.uid()`.

## Appliquer

### Option A — SQL Editor (le plus simple)

1. Dashboard Supabase → **SQL Editor** → **New query**
2. Colle `migrations/20261019120000_init.sql`, exécute
3. Puis `migrations/20261019130000_harden_functions.sql`
4. Nouvelle requête : colle `seed/catalogue.sql`, exécute

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
| `sessions.duration_seconds` | colonne générée depuis `started_at`/`ended_at` |
| `routines.is_custom` | colonne générée depuis `user_id` |

Les trois vues sont en `security_invoker = on` : elles s'exécutent avec les
droits de l'appelant, donc la RLS des tables sous-jacentes continue de
s'appliquer. Rien n'oblige à les utiliser — les fonctions de `src/lib/stats.ts`
restent valables si tu préfères tout calculer côté client.

## Garde-fous posés en base

- Une série mesure des répétitions **ou** un maintien, jamais les deux
  (`set_is_reps_xor_time`), idem pour les critères et les cibles de routine.
- `ended_at` ne peut pas précéder `started_at`.
- Deux barreaux ne peuvent pas occuper le même rang dans une échelle.
- `difficulty` 1–5, `level` 1–5, `frequency_per_week` 1–7.
- Supprimer un compte efface toutes ses données ; le catalogue partagé survit.
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
  d'écraser le distant avec un état partiel ; la console le signale.
