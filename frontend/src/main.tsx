import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { CssBaseline } from '@mui/material'
import { SnackbarProvider } from 'notistack'
import { BrowserRouter } from 'react-router-dom'
import { store } from '@app/store'
import { ThemeModeProvider } from '@shared/theme'
import '@shared/i18n'
import { App } from '@app/App'
import { NotificationsProvider } from '@app/NotificationsProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeModeProvider>
      <Provider store={store}>
        <SnackbarProvider maxSnack={3}>
          <BrowserRouter>
            <NotificationsProvider />
            <CssBaseline />
            <App />
          </BrowserRouter>
        </SnackbarProvider>
      </Provider>
    </ThemeModeProvider>
  </StrictMode>,
)
