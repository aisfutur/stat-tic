import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppState,
  Routine,
  Session,
  SessionExercise,
  SetEntry,
  UserProgress,
} from '../types'
import { EXERCISE_BY_ID } from '../data/exercises'
import { ROUTINES } from '../data/routines'
import { localRepository, parseImportedState, type Repository } from '../data/repository'
import { makeSeedState } from '../data/seed'
import { toDayKey, uid } from '../lib/utils'

interface DataContextValue {
  state: AppState
  loading: boolean
  /** Routines intégrées + routines personnalisées. */
  routines: Routine[]
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

  // Réglages & données
  setFavoriteChartExercise(exerciseId: string): void
  setUserName(name: string): void
  exportData(): string
  importData(json: string): void
  resetData(): void
}

const DataContext = createContext<DataContextValue | null>(null)

const EMPTY_STATE: AppState = {
  version: 1,
  sessions: [],
  progress: [],
  customRoutines: [],
  settings: { name: 'Athlète' },
}

export function DataProvider({
  children,
  repository = localRepository,
}: {
  children: ReactNode
  repository?: Repository
}) {
  const [state, setState] = useState<AppState>(EMPTY_STATE)
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

  useEffect(() => {
    if (!hydrated.current) return
    void repository.save(state)
  }, [state, repository])

  const routines = useMemo(
    () => [...ROUTINES, ...state.customRoutines],
    [state.customRoutines],
  )

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
        const exercise = EXERCISE_BY_ID[re.exerciseId]
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
      const exercise = EXERCISE_BY_ID[exerciseId]
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
    setState(makeSeedState())
  }, [])

  const value = useMemo<DataContextValue>(
    () => ({
      state,
      loading,
      routines,
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
      setFavoriteChartExercise,
      setUserName,
      exportData,
      importData,
      resetData,
    }),
    [
      state,
      loading,
      routines,
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
      setFavoriteChartExercise,
      setUserName,
      exportData,
      importData,
      resetData,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData() doit être utilisé dans <DataProvider>')
  return ctx
}
