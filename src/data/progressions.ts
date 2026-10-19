import type { ProgressionPath } from '../types'

/**
 * Échelles de progression : chaque étape porte le critère chiffré
 * à valider avant de passer au barreau suivant.
 */
export const PROGRESSIONS: ProgressionPath[] = [
  {
    id: 'prog-pushup',
    name: 'Pompe → un bras',
    category: 'push',
    steps: [
      { exerciseId: 'ex-wall-pushup', criterion: { sets: 3, reps: 20, label: '3 × 20 reps' } },
      { exerciseId: 'ex-incline-pushup', criterion: { sets: 3, reps: 15, label: '3 × 15 reps' } },
      { exerciseId: 'ex-pushup', criterion: { sets: 3, reps: 20, label: '3 × 20 reps' } },
      { exerciseId: 'ex-diamond-pushup', criterion: { sets: 3, reps: 12, label: '3 × 12 reps' } },
      { exerciseId: 'ex-archer-pushup', criterion: { sets: 3, reps: 8, label: '3 × 8 reps / côté' } },
      { exerciseId: 'ex-one-arm-pushup', criterion: { sets: 3, reps: 5, label: '3 × 5 reps / côté' } },
    ],
  },
  {
    id: 'prog-pullup',
    name: 'Traction → un bras',
    category: 'pull',
    steps: [
      { exerciseId: 'ex-dead-hang', criterion: { sets: 3, seconds: 45, label: '3 × 45 s' } },
      { exerciseId: 'ex-scapular-pull', criterion: { sets: 3, reps: 12, label: '3 × 12 reps' } },
      { exerciseId: 'ex-negative-pullup', criterion: { sets: 5, seconds: 5, label: '5 × 5 s de descente' } },
      { exerciseId: 'ex-pullup', criterion: { sets: 3, reps: 10, label: '3 × 10 reps' } },
      { exerciseId: 'ex-archer-pullup', criterion: { sets: 3, reps: 6, label: '3 × 6 reps / côté' } },
      { exerciseId: 'ex-one-arm-pullup', criterion: { sets: 3, reps: 3, label: '3 × 3 reps / côté' } },
    ],
  },
  {
    id: 'prog-squat',
    name: 'Squat → pistol lesté',
    category: 'legs',
    steps: [
      { exerciseId: 'ex-bodyweight-squat', criterion: { sets: 3, reps: 30, label: '3 × 30 reps' } },
      { exerciseId: 'ex-split-squat', criterion: { sets: 3, reps: 12, label: '3 × 12 reps / jambe' } },
      { exerciseId: 'ex-assisted-pistol', criterion: { sets: 3, reps: 10, label: '3 × 10 reps / jambe' } },
      { exerciseId: 'ex-pistol-squat', criterion: { sets: 3, reps: 8, label: '3 × 8 reps / jambe' } },
      { exerciseId: 'ex-weighted-pistol', criterion: { sets: 3, reps: 5, label: '3 × 5 reps + 10 kg' } },
    ],
  },
  {
    id: 'prog-planche',
    name: 'Planche',
    category: 'core',
    steps: [
      { exerciseId: 'ex-plank', criterion: { sets: 3, seconds: 60, label: '3 × 60 s' } },
      { exerciseId: 'ex-frog-stand', criterion: { sets: 3, seconds: 30, label: '3 × 30 s' } },
      { exerciseId: 'ex-tuck-planche', criterion: { sets: 3, seconds: 20, label: '3 × 20 s' } },
      { exerciseId: 'ex-adv-tuck-planche', criterion: { sets: 3, seconds: 15, label: '3 × 15 s' } },
      { exerciseId: 'ex-straddle-planche', criterion: { sets: 3, seconds: 10, label: '3 × 10 s' } },
    ],
  },
  {
    id: 'prog-frontlever',
    name: 'Front lever',
    category: 'pull',
    steps: [
      { exerciseId: 'ex-tuck-front-lever', criterion: { sets: 3, seconds: 20, label: '3 × 20 s' } },
      { exerciseId: 'ex-adv-tuck-front-lever', criterion: { sets: 3, seconds: 15, label: '3 × 15 s' } },
      { exerciseId: 'ex-straddle-front-lever', criterion: { sets: 3, seconds: 12, label: '3 × 12 s' } },
      { exerciseId: 'ex-front-lever', criterion: { sets: 3, seconds: 10, label: '3 × 10 s' } },
    ],
  },
]

export const PROGRESSION_BY_ID: Record<string, ProgressionPath> = Object.fromEntries(
  PROGRESSIONS.map((p) => [p.id, p]),
)
