-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Barre — catalogue intégré                                       ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- GÉNÉRÉ depuis src/data/{exercises,progressions,routines}.ts.
-- Ne pas éditer à la main : modifier les fichiers TypeScript puis
-- relancer `npm run gen:seed`.
--
-- Toutes les lignes ont user_id = NULL : contenu partagé, visible en
-- lecture par tous les comptes, modifiable par personne via l'API.
-- Le script est idempotent, on peut le rejouer à volonté.

begin;

-- Les tables de liaison sont reconstruites, les autres mises à jour en place
-- (un exercice ne peut pas être supprimé s'il est référencé par une séance).
delete from public.progression_steps where user_id is null;
delete from public.routine_exercises where user_id is null;


-- ─── Chemins de progression ───────────────────────────────────────

insert into public.progression_paths (id, user_id, name, category) values
  ('prog-pushup', null, 'Pompe → un bras', 'push'),
  ('prog-pullup', null, 'Traction → un bras', 'pull'),
  ('prog-squat', null, 'Squat → pistol lesté', 'legs'),
  ('prog-planche', null, 'Planche', 'core'),
  ('prog-frontlever', null, 'Front lever', 'pull')
on conflict (id) do update set name = excluded.name, category = excluded.category;


-- ─── Exercices (33) ──────────────────────────────────────────────

insert into public.exercises (id, user_id, name, category, type, muscles, description, common_mistakes, difficulty) values
  ('ex-wall-pushup', null, 'Pompe au mur', 'push', 'reps',
   array['Pectoraux', 'Triceps', 'Épaules'],
   'Debout face au mur, mains à hauteur de poitrine. Descends la poitrine vers le mur en gardant le corps gréé d’un seul bloc.',
   array['Cambrer le bas du dos', 'Coudes qui partent à 90° sur les côtés'], 1),
  ('ex-incline-pushup', null, 'Pompe inclinée', 'push', 'reps',
   array['Pectoraux', 'Triceps'],
   'Mains sur une surface surélevée (table, banc). Plus la surface est basse, plus l’exercice est dur.',
   array['Hanches qui montent', 'Amplitude partielle'], 1),
  ('ex-pushup', null, 'Pompe complète', 'push', 'reps',
   array['Pectoraux', 'Triceps', 'Gainage'],
   'Corps en planche, mains sous les épaules. Descends jusqu’à ce que la poitrine effleure le sol, coudes à 45°.',
   array['Tête qui plonge avant la poitrine', 'Fesses en l’air', 'Coudes écartés'], 2),
  ('ex-diamond-pushup', null, 'Pompe diamant', 'push', 'reps',
   array['Triceps', 'Pectoraux'],
   'Mains jointes en losange sous le sternum. Charge fortement les triceps et prépare le travail unilatéral.',
   array['Mains trop hautes vers le visage', 'Coudes qui s’écartent en haut'], 3),
  ('ex-archer-pushup', null, 'Pompe archer', 'push', 'reps',
   array['Pectoraux', 'Triceps'],
   'Mains très écartées, un bras se plie pendant que l’autre reste tendu. Transfère la charge d’un côté.',
   array['Rotation du buste', 'Bras tendu qui se plie'], 4),
  ('ex-one-arm-pushup', null, 'Pompe à un bras', 'push', 'reps',
   array['Pectoraux', 'Triceps', 'Obliques'],
   'Pieds écartés, un bras dans le dos. Le gainage anti-rotation compte autant que la force de poussée.',
   array['Épaule qui s’effondre', 'Rotation excessive des hanches'], 5),
  ('ex-dead-hang', null, 'Suspension passive', 'pull', 'time',
   array['Avant-bras', 'Dorsaux', 'Épaules'],
   'Suspendu bras tendus, épaules actives. Construit la poigne et la tolérance des tissus.',
   array['Épaules totalement relâchées', 'Bloquer sa respiration'], 1),
  ('ex-scapular-pull', null, 'Traction scapulaire', 'pull', 'reps',
   array['Trapèzes', 'Dorsaux'],
   'Depuis la suspension, abaisse les omoplates sans plier les coudes. Amplitude courte, intention forte.',
   array['Plier les coudes', 'Mouvement trop rapide'], 1),
  ('ex-negative-pullup', null, 'Traction négative', 'pull', 'time',
   array['Dorsaux', 'Biceps'],
   'Pars menton au-dessus de la barre et descends le plus lentement possible. Vise 5 s par répétition.',
   array['Lâcher en bas de l’amplitude', 'Descente trop rapide'], 2),
  ('ex-pullup', null, 'Traction stricte', 'pull', 'reps',
   array['Dorsaux', 'Biceps', 'Gainage'],
   'Prise pronation largeur d’épaules. Monte jusqu’à ce que le menton passe la barre, bras tendus en bas.',
   array['Kipping involontaire', 'Amplitude tronquée en bas', 'Menton tendu vers l’avant'], 3),
  ('ex-archer-pullup', null, 'Traction archer', 'pull', 'reps',
   array['Dorsaux', 'Biceps'],
   'Mains larges, tu tires vers une main pendant que l’autre bras reste tendu le long de la barre.',
   array['Bras tendu qui plie', 'Perte de gainage, jambes qui balancent'], 4),
  ('ex-one-arm-pullup', null, 'Traction à un bras', 'pull', 'reps',
   array['Dorsaux', 'Biceps', 'Avant-bras'],
   'Le graal du tirage vertical. Nécessite des années de poigne, de force de coude et de gainage.',
   array['Passer trop vite depuis la traction lestée', 'Négliger la santé des coudes'], 5),
  ('ex-bodyweight-squat', null, 'Squat au poids du corps', 'legs', 'reps',
   array['Quadriceps', 'Fessiers'],
   'Pieds largeur de hanches, descends jusqu’à ce que les cuisses passent la parallèle.',
   array['Talons qui décollent', 'Genoux qui rentrent'], 1),
  ('ex-split-squat', null, 'Fente bulgare', 'legs', 'reps',
   array['Quadriceps', 'Fessiers', 'Équilibre'],
   'Pied arrière surélevé, descends à la verticale sur la jambe avant.',
   array['Pas assez de distance entre les pieds', 'Buste qui bascule'], 2),
  ('ex-assisted-pistol', null, 'Pistol assisté', 'legs', 'reps',
   array['Quadriceps', 'Fessiers', 'Mobilité cheville'],
   'Squat sur une jambe en te tenant à un support ou avec contre-poids. Jambe libre tendue devant.',
   array['Trop s’aider des bras', 'Dos qui s’arrondit en bas'], 3),
  ('ex-pistol-squat', null, 'Pistol squat', 'legs', 'reps',
   array['Quadriceps', 'Fessiers', 'Gainage'],
   'Squat complet sur une jambe, l’autre tendue devant, sans aide.',
   array['Talon qui décolle', 'Chute en fin d’amplitude'], 4),
  ('ex-weighted-pistol', null, 'Pistol lesté', 'legs', 'reps',
   array['Quadriceps', 'Fessiers'],
   'Pistol squat avec charge additionnelle (gilet, kettlebell) pour continuer à progresser.',
   array['Ajouter de la charge avant une amplitude propre'], 5),
  ('ex-plank', null, 'Planche', 'core', 'time',
   array['Abdominaux', 'Gainage'],
   'Appui avant-bras, corps aligné des talons à la nuque. Serre fessiers et abdos.',
   array['Bassin trop haut', 'Lombaires creusées'], 1),
  ('ex-frog-stand', null, 'Grenouille (frog stand)', 'core', 'time',
   array['Épaules', 'Poignets', 'Gainage'],
   'Équilibre sur les mains, genoux posés sur les triceps. Premier contact avec la planche.',
   array['Regard au sol entre les mains', 'Coudes qui s’écartent'], 2),
  ('ex-tuck-planche', null, 'Planche groupée', 'core', 'time',
   array['Épaules', 'Gainage', 'Pectoraux'],
   'Bras tendus, épaules avancées devant les mains, genoux ramenés vers la poitrine.',
   array['Épaules pas assez avancées', 'Coudes pliés'], 3),
  ('ex-adv-tuck-planche', null, 'Planche groupée avancée', 'core', 'time',
   array['Épaules', 'Gainage'],
   'Même position, dos à plat et genoux éloignés du buste : le levier s’allonge.',
   array['Dos arrondi', 'Bassin qui retombe'], 4),
  ('ex-straddle-planche', null, 'Planche écartée', 'core', 'time',
   array['Épaules', 'Gainage', 'Pectoraux'],
   'Jambes tendues et écartées à l’horizontale. Dernière marche avant la planche complète.',
   array['Hanches sous la ligne des épaules', 'Apnée totale'], 5),
  ('ex-tuck-front-lever', null, 'Front lever groupé', 'pull', 'time',
   array['Dorsaux', 'Gainage'],
   'Suspendu, bras tendus, dos horizontal et genoux à la poitrine.',
   array['Bras pliés', 'Bassin plus bas que les épaules'], 2),
  ('ex-adv-tuck-front-lever', null, 'Front lever groupé avancé', 'pull', 'time',
   array['Dorsaux', 'Gainage'],
   'Dos à plat, genoux ouverts à 90°. Le bassin reste au niveau des épaules.',
   array['Rétroversion perdue', 'Épaules qui remontent'], 3),
  ('ex-straddle-front-lever', null, 'Front lever écarté', 'pull', 'time',
   array['Dorsaux', 'Gainage', 'Fessiers'],
   'Jambes tendues écartées, corps horizontal. Écarter réduit le levier.',
   array['Jambes fléchies', 'Corps en diagonale'], 4),
  ('ex-front-lever', null, 'Front lever complet', 'pull', 'time',
   array['Dorsaux', 'Gainage'],
   'Corps parfaitement horizontal, jambes serrées et tendues, bras verrouillés.',
   array['Hanches affaissées', 'Tenue trop courte comptée comme valide'], 5),
  ('ex-dip', null, 'Dips aux barres', 'push', 'reps',
   array['Triceps', 'Pectoraux', 'Épaules'],
   'Descends jusqu’à ce que les épaules passent sous les coudes, buste légèrement penché.',
   array['Descente trop profonde pour ses épaules', 'Haussement d’épaules en bas'], 3),
  ('ex-australian-row', null, 'Tirage australien', 'pull', 'reps',
   array['Dorsaux', 'Trapèzes', 'Biceps'],
   'Barre basse, corps gréé en planche inversée. Tire la poitrine vers la barre.',
   array['Bassin qui s’affaisse', 'Tirer avec les bras seuls'], 2),
  ('ex-hollow-hold', null, 'Hollow hold', 'core', 'time',
   array['Abdominaux', 'Gainage'],
   'Dos au sol, lombaires plaquées, bras et jambes tendus légèrement décollés.',
   array['Décoller le bas du dos', 'Monter les jambes trop haut'], 2),
  ('ex-nordic-curl', null, 'Nordic curl', 'legs', 'reps',
   array['Ischio-jambiers'],
   'À genoux, chevilles bloquées, descends le buste en contrôlant avec les ischios.',
   array['Plier les hanches pour tricher', 'Chute non contrôlée'], 4),
  ('ex-calf-raise', null, 'Extension mollets', 'legs', 'reps',
   array['Mollets'],
   'Sur une marche, amplitude complète en bas comme en haut, pause en contraction.',
   array['Amplitude écourtée', 'Rebonds élastiques'], 1),
  ('ex-shoulder-dislocate', null, 'Rotations d’épaules au bâton', 'mobility', 'reps',
   array['Épaules', 'Pectoraux'],
   'Bâton à bout de bras, passe-le de l’avant vers l’arrière lentement, sans douleur.',
   array['Prise trop serrée', 'Aller trop vite'], 1),
  ('ex-deep-squat-hold', null, 'Maintien squat profond', 'mobility', 'time',
   array['Hanches', 'Chevilles'],
   'Assis dans un squat complet, talons au sol, coudes contre les genoux.',
   array['Talons décollés', 'Dos totalement rond sous tension'], 1)
on conflict (id) do update set
  name            = excluded.name,
  category        = excluded.category,
  type            = excluded.type,
  muscles         = excluded.muscles,
  description     = excluded.description,
  common_mistakes = excluded.common_mistakes,
  difficulty      = excluded.difficulty;


-- ─── Barreaux des échelles ────────────────────────────────────────

insert into public.progression_steps
  (user_id, path_id, exercise_id, position, criterion_sets, criterion_reps, criterion_seconds, criterion_label) values
  (null, 'prog-pushup', 'ex-wall-pushup', 0, 3, 20, null, '3 × 20 reps'),
  (null, 'prog-pushup', 'ex-incline-pushup', 1, 3, 15, null, '3 × 15 reps'),
  (null, 'prog-pushup', 'ex-pushup', 2, 3, 20, null, '3 × 20 reps'),
  (null, 'prog-pushup', 'ex-diamond-pushup', 3, 3, 12, null, '3 × 12 reps'),
  (null, 'prog-pushup', 'ex-archer-pushup', 4, 3, 8, null, '3 × 8 reps / côté'),
  (null, 'prog-pushup', 'ex-one-arm-pushup', 5, 3, 5, null, '3 × 5 reps / côté'),
  (null, 'prog-pullup', 'ex-dead-hang', 0, 3, null, 45, '3 × 45 s'),
  (null, 'prog-pullup', 'ex-scapular-pull', 1, 3, 12, null, '3 × 12 reps'),
  (null, 'prog-pullup', 'ex-negative-pullup', 2, 5, null, 5, '5 × 5 s de descente'),
  (null, 'prog-pullup', 'ex-pullup', 3, 3, 10, null, '3 × 10 reps'),
  (null, 'prog-pullup', 'ex-archer-pullup', 4, 3, 6, null, '3 × 6 reps / côté'),
  (null, 'prog-pullup', 'ex-one-arm-pullup', 5, 3, 3, null, '3 × 3 reps / côté'),
  (null, 'prog-squat', 'ex-bodyweight-squat', 0, 3, 30, null, '3 × 30 reps'),
  (null, 'prog-squat', 'ex-split-squat', 1, 3, 12, null, '3 × 12 reps / jambe'),
  (null, 'prog-squat', 'ex-assisted-pistol', 2, 3, 10, null, '3 × 10 reps / jambe'),
  (null, 'prog-squat', 'ex-pistol-squat', 3, 3, 8, null, '3 × 8 reps / jambe'),
  (null, 'prog-squat', 'ex-weighted-pistol', 4, 3, 5, null, '3 × 5 reps + 10 kg'),
  (null, 'prog-planche', 'ex-plank', 0, 3, null, 60, '3 × 60 s'),
  (null, 'prog-planche', 'ex-frog-stand', 1, 3, null, 30, '3 × 30 s'),
  (null, 'prog-planche', 'ex-tuck-planche', 2, 3, null, 20, '3 × 20 s'),
  (null, 'prog-planche', 'ex-adv-tuck-planche', 3, 3, null, 15, '3 × 15 s'),
  (null, 'prog-planche', 'ex-straddle-planche', 4, 3, null, 10, '3 × 10 s'),
  (null, 'prog-frontlever', 'ex-tuck-front-lever', 0, 3, null, 20, '3 × 20 s'),
  (null, 'prog-frontlever', 'ex-adv-tuck-front-lever', 1, 3, null, 15, '3 × 15 s'),
  (null, 'prog-frontlever', 'ex-straddle-front-lever', 2, 3, null, 12, '3 × 12 s'),
  (null, 'prog-frontlever', 'ex-front-lever', 3, 3, null, 10, '3 × 10 s');


-- ─── Routines intégrées ───────────────────────────────────────────

insert into public.routines (id, user_id, name, level, track, category, frequency_per_week, estimated_minutes) values
  ('rt-fb-1', null, 'Fondations', 1, 'Full body', 'push', 3, 25),
  ('rt-fb-2', null, 'Socle de force', 2, 'Full body', 'push', 3, 35),
  ('rt-fb-3', null, 'Traction & dips', 3, 'Full body', 'pull', 4, 45),
  ('rt-fb-4', null, 'Skills & leviers', 4, 'Full body', 'core', 4, 55),
  ('rt-fb-5', null, 'Élite unilatéral', 5, 'Full body', 'pull', 5, 70),
  ('rt-push-1', null, 'Pousser — volume', 1, 'Pousser', 'push', 2, 30),
  ('rt-push-2', null, 'Pousser — intensité', 2, 'Pousser', 'push', 3, 40),
  ('rt-pull-1', null, 'Tirer — bases', 1, 'Tirer', 'pull', 2, 28),
  ('rt-pull-2', null, 'Tirer — tractions', 2, 'Tirer', 'pull', 3, 42)
on conflict (id) do update set
  name               = excluded.name,
  level              = excluded.level,
  track              = excluded.track,
  category           = excluded.category,
  frequency_per_week = excluded.frequency_per_week,
  estimated_minutes  = excluded.estimated_minutes;


-- ─── Exercices des routines ───────────────────────────────────────

insert into public.routine_exercises
  (user_id, routine_id, exercise_id, position, sets, target_reps, target_seconds, rest_seconds, tempo, superset_group) values
  (null, 'rt-fb-1', 'ex-incline-pushup', 0, 3, 12, null, 90, '3-0-1-0', null),
  (null, 'rt-fb-1', 'ex-australian-row', 1, 3, 10, null, 90, null, null),
  (null, 'rt-fb-1', 'ex-bodyweight-squat', 2, 3, 20, null, 60, null, null),
  (null, 'rt-fb-1', 'ex-plank', 3, 3, null, 30, 45, null, null),
  (null, 'rt-fb-2', 'ex-pushup', 0, 4, 10, null, 90, '3-1-1-0', null),
  (null, 'rt-fb-2', 'ex-negative-pullup', 1, 4, null, 5, 120, null, null),
  (null, 'rt-fb-2', 'ex-split-squat', 2, 3, 10, null, 90, null, null),
  (null, 'rt-fb-2', 'ex-hollow-hold', 3, 3, null, 30, 45, null, 'rt-fb-2-core'),
  (null, 'rt-fb-2', 'ex-calf-raise', 4, 3, 20, null, 45, null, 'rt-fb-2-core'),
  (null, 'rt-fb-3', 'ex-pullup', 0, 5, 6, null, 150, null, null),
  (null, 'rt-fb-3', 'ex-dip', 1, 4, 10, null, 120, null, null),
  (null, 'rt-fb-3', 'ex-diamond-pushup', 2, 3, 10, null, 90, null, 'rt-fb-3-push-sup'),
  (null, 'rt-fb-3', 'ex-australian-row', 3, 3, 12, null, 90, null, 'rt-fb-3-push-sup'),
  (null, 'rt-fb-3', 'ex-assisted-pistol', 4, 3, 8, null, 90, null, null),
  (null, 'rt-fb-3', 'ex-tuck-front-lever', 5, 3, null, 12, 90, null, null),
  (null, 'rt-fb-4', 'ex-tuck-planche', 0, 5, null, 15, 120, null, null),
  (null, 'rt-fb-4', 'ex-straddle-front-lever', 1, 5, null, 10, 150, null, null),
  (null, 'rt-fb-4', 'ex-archer-pullup', 2, 4, 5, null, 150, null, null),
  (null, 'rt-fb-4', 'ex-archer-pushup', 3, 4, 6, null, 120, null, null),
  (null, 'rt-fb-4', 'ex-pistol-squat', 4, 3, 6, null, 120, null, null),
  (null, 'rt-fb-4', 'ex-nordic-curl', 5, 3, 5, null, 90, null, null),
  (null, 'rt-fb-5', 'ex-one-arm-pullup', 0, 5, 2, null, 180, null, null),
  (null, 'rt-fb-5', 'ex-one-arm-pushup', 1, 5, 4, null, 150, null, null),
  (null, 'rt-fb-5', 'ex-straddle-planche', 2, 5, null, 8, 150, null, null),
  (null, 'rt-fb-5', 'ex-front-lever', 3, 5, null, 8, 180, null, null),
  (null, 'rt-fb-5', 'ex-weighted-pistol', 4, 4, 5, null, 120, null, null),
  (null, 'rt-push-1', 'ex-pushup', 0, 5, 12, null, 90, '2-0-1-0', null),
  (null, 'rt-push-1', 'ex-dip', 1, 4, 8, null, 120, null, null),
  (null, 'rt-push-1', 'ex-shoulder-dislocate', 2, 2, 10, null, 30, null, null),
  (null, 'rt-push-2', 'ex-diamond-pushup', 0, 5, 10, null, 120, null, null),
  (null, 'rt-push-2', 'ex-archer-pushup', 1, 4, 5, null, 120, null, null),
  (null, 'rt-push-2', 'ex-frog-stand', 2, 4, null, 20, 90, null, null),
  (null, 'rt-pull-1', 'ex-dead-hang', 0, 4, null, 30, 60, null, null),
  (null, 'rt-pull-1', 'ex-scapular-pull', 1, 4, 10, null, 60, null, null),
  (null, 'rt-pull-1', 'ex-australian-row', 2, 4, 12, null, 90, null, null),
  (null, 'rt-pull-2', 'ex-pullup', 0, 6, 5, null, 150, null, null),
  (null, 'rt-pull-2', 'ex-tuck-front-lever', 1, 4, null, 15, 120, null, null),
  (null, 'rt-pull-2', 'ex-australian-row', 2, 3, 15, null, 90, null, null);


commit;
