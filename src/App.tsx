import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './screens/Home'
import { Session } from './screens/Session'
import { Progressions } from './screens/Progressions'
import { Routines } from './screens/Routines'
import { History } from './screens/History'
import { Settings } from './screens/Settings'
import { useData } from './hooks/useData'

// Recharts pèse lourd et ne sert qu'ici : on le charge à la demande.
const Stats = lazy(() =>
  import('./screens/Stats').then((m) => ({ default: m.Stats })),
)

export function App() {
  const { loading } = useData()

  if (loading) return <Splash />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/seance" element={<Session />} />
        <Route path="/progressions" element={<Progressions />} />
        <Route path="/routines" element={<Routines />} />
        <Route
          path="/stats"
          element={
            <Suspense fallback={<Splash />}>
              <Stats />
            </Suspense>
          }
        />
        <Route path="/historique" element={<History />} />
        <Route path="/reglages" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function Splash() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <p className="font-display text-3xl tracking-widest text-locked">BARRE</p>
    </div>
  )
}
