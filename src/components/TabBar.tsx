import { NavLink } from 'react-router-dom'
import { IconChart, IconHome, IconLadder, IconList, IconPlay } from './Icons'
import { cx } from '../lib/utils'

const TABS = [
  { to: '/', label: 'Accueil', Icon: IconHome },
  { to: '/progressions', label: 'Progressions', Icon: IconLadder },
  { to: '/seance', label: 'Séance', Icon: IconPlay, primary: true },
  { to: '/routines', label: 'Routines', Icon: IconList },
  { to: '/stats', label: 'Stats', Icon: IconChart },
]

/** Navigation principale, fixée en bas façon app mobile. */
export function TabBar() {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-concrete-600
        bg-concrete-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch">
        {TABS.map(({ to, label, Icon, primary }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cx(
                  'flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                  isActive ? 'text-steel' : 'text-muted hover:text-chalk',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cx(
                      'flex items-center justify-center rounded-full transition-colors',
                      primary
                        ? cx(
                            'h-10 w-10 -mt-1',
                            isActive
                              ? 'bg-steel text-concrete-900'
                              : 'bg-concrete-700 text-chalk',
                          )
                        : 'h-6 w-6',
                    )}
                  >
                    <Icon size={primary ? 18 : 21} />
                  </span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
