import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Chrono ascendant basé sur l'horloge système (et non sur un compteur
 * incrémenté) : il reste juste même si l'onglet passe en arrière-plan
 * et que les timers sont throttlés.
 */
export function useElapsed(startedAt: string | undefined): number {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0)
      return
    }
    const start = new Date(startedAt).getTime()
    const tick = () => setElapsed(Math.max(0, Math.round((Date.now() - start) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [startedAt])

  return elapsed
}

export interface Countdown {
  /** Secondes restantes, 0 quand inactif. */
  remaining: number
  total: number
  running: boolean
  start(seconds: number, label?: string): void
  stop(): void
  add(seconds: number): void
  label?: string
}

/** Minuteur de repos décomptant, avec bip de fin. */
export function useCountdown(): Countdown {
  const [endAt, setEndAt] = useState<number | null>(null)
  const [total, setTotal] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [label, setLabel] = useState<string | undefined>()
  const notified = useRef(false)

  useEffect(() => {
    if (endAt === null) return
    const tick = () => {
      const left = Math.max(0, Math.round((endAt - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0 && !notified.current) {
        notified.current = true
        beep()
        setEndAt(null)
      }
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [endAt])

  const start = useCallback((seconds: number, nextLabel?: string) => {
    notified.current = false
    setTotal(seconds)
    setLabel(nextLabel)
    setEndAt(Date.now() + seconds * 1000)
  }, [])

  const stop = useCallback(() => {
    notified.current = true
    setEndAt(null)
    setRemaining(0)
    setTotal(0)
    setLabel(undefined)
  }, [])

  const add = useCallback((seconds: number) => {
    setEndAt((current) => (current === null ? null : current + seconds * 1000))
    setTotal((t) => t + seconds)
  }, [])

  return { remaining, total, running: endAt !== null, start, stop, add, label }
}

/** Bip de fin de repos via Web Audio : pas de fichier son à charger. */
function beep() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
    osc.onended = () => void ctx.close()
  } catch {
    // Audio bloqué par le navigateur : le minuteur reste visuel, ce n'est pas bloquant.
  }

  if ('vibrate' in navigator) {
    navigator.vibrate?.([120, 60, 120])
  }
}
