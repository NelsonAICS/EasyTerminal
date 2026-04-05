import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Island from './Island.tsx'

const isIsland = window.location.hash === '#island'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isIsland ? <Island /> : <App />}
  </StrictMode>,
)
