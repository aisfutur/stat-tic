import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type {
  AppState,
  Exercise,
  Routine,
  Session,
  SessionExercise,
  SetEntry,
  UserProgress,
} from '../types'
import { allExercises, getExercise, setCustomExercises } from '../data/exercises'
import { ROUTINES } from '../data/routines'
import { localRepository, parseImportedState, type Repository } from '../data/repository'
import { getSyncStatus, subscribeSyncStatus, type SyncStatus } from '../data/syncStatus'
import { makeEmptyState, makeSeedState } from '../data/seed'
import { toDayKey, uid } from '../lib/utils'

/** Champs saisis dans le formulaire « nouvel exercice ». */
export interface NewExerciseInput {
  name: string
  category: Exercise['category']
  type: Exercise['type']
  muscles?: string[]
  description?: string
  difficulty?: Exercise['difficulty']
}

interface DataContextValue {
  state: AppState
  loading: boolean
  /** Résultat de la dernière écriture : `error` = rien n'est enregistré. */
  syncStatus: SyncStatus
  /** Rejoue l'écriture en attente après un échec. */
  retrySave(): void
  /** Routines intégrées + routines personnalisées. */
  routines: Routine[]
  /** Catalogue intégré + exercices perso. */
  exercises: Exercise[]
  activeRoutine?: Routine
  progressFor(pathId: string): UserProgress

  // Séances
  startSession(routineId?: string, name?: string): Session
  cancelSession(): void
  finishSession(): Session | undefined
  addExerciseToSession(exerciseId: string): void
  removeExerciseFromSession(sessionExerciseId: string): void
  addSet(sessionExerciseId: string): void
  updateSet(sessionExerciseId: string, setId: string, patch: Partial<SetEntry>): void
  removeSet(sessionExerciseId: string, setId: string): void
  setExerciseNotes(sessionExerciseId: string, notes: string): void
  deleteSession(sessionId: string): void

  // Progressions
  setProgressStep(pathId: string, step: number): void

  // Routines
  setActiveRoutine(routineId: string): void
  addCustomRoutine(routine: Omit<Routine, 'id' | 'custom'>): Routine
  deleteCustomRoutine(routineId: string): void

  // Exercices perso
  addCustomExercise(input: NewExerciseInput): Exercise
  deleteCustomExercise(exerciseId: string): void
  /** Vrai si l'exercice est référencé par une séance ou une routine perso. */
  isExerciseInUse(exerciseId: string): boolean

