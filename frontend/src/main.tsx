import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { CssBaseline } from '@mui/material'
import { store } from '@app/store'
import { ThemeModeProvider } from '@shared/theme'
import '@shared/i18n'
import { App } from '@app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeModeProvider>
      <Provider store={store}>
        <CssBaseline />
        <App />
      </Provider>
    </ThemeModeProvider>
  </StrictMode>,
)
