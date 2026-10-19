import type { ProgressionPath } from '../types'

/**
 * Échelles de progression : chaque étape porte le critère chiffré
 * à valider avant de passer au barreau suivant.
 *
 * `family` regroupe les échelles par famille d'entraînement à l'écran,
 * sans changer la catégorie musculaire utilisée par les statistiques.
 * Les critères des maintiens sont des secondes par série, côté par côté
 * quand le mouvement est unilatéral.
 */
export const PROGRESSIONS: ProgressionPath[] = [
  // ╔═ Force de base ═══════════════════════════════════════════════╗
  {
    id: 'prog-pushup',
    name: 'Pompe → un bras',
    category: 'push',
    family: 'Force de base',
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
    family: 'Force de base',
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
    family: 'Force de base',
    steps: [
      { exerciseId: 'ex-bodyweight-squat', criterion: { sets: 3, reps: 30, label: '3 × 30 reps' } },
      { exerciseId: 'ex-split-squat', criterion: { sets: 3, reps: 12, label: '3 × 12 reps / jambe' } },
      { exerciseId: 'ex-assisted-pistol', criterion: { sets: 3, reps: 10, label: '3 × 10 reps / jambe' } },
      { exerciseId: 'ex-pistol-squat', criterion: { sets: 3, reps: 8, label: '3 × 8 reps / jambe' } },
      { exerciseId: 'ex-weighted-pistol', criterion: { sets: 3, reps: 5, label: '3 × 5 reps + 10 kg' } },
    ],
  },

  // ╔═ Statiques : planche ══════════════════════════════════════════╗
  {
    id: 'prog-planche',
    name: 'Planche',
    category: 'push',
    family: 'Statiques',
    steps: [
      { exerciseId: 'ex-plank', criterion: { sets: 3, seconds: 60, label: '3 × 60 s' } },
      { exerciseId: 'ex-planche-lean', criterion: { sets: 3, seconds: 30, label: '3 × 30 s' } },
      { exerciseId: 'ex-frog-stand', criterion: { sets: 3, seconds: 30, label: '3 × 30 s' } },
      { exerciseId: 'ex-tuck-planche', criterion: { sets: 3, seconds: 20, label: '3 × 20 s' } },
      { exerciseId: 'ex-adv-tuck-planche', criterion: { sets: 3, seconds: 15, label: '3 × 15 s' } },
      { exerciseId: 'ex-straddle-planche', criterion: { sets: 3, seconds: 12, label: '3 × 12 s' } },
      { exerciseId: 'ex-half-lay-planche', criterion: { sets: 3, seconds: 10, label: '3 × 10 s' } },
      { exerciseId: 'ex-full-planche', criterion: { sets: 3, seconds: 10, label: '3 × 10 s' } },
    ],
  },
  {
    id: 'prog-planche-pushup',
    name: 'Planche : pompes',
    category: 'push',
    family: 'Statiques',
    steps: [
      { exerciseId: 'ex-pseudo-planche-pushup', criterion: { sets: 3, reps: 12, label: '3 × 12 reps' } },
      { exerciseId: 'ex-tuck-planche-pushup', criterion: { sets: 3, reps: 8, label: '3 × 8 reps' } },
      { exerciseId: 'ex-adv-tuck-planche-pushup', criterion: { sets: 3, reps: 6, label: '3 × 6 reps' } },
      { exerciseId: 'ex-straddle-planche-pushup', criterion: { sets: 3, reps: 5, label: '3 × 5 reps' } },
      { exerciseId: 'ex-full-planche-pushup', criterion: { sets: 3, reps: 3, label: '3 × 3 reps' } },
    ],
  },
  {
    id: 'prog-maltese',
    name: 'Maltese',
    category: 'push',
    family: 'Statiques',
    steps: [
      { exerciseId: 'ex-maltese-lean', criterion: { sets: 3, seconds: 20, label: '3 × 20 s' } },
      { exerciseId: 'ex-tuck-maltese', criterion: { sets: 3, seconds: 10, label: '3 × 10 s' } },
      { exerciseId: 'ex-straddle-maltese', criterion: { sets: 3, seconds: 8, label: '3 × 8 s' } },
      { exerciseId: 'ex-maltese', criterion: { sets: 3, seconds: 5, label: '3 × 5 s' } },
    ],
  },
  {
    id: 'prog-cross',
    name: 'Anneaux : croix de fer',
    category: 'push',
    family: 'Statiques',
    steps: [
      { exerciseId: 'ex-ring-support-hold', criterion: { sets: 3, seconds: 60, label: '3 × 60 s' } },
      { exerciseId: 'ex-rto-support-hold', criterion: { sets: 3, seconds: 30, label: '3 × 30 s' } },
      { exerciseId: 'ex-assisted-iron-cross', criterion: { sets: 3, seconds: 15, label: '3 × 15 s' } },
      { exerciseId: 'ex-l-cross', criterion: { sets: 3, seconds: 10, label: '3 × 10 s' } },
      { exerciseId: 'ex-iron-cross', criterion: { sets: 3, seconds: 8, label: '3 × 8 s' } },
      { exerciseId: 'ex-inverted-cross', criterion: { sets: 3, seconds: 8, label: '3 × 8 s' } },
    ],
  },
  {
    id: 'prog-victorian',
    name: 'Victorian cross',
    category: 'push',
    family: 'Statiques',
    steps: [
      { exerciseId: 'ex-tuck-victorian', criterion: { sets: 3, seconds: 10, label: '3 × 10 s' } },
      { exerciseId: 'ex-adv-tuck-victorian', criterion: { sets: 3, seconds: 8, label: '3 × 8 s' } },
      { exerciseId: 'ex-straddle-victorian', criterion: { sets: 3, seconds: 6, label: '3 × 6 s' } },
      { exerciseId: 'ex-victorian-cross', criterion: { sets: 3, seconds: 5, label: '3 × 5 s' } },
    ],
  },

  // ╔═ Statiques : leviers suspendus ════════════════════════════════╗
  {
    id: 'prog-frontlever',
    name: 'Front lever',
    category: 'pull',
    family: 'Statiques',
    steps: [
      { exerciseId: 'ex-inverted-hang', criterion: { sets: 3, seconds: 45, label: '3 × 45 s' } },
      { exerciseId: 'ex-tuck-front-lever', criterion: { sets: 3, seconds: 20, label: '3 × 20 s' } },
      { exerciseId: 'ex-adv-tuck-front-lever', criterion: { sets: 3, seconds: 15, label: '3 × 15 s' } },
      { exerciseId: 'ex-straddle-front-lever', criterion: { sets: 3, seconds: 12, label: '3 × 12 s' } },
      { exerciseId: 'ex-half-lay-front-lever', criterion: { sets: 3, seconds: 10, label: '3 × 10 s' } },
      { exerciseId: 'ex-front-lever', criterion: { sets: 3, seconds: 10, label: '3 × 10 s' } },
    ],
  },
  {
    id: 'prog-frontlever-dyn',
    name: 'Front lever : raises & tractions',
    category: 'pull',
    family: 'Statiques',
    steps: [
      { exerciseId: 'ex-tuck-front-lever-raise', criterion: { sets: 3, reps: 8, label: '3 × 8 reps' } },
      { exerciseId: 'ex-straddle-front-lever-raise', criterion: { sets: 3, reps: 6, label: '3 × 6 reps' } },
      { exerciseId: 'ex-front-lever-raise', criterion: { sets: 3, reps: 5, label: '3 × 5 reps' } },
      { exerciseId: 'ex-tuck-front-lever-pullup', criterion: { sets: 3, reps: 6, label: '3 × 6 reps' } },
      { exerciseId: 'ex-straddle-front-lever-pullup', criterion: { sets: 3, reps: 5, label: '3 × 5 reps' } },
      { exerciseId: 'ex-front-lever-pullup', criterion: { sets: 3, reps: 3, label: '3 × 3 reps' } },
    ],
  },
  {
    id: 'prog-frontlever-grips',
    name: 'Front lever : prises & un bras',
    category: 'pull',
    family: 'Statiques',
    steps: [
      { exerciseId: 'ex-front-lever-neutral-grip', criterion: { sets: 3, seconds: 10, label: '3 × 10 s' } },
      { exerciseId: 'ex-front-lever-supinated-grip', criterion: { sets: 3, seconds: 8, label: '3 × 8 s' } },
      { exerciseId: 'ex-wide-front-lever', criterion: { sets: 3, seconds: 8, label: '3 × 8 s' } },
      { exerciseId: 'ex-tuck-one-arm-front-lever', criterion: { sets: 3, seconds: 10, label: '3 × 10 s / bras' } },
      { exerciseId: 'ex-straddle-one-arm-front-lever', criterion: { sets: 3, seconds: 8, label: '3 × 8 s / bras' } },
      { exerciseId: 'ex-one-arm-front-lever', criterion: { sets: 3, seconds: 5, label: '3 × 5 s / bras' } },
    ],
  },
  {
    id: 'prog-backlever',
    name: 'Back lever',
    category: 'pull',
    family: 'Statiques',
    steps: [
      { exerciseId: 'ex-german-hang', criterion: { sets: 3, seconds: 45, label: '3 × 45 s' } },
      { exerciseId: 'ex-skin-the-cat', criterion: { sets: 3, reps: 5, label: '3 × 5 reps' } },
      { exerciseId: 'ex-tuck-back-lever', criterion: { sets: 3, seconds: 20, label: '3 × 20 s' } },
      { exerciseId: 'ex-adv-tuck-back-lever', criterion: { sets: 3, seconds: 15, label: '3 × 15 s' } },
      { exerciseId: 'ex-straddle-back-lever', criterion: { sets: 3, seconds: 15, label: '3 × 15 s' } },
      { exerciseId: 'ex-back-lever', criterion: { sets: 3, seconds: 12, label: '3 × 12 s' } },
      { exerciseId: 'ex-supinated-back-lever', criterion: { sets: 3, seconds: 10, label: '3 × 10 s' } },
    ],
  },
  {
    id: 'prog-oa-hang',
    name: 'Suspension → un bras',
    category: 'pull',
    family: 'Statiques',
    steps: [
      { exerciseId: 'ex-active-hang', criterion: { sets: 3, seconds: 45, label: '3 × 45 s' } },
      { exerciseId: 'ex-oa-passive-hang', criterion: { sets: 3, seconds: 20, label: '3 × 20 s / bras' } },
      { exerciseId: 'ex-oa-active-hang', criterion: { sets: 3, seconds: 15, label: '3 × 15 s / bras' } },
      { exerciseId: 'ex-oa-scapular-pull', criterion: { sets: 3, reps: 8, label: '3 × 8 reps / bras' } },
      { exerciseId: 'ex-oa-bent-arm-hang', criterion: { sets: 3, seconds: 10, label: '3 × 10 s / bras' } },
    ],
  },

  // ╔═ Statiques : compression & gainage ═══════════════════════════╗
  {
    id: 'prog-lsit',
    name: 'L-sit → V-sit → Manna',
    category: 'core',
    family: 'Statiques',
    steps: [
      { exerciseId: 'ex-tuck-sit', criterion: { sets: 3, seconds: 30, label: '3 × 30 s' } },
      { exerciseId: 'ex-one-leg-l-sit', criterion: { sets: 3, seconds: 20, label: '3 × 20 s / jambe' } },
      { exerciseId: 'ex-l-sit', criterion: { sets: 3, seconds: 30, label: '3 × 30 s' } },
      { exerciseId: 'ex-high-l-sit', criterion: { sets: 3, seconds: 15, label: '3 × 15 s' } },
      { exerciseId: 'ex-v-sit', criterion: { sets: 3, seconds: 10, label: '3 × 10 s' } },
      { exerciseId: 'ex-i-sit', criterion: { sets: 3, seconds: 8, label: '3 × 8 s' } },
      { exerciseId: 'ex-manna', criterion: { sets: 3, seconds: 5, label: '3 × 5 s' } },
    ],
  },
  {
    id: 'prog-dragonflag',
    name: 'Dragon flag',
    category: 'core',
    family: 'Statiques',
    steps: [
      { exerciseId: 'ex-hollow-hold', criterion: { sets: 3, seconds: 45, label: '3 × 45 s' } },
      { exerciseId: 'ex-tuck-dragon-flag', criterion: { sets: 3, seconds: 30, label: '3 × 30 s' } },
      { exerciseId: 'ex-one-leg-dragon-flag', criterion: { sets: 3, seconds: 20, label: '3 × 20 s / jambe' } },
      { exerciseId: 'ex-straddle-dragon-flag', criterion: { sets: 3, seconds: 15, label: '3 × 15 s' } },
      { exerciseId: 'ex-dragon-flag', criterion: { sets: 3, seconds: 12, label: '3 × 12 s' } },
    ],
  },
  {
    id: 'prog-humanflag',
    name: 'Drapeau humain',
    category: 'core',
    family: 'Statiques',
    steps: [
      { exerciseId: 'ex-flag-support-hold', criterion: { sets: 3, seconds: 20, label: '3 × 20 s / côté' } },
      { exerciseId: 'ex-chamber-hold', criterion: { sets: 3, seconds: 15, label: '3 × 15 s / côté' } },
      { exerciseId: 'ex-tuck-flag', criterion: { sets: 3, seconds: 10, label: '3 × 10 s / côté' } },
      { exerciseId: 'ex-straddle-flag', criterion: { sets: 3, seconds: 10, label: '3 × 10 s / côté' } },
      { exerciseId: 'ex-human-flag', criterion: { sets: 3, seconds: 8, label: '3 × 8 s / côté' } },
    ],
  },
  {
    id: 'prog-elbowlever',
    name: 'Elbow lever',
    category: 'core',
    family: 'Statiques',
    steps: [
      { exerciseId: 'ex-crow-pose', criterion: { sets: 3, seconds: 30, label: '3 × 30 s' } },
      { exerciseId: 'ex-straddle-elbow-lever', criterion: { sets: 3, seconds: 20, label: '3 × 20 s' } },
      { exerciseId: 'ex-elbow-lever', criterion: { sets: 3, seconds: 20, label: '3 × 20 s' } },
      { exerciseId: 'ex-one-arm-elbow-lever', criterion: { sets: 3, seconds: 10, label: '3 × 10 s / bras' } },
    ],
  },

  // ╔═ Équilibre & presses ═════════════════════════════════════════╗
  {
    id: 'prog-handstand',
    name: 'ATR → un bras',
    category: 'push',
    family: 'Équilibre & presses',
    steps: [
      { exerciseId: 'ex-headstand', criterion: { sets: 3, seconds: 45, label: '3 × 45 s' } },
      { exerciseId: 'ex-wall-plank-hold', criterion: { sets: 3, seconds: 45, label: '3 × 45 s' } },
      { exerciseId: 'ex-wall-handstand-chest', criterion: { sets: 3, seconds: 45, label: '3 × 45 s' } },
      { exerciseId: 'ex-handstand-heel-pulls', criterion: { sets: 3, reps: 8, label: '3 × 8 décollés' } },
      { exerciseId: 'ex-freestanding-handstand', criterion: { sets: 3, seconds: 60, label: '3 × 60 s' } },
      { exerciseId: 'ex-handstand-shoulder-taps', criterion: { sets: 3, reps: 10, label: '3 × 10 touches' } },
      { exerciseId: 'ex-one-arm-handstand-lean', criterion: { sets: 3, seconds: 20, label: '3 × 20 s / bras' } },
      { exerciseId: 'ex-one-arm-handstand-fingertip', criterion: { sets: 3, seconds: 15, label: '3 × 15 s / bras' } },
      { exerciseId: 'ex-one-arm-handstand', criterion: { sets: 3, seconds: 10, label: '3 × 10 s / bras' } },
    ],
  },
  {
    id: 'prog-hspu',
    name: 'HSPU → 90°',
    category: 'push',
    family: 'Équilibre & presses',
    steps: [
      { exerciseId: 'ex-pike-pushup', criterion: { sets: 3, reps: 12, label: '3 × 12 reps' } },
      { exerciseId: 'ex-elevated-pike-pushup', criterion: { sets: 3, reps: 10, label: '3 × 10 reps' } },
      { exerciseId: 'ex-wall-hspu', criterion: { sets: 3, reps: 8, label: '3 × 8 reps' } },
      { exerciseId: 'ex-deficit-wall-hspu', criterion: { sets: 3, reps: 6, label: '3 × 6 reps' } },
      { exerciseId: 'ex-freestanding-hspu', criterion: { sets: 3, reps: 5, label: '3 × 5 reps' } },
      { exerciseId: 'ex-90-degree-hold', criterion: { sets: 3, seconds: 10, label: '3 × 10 s' } },
      { exerciseId: 'ex-90-degree-hspu', criterion: { sets: 3, reps: 3, label: '3 × 3 reps' } },
    ],
  },
  {
    id: 'prog-press-handstand',
    name: 'Press → ATR & planche press',
    category: 'push',
    family: 'Équilibre & presses',
    steps: [
      { exerciseId: 'ex-tuck-press-handstand', criterion: { sets: 3, reps: 5, label: '3 × 5 reps' } },
      { exerciseId: 'ex-straddle-press-handstand', criterion: { sets: 3, reps: 5, label: '3 × 5 reps' } },
      { exerciseId: 'ex-pike-press-handstand', criterion: { sets: 3, reps: 3, label: '3 × 3 reps' } },
      { exerciseId: 'ex-tuck-planche-press', criterion: { sets: 3, reps: 3, label: '3 × 3 reps' } },
      { exerciseId: 'ex-straddle-planche-press', criterion: { sets: 3, reps: 3, label: '3 × 3 reps' } },
      { exerciseId: 'ex-full-planche-press', criterion: { sets: 3, reps: 2, label: '3 × 2 reps' } },
    ],
  },

  // ╔═ Mobilité ════════════════════════════════════════════════════╗
  {
    id: 'prog-compression',
    name: 'Compression & pancake',
    category: 'mobility',
    family: 'Mobilité',
    steps: [
      { exerciseId: 'ex-seated-pike-compression', criterion: { sets: 3, seconds: 30, label: '3 × 30 s' } },
      { exerciseId: 'ex-pancake-hold', criterion: { sets: 3, seconds: 45, label: '3 × 45 s' } },
      { exerciseId: 'ex-pike-compression-lift', criterion: { sets: 3, reps: 8, label: '3 × 8 reps' } },
      { exerciseId: 'ex-parallettes-compression-hold', criterion: { sets: 3, seconds: 15, label: '3 × 15 s' } },
    ],
  },
]

export const PROGRESSION_BY_ID: Record<string, ProgressionPath> = Object.fromEntries(
  PROGRESSIONS.map((p) => [p.id, p]),
)

/** Familles présentes, dans l'ordre d'apparition des échelles. */
export const PROGRESSION_FAMILIES: string[] = [
  ...new Set(PROGRESSIONS.map((p) => p.family ?? 'Autres')),
]