  // Réglages & données
  setFavoriteChartExercise(exerciseId: string): void
  setUserName(name: string): void
  exportData(): string
  importData(json: string): void
  /** Efface séances, progressions et perso ; garde le nom de l'athlète. */
  resetData(): void
  /** Charge l'historique de démonstration, à la demande explicite. */
  loadDemoData(): void
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({
  children,
  repository = localRepository,
}: {
  children: ReactNode
  repository?: Repository
}) {
  const [state, setState] = useState<AppState>(makeEmptyState)
  const [loading, setLoading] = useState(true)
  // Évite d'écraser le stockage avec l'état vide avant le chargement initial.
  const hydrated = useRef(false)

  useEffect(() => {
    let cancelled = false
    repository
      .load()
      .then((loaded) => {
        if (cancelled) return
        setState(loaded)
        hydrated.current = true
        setLoading(false)
      })
      .catch((err) => {
        // Backend injoignable : on affiche l'app vide plutôt qu'un écran de
        // chargement infini, et `hydrated` reste faux pour ne rien écraser.
        console.error('[barre] chargement des données impossible', err)
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [repository])

  // Certains changements ne peuvent pas attendre le regroupement des
  // écritures (700 ms côté Supabase) : une séance terminée doit partir tout de
  // suite, sinon un téléphone verrouillé dans la seconde la perd.
  const flushAfterSave = useRef(false)

  useEffect(() => {
    if (!hydrated.current) return
    if (flushAfterSave.current) {
      flushAfterSave.current = false
      // Enchaîné sur `save()` plutôt qu'appelé juste après : `flush()` ne doit
      // vider la file qu'une fois le nouvel état déposé dedans.
      void repository.save(state).then(() => repository.flush())
      return
    }
    void repository.save(state)
  }, [state, repository])

  const syncStatus = useSyncExternalStore(subscribeSyncStatus, getSyncStatus)

  const retrySave = useCallback(() => {
    void repository.flush()
  }, [repository])

  const routines = useMemo(
    () => [...ROUTINES, ...state.customRoutines],
    [state.customRoutines],
  )

  // Publie les exercices perso dans le registre du catalogue *pendant* le
  // rendu : les enfants (et les helpers non-React de `lib/stats.ts`) doivent
  // pouvoir résoudre un identifiant perso dès ce même rendu, ce qu'un
  // `useEffect` — exécuté après — ne garantirait pas.
  // Nommé `catalogue` et non `exercises` : `startSession` déclare déjà un
  // `exercises` local, qui est une liste d'exercices DE SÉANCE.
  const catalogue = useMemo(() => {
    setCustomExercises(state.customExercises)
    return allExercises()
  }, [state.customExercises])

  const activeRoutine = useMemo(
    () => routines.find((r) => r.id === state.activeRoutineId),
    [routines, state.activeRoutineId],
  )

  const progressFor = useCallback(
    (pathId: string): UserProgress =>
      state.progress.find((p) => p.pathId === pathId) ?? {
        pathId,
        currentStep: 0,
        unlockedAt: {},
      },
    [state.progress],
  )

  /** Crée une séance à partir d'une routine (ou vide) et la rend active. */
  const startSession = useCallback<DataContextValue['startSession']>(
    (routineId, name) => {
      const routine = routineId ? routines.find((r) => r.id === routineId) : undefined
      const exercises: SessionExercise[] = (routine?.exercises ?? []).map((re) => {
        const exercise = getExercise(re.exerciseId)
        const sets: SetEntry[] = Array.from({ length: re.sets }, () => ({
          id: uid('set'),
          weight: 0,
          // Les cibles de la routine pré-remplissent les champs : l'athlète
          // n'a qu'à corriger ce qui a réellement été fait.
          ...(exercise?.type === 'time'
            ? { seconds: re.targetSeconds ?? 20 }
            : { reps: re.targetReps ?? 8 }),
          tempo: re.tempo,
          completed: false,
        }))
        return {
          id: uid('sex'),
          exerciseId: re.exerciseId,
          sets,
          restSeconds: re.restSeconds,
          supersetGroup: re.supersetGroup,
        }
      })

      const now = new Date()
      const session: Session = {
        id: uid('ses'),
        date: toDayKey(now),
        startedAt: now.toISOString(),
        routineId: routine?.id,
        name: name ?? routine?.name ?? 'Séance libre',
        exercises,
      }
      setState((s) => ({ ...s, activeSession: session }))
      return session
    },
    [routines],
  )

  const cancelSession = useCallback(() => {
    setState((s) => ({ ...s, activeSession: undefined }))
  }, [])

  const finishSession = useCallback<DataContextValue['finishSession']>(() => {
    // Records, streak et courbes se recalculent depuis les séances : ce qui
    // compte, c'est que celle-ci arrive en base sans délai.
    flushAfterSave.current = true
    let saved: Session | undefined
    setState((s) => {
      const active = s.activeSession
      if (!active) return s

      // On ne garde que les séries validées : une séance loggée reflète
      // ce qui a été fait, pas ce qui était prévu.
      const exercises = active.exercises
        .map((ex) => ({ ...ex, sets: ex.sets.filter((set) => set.completed) }))
        .filter((ex) => ex.sets.length > 0)

      if (exercises.length === 0) {
        return { ...s, activeSession: undefined }
      }

      const endedAt = new Date()
      saved = {
        ...active,
        exercises,
        endedAt: endedAt.toISOString(),
        durationSeconds: Math.round(
          (endedAt.getTime() - new Date(active.startedAt).getTime()) / 1000,
        ),
      }
      return {
        ...s,
        activeSession: undefined,
        sessions: [...s.sessions, saved],
      }
    })
    return saved
  }, [])

  /** Applique une transformation à la séance active. */
  const patchActive = useCallback((fn: (session: Session) => Session) => {
    setState((s) => (s.activeSession ? { ...s, activeSession: fn(s.activeSession) } : s))
  }, [])

  const patchSessionExercise = useCallback(
    (sessionExerciseId: string, fn: (ex: SessionExercise) => SessionExercise) => {
      patchActive((session) => ({
        ...session,
        exercises: session.exercises.map((ex) =>
          ex.id === sessionExerciseId ? fn(ex) : ex,
        ),
      }))
    },
    [patchActive],
  )

  const addExerciseToSession = useCallback<DataContextValue['addExerciseToSession']>(
    (exerciseId) => {
      const exercise = getExercise(exerciseId)
      if (!exercise) return
      patchActive((session) => ({
        ...session,
        exercises: [
          ...session.exercises,
          {
            id: uid('sex'),
            exerciseId,
            restSeconds: 90,
            sets: [
              {
                id: uid('set'),
                weight: 0,
                ...(exercise.type === 'time' ? { seconds: 20 } : { reps: 8 }),
                completed: false,
              },
            ],
          },
        ],
      }))
    },
    [patchActive],
  )

  const removeExerciseFromSession = useCallback<
    DataContextValue['removeExerciseFromSession']
  >(
    (sessionExerciseId) => {
      patchActive((session) => ({
        ...session,
        exercises: session.exercises.filter((ex) => ex.id !== sessionExerciseId),
      }))
    },
    [patchActive],
  )

  const addSet = useCallback<DataContextValue['addSet']>(
    (sessionExerciseId) => {
      patchSessionExercise(sessionExerciseId, (ex) => {
        const last = ex.sets[ex.sets.length - 1]
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              id: uid('set'),
              weight: last?.weight ?? 0,
              reps: last?.reps,
              seconds: last?.seconds,
              tempo: last?.tempo,
              completed: false,
            },
          ],
        }
      })
    },
    [patchSessionExercise],
  )

  const updateSet = useCallback<DataContextValue['updateSet']>(
    (sessionExerciseId, setId, patch) => {
      patchSessionExercise(sessionExerciseId, (ex) => ({
        ...ex,
        sets: ex.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
      }))
    },
    [patchSessionExercise],
  )

  const removeSet = useCallback<DataContextValue['removeSet']>(
    (sessionExerciseId, setId) => {
      patchSessionExercise(sessionExerciseId, (ex) => ({
        ...ex,
        sets: ex.sets.filter((set) => set.id !== setId),
      }))
    },
    [patchSessionExercise],
  )

  const setExerciseNotes = useCallback<DataContextValue['setExerciseNotes']>(
    (sessionExerciseId, notes) => {
      patchSessionExercise(sessionExerciseId, (ex) => ({ ...ex, notes }))
    },
    [patchSessionExercise],
  )

  const deleteSession = useCallback<DataContextValue['deleteSession']>((sessionId) => {
    flushAfterSave.current = true
    setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== sessionId) }))
  }, [])

  const setProgressStep = useCallback<DataContextValue['setProgressStep']>(
    (pathId, step) => {
      setState((s) => {
        const existing = s.progress.find((p) => p.pathId === pathId)
        const today = toDayKey()
        const next: UserProgress = existing
          ? {
              ...existing,
              currentStep: step,
              unlockedAt: { ...existing.unlockedAt, [step]: today },
            }
          : { pathId, currentStep: step, unlockedAt: { [step]: today } }
        return {
          ...s,
          progress: existing
            ? s.progress.map((p) => (p.pathId === pathId ? next : p))
            : [...s.progress, next],
        }
      })
    },
    [],
  )

  const setActiveRoutine = useCallback<DataContextValue['setActiveRoutine']>(
    (routineId) => {
      setState((s) => ({ ...s, activeRoutineId: routineId }))
    },
    [],
  )

  const addCustomRoutine = useCallback<DataContextValue['addCustomRoutine']>((routine) => {
    const created: Routine = { ...routine, id: uid('rt'), custom: true }
    setState((s) => ({ ...s, customRoutines: [...s.customRoutines, created] }))
    return created
  }, [])

  const deleteCustomRoutine = useCallback<DataContextValue['deleteCustomRoutine']>(
    (routineId) => {
      setState((s) => ({
        ...s,
        customRoutines: s.customRoutines.filter((r) => r.id !== routineId),
        activeRoutineId: s.activeRoutineId === routineId ? undefined : s.activeRoutineId,
      }))
    },
    [],
  )

  const addCustomExercise = useCallback<DataContextValue['addCustomExercise']>(
    (input) => {
      const created: Exercise = {
        id: uid('ex-perso'),
        name: input.name.trim(),
        category: input.category,
        type: input.type,
        muscles: (input.muscles ?? []).map((m) => m.trim()).filter(Boolean),
        description: input.description?.trim() ?? '',
        commonMistakes: [],
        difficulty: input.difficulty ?? 1,
        custom: true,
      }
      setState((s) => ({ ...s, customExercises: [...s.customExercises, created] }))
      return created
    },
    [],
  )

  const isExerciseInUse = useCallback<DataContextValue['isExerciseInUse']>(
    (exerciseId) => {
      const inSessions = [...state.sessions, ...(state.activeSession ? [state.activeSession] : [])]
      return (
        inSessions.some((session) => session.exercises.some((ex) => ex.exerciseId === exerciseId)) ||
        state.customRoutines.some((r) => r.exercises.some((re) => re.exerciseId === exerciseId)) ||
        state.settings.favoriteChartExerciseId === exerciseId
      )
    },
    [state.sessions, state.activeSession, state.customRoutines, state.settings.favoriteChartExerciseId],
  )

  const deleteCustomExercise = useCallback<DataContextValue['deleteCustomExercise']>(
    (exerciseId) => {
      setState((s) => ({
        ...s,
        customExercises: s.customExercises.filter((ex) => ex.id !== exerciseId),
      }))
    },
    [],
  )

  const setFavoriteChartExercise = useCallback<
    DataContextValue['setFavoriteChartExercise']
  >((exerciseId) => {
    setState((s) => ({
      ...s,
      settings: { ...s.settings, favoriteChartExerciseId: exerciseId },
    }))
  }, [])

  const setUserName = useCallback<DataContextValue['setUserName']>((name) => {
    setState((s) => ({ ...s, settings: { ...s.settings, name } }))
  }, [])

  const exportData = useCallback(() => JSON.stringify(state, null, 2), [state])

  const importData = useCallback<DataContextValue['importData']>((json) => {
    setState(parseImportedState(json))
  }, [])

  const resetData = useCallback(() => {
    flushAfterSave.current = true
    // Le nom est un réglage, pas une donnée d'entraînement : on le garde.
    setState((s) => ({ ...makeEmptyState(), settings: { name: s.settings.name } }))
  }, [])

  const loadDemoData = useCallback(() => {
    flushAfterSave.current = true
    setState((s) => {
      const demo = makeSeedState()
      demo.settings.name = s.settings.name
      return demo
    })
  }, [])

  const value = useMemo<DataContextValue>(
    () => ({
      state,
      loading,
      syncStatus,
      retrySave,
      routines,
      exercises: catalogue,
      activeRoutine,
      progressFor,
      startSession,
      cancelSession,
      finishSession,
      addExerciseToSession,
      removeExerciseFromSession,
      addSet,
      updateSet,
      removeSet,
      setExerciseNotes,
      deleteSession,
      setProgressStep,
      setActiveRoutine,
      addCustomRoutine,
      deleteCustomRoutine,
      addCustomExercise,
      deleteCustomExercise,
      isExerciseInUse,
      setFavoriteChartExercise,
      setUserName,
      exportData,
      importData,
      resetData,
      loadDemoData,
    }),
    [
      state,
      loading,
      syncStatus,
      retrySave,
      routines,
      catalogue,
      activeRoutine,
      progressFor,
      startSession,
      cancelSession,
      finishSession,
      addExerciseToSession,
      removeExerciseFromSession,
      addSet,
      updateSet,
      removeSet,
      setExerciseNotes,
      deleteSession,
      setProgressStep,
      setActiveRoutine,
      addCustomRoutine,
      deleteCustomRoutine,
      addCustomExercise,
      deleteCustomExercise,
      isExerciseInUse,
      setFavoriteChartExercise,
      setUserName,
      exportData,
      importData,
      resetData,
      loadDemoData,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData() doit être utilisé dans <DataProvider>')
  return ctx
}
