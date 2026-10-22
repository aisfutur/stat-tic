import { Outlet } from 'react-router-dom'
import { SyncIndicator } from './SyncIndicator'
import { TabBar } from './TabBar'

/** Coquille d'application : contenu scrollable + barre d'onglets fixe. */
export function Layout() {
  return (
    <div className="min-h-dvh bg-concrete-900">
      {/* pb-24 réserve la hauteur de la TabBar pour que rien ne soit masqué */}
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 lg:max-w-5xl lg:px-8">
        <SyncIndicator />
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}
