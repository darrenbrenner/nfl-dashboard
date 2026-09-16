import '@fontsource/inter/latin.css'
import '@fontsource/special-elite/latin-400.css'
import '@fontsource/playfair-display/latin-700.css'
import '@fontsource/playfair-display/latin-900.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
