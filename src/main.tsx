import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { DataProvider } from './hooks/useData'
import { ThemeProvider } from './hooks/useTheme'
import { localRepository } from './data/repository'
import { supabaseRepository } from './data/supabaseRepository'
import { supabase } from './lib/supabase'
import './index.css'

const container = document.getElementById('root')
if (!container) throw new Error('#root introuvable')

// Projet Supabase configuré → persistance distante, sous un propriétaire
// unique (voir `OWNER_ID`) : l'app n'a qu'un utilisateur, donc pas de compte
// ni d'écran de connexion. Sinon, tout reste dans `localStorage`.
const repository = supabase ? supabaseRepository : localRepository

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <DataProvider repository={repository}>
          <App />
        </DataProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
