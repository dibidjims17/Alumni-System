import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AdminThemeProvider } from './theme.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AdminThemeProvider>
      {/* Last-resort guard: catches anything the per-page boundary in
          Layout can't (e.g. a crash in the router/shell itself). */}
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </AdminThemeProvider>
  </StrictMode>,
)
