import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SearchPage } from '@pages/search/ui/SearchPage'
import { SalonPage } from '@pages/salon/ui/SalonPage'
import { LoginPage } from '@pages/login/ui/LoginPage'
import { ROUTES } from '@shared/config/routes'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.HOME} element={<SearchPage />} />
        <Route path={ROUTES.SALON} element={<SalonPage />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  )
}
