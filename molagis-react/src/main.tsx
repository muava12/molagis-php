import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

// Import Tabler CSS
import './tabler.min.css'

// Set default theme
const savedTheme = localStorage.getItem('theme') || 'dark'
document.documentElement.setAttribute('data-bs-theme', savedTheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
