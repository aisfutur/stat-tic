import type { Routine } from '../types'

/**
 * Routines intégrées, organisées en pistes (`track`) de 5 niveaux.
 * Les exercices partageant un `supersetGroup` s'enchaînent sans repos.
 */
export const ROUTINES: Routine[] = [
  // ── Piste full-body ───────────────────────────────────────────────
  {
    id: 'rt-fb-1',
    name: 'Fondations',
    level: 1,
    track: 'Full body',
    category: 'push',
    frequencyPerWeek: 3,
    estimatedMinutes: 25,
    exercises: [
      { exerciseId: 'ex-incline-pushup', sets: 3, targetReps: 12, restSeconds: 90, tempo: '3-0-1-0' },
      { exerciseId: 'ex-australian-row', sets: 3, targetReps: 10, restSeconds: 90 },
      { exerciseId: 'ex-bodyweight-squat', sets: 3, targetReps: 20, restSeconds: 60 },
      { exerciseId: 'ex-plank', sets: 3, targetSeconds: 30, restSeconds: 45 },
    ],
  },
  {
    id: 'rt-fb-2',
    name: 'Socle de force',
    level: 2,
    track: 'Full body',
    category: 'push',
    frequencyPerWeek: 3,
    estimatedMinutes: 35,
    exercises: [
      { exerciseId: 'ex-pushup', sets: 4, targetReps: 10, restSeconds: 90, tempo: '3-1-1-0' },
      { exerciseId: 'ex-negative-pullup', sets: 4, targetSeconds: 5, restSeconds: 120 },
      { exerciseId: 'ex-split-squat', sets: 3, targetReps: 10, restSeconds: 90 },
      { exerciseId: 'ex-hollow-hold', sets: 3, targetSeconds: 30, restSeconds: 45, supersetGroup: 'core' },
      { exerciseId: 'ex-calf-raise', sets: 3, targetReps: 20, restSeconds: 45, supersetGroup: 'core' },
    ],
  },
  {
    id: 'rt-fb-3',
    name: 'Traction & dips',
    level: 3,
    track: 'Full body',
    category: 'pull',
    frequencyPerWeek: 4,
    estimatedMinutes: 45,
    exercises: [
      { exerciseId: 'ex-pullup', sets: 5, targetReps: 6, restSeconds: 150 },
      { exerciseId: 'ex-dip', sets: 4, targetReps: 10, restSeconds: 120 },
      { exerciseId: 'ex-diamond-pushup', sets: 3, targetReps: 10, restSeconds: 90, supersetGroup: 'push-sup' },
      { exerciseId: 'ex-australian-row', sets: 3, targetReps: 12, restSeconds: 90, supersetGroup: 'push-sup' },
      { exerciseId: 'ex-assisted-pistol', sets: 3, targetReps: 8, restSeconds: 90 },
      { exerciseId: 'ex-tuck-front-lever', sets: 3, targetSeconds: 12, restSeconds: 90 },
    ],
  },
  {
    id: 'rt-fb-4',
    name: 'Skills & leviers',
    level: 4,
    track: 'Full body',
    category: 'core',
    frequencyPerWeek: 4,
    estimatedMinutes: 55,
    exercises: [
      { exerciseId: 'ex-tuck-planche', sets: 5, targetSeconds: 15, restSeconds: 120 },
      { exerciseId: 'ex-straddle-front-lever', sets: 5, targetSeconds: 10, restSeconds: 150 },
      { exerciseId: 'ex-archer-pullup', sets: 4, targetReps: 5, restSeconds: 150 },
      { exerciseId: 'ex-archer-pushup', sets: 4, targetReps: 6, restSeconds: 120 },
      { exerciseId: 'ex-pistol-squat', sets: 3, targetReps: 6, restSeconds: 120 },
      { exerciseId: 'ex-nordic-curl', sets: 3, targetReps: 5, restSeconds: 90 },
    ],
  },
  {
    id: 'rt-fb-5',
    name: 'Élite unilatéral',
    level: 5,
    track: 'Full body',
    category: 'pull',
    frequencyPerWeek: 5,
    estimatedMinutes: 70,
    exercises: [
      { exerciseId: 'ex-one-arm-pullup', sets: 5, targetReps: 2, restSeconds: 180 },
      { exerciseId: 'ex-one-arm-pushup', sets: 5, targetReps: 4, restSeconds: 150 },
      { exerciseId: 'ex-straddle-planche', sets: 5, targetSeconds: 8, restSeconds: 150 },
      { exerciseId: 'ex-front-lever', sets: 5, targetSeconds: 8, restSeconds: 180 },
      { exerciseId: 'ex-weighted-pistol', sets: 4, targetReps: 5, restSeconds: 120 },
    ],
  },

  // ── Piste pousser ─────────────────────────────────────────────────
  {
    id: 'rt-push-1',
    name: 'Pousser — volume',
    level: 1,
    track: 'Pousser',
    category: 'push',
    frequencyPerWeek: 2,
    estimatedMinutes: 30,
    exercises: [
      { exerciseId: 'ex-pushup', sets: 5, targetReps: 12, restSeconds: 90, tempo: '2-0-1-0' },
      { exerciseId: 'ex-dip', sets: 4, targetReps: 8, restSeconds: 120 },
      { exerciseId: 'ex-shoulder-dislocate', sets: 2, targetReps: 10, restSeconds: 30 },
    ],
  },
  {
    id: 'rt-push-2',
    name: 'Pousser — intensité',
    level: 2,
    track: 'Pousser',
    category: 'push',
    frequencyPerWeek: 3,
    estimatedMinutes: 40,
    exercises: [
      { exerciseId: 'ex-diamond-pushup', sets: 5, targetReps: 10, restSeconds: 120 },
      { exerciseId: 'ex-archer-pushup', sets: 4, targetReps: 5, restSeconds: 120 },
      { exerciseId: 'ex-frog-stand', sets: 4, targetSeconds: 20, restSeconds: 90 },
    ],
  },

  // ── Piste tirer ───────────────────────────────────────────────────
  {
    id: 'rt-pull-1',
    name: 'Tirer — bases',
    level: 1,
    track: 'Tirer',
    category: 'pull',
    frequencyPerWeek: 2,
    estimatedMinutes: 28,
    exercises: [
      { exerciseId: 'ex-dead-hang', sets: 4, targetSeconds: 30, restSeconds: 60 },
      { exerciseId: 'ex-scapular-pull', sets: 4, targetReps: 10, restSeconds: 60 },
      { exerciseId: 'ex-australian-row', sets: 4, targetReps: 12, restSeconds: 90 },
    ],
  },
  {
    id: 'rt-pull-2',
    name: 'Tirer — tractions',
    level: 2,
    track: 'Tirer',
    category: 'pull',
    frequencyPerWeek: 3,
    estimatedMinutes: 42,
    exercises: [
      { exerciseId: 'ex-pullup', sets: 6, targetReps: 5, restSeconds: 150 },
      { exerciseId: 'ex-tuck-front-lever', sets: 4, targetSeconds: 15, restSeconds: 120 },
      { exerciseId: 'ex-australian-row', sets: 3, targetReps: 15, restSeconds: 90 },
    ],
  },
]

export const ROUTINE_TRACKS = ['Full body', 'Pousser', 'Tirer'] as const
