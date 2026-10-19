import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { AuthGate } from './components/AuthGate'
import { DataProvider } from './hooks/useData'
import { localRepository } from './data/repository'
import { supabaseRepository } from './data/supabaseRepository'
import { supabase } from './lib/supabase'
import './index.css'

const container = document.getElementById('root')
if (!container) throw new Error('#root introuvable')

// Projet Supabase configuré → persistance distante derrière l'authentification.
// Sinon on garde le comportement d'origine : tout dans `localStorage`.
const repository = supabase ? supabaseRepository : localRepository

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <AuthGate>
        {(userId) => (
          // La clé remonte un store neuf quand on change de compte.
          <DataProvider key={userId ?? 'local'} repository={repository}>
            <App />
          </DataProvider>
        )}
      </AuthGate>
    </BrowserRouter>
  </StrictMode>,
)
