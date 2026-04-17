import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SearchPage } from '@pages/search/ui/SearchPage'
import { SalonPage } from '@pages/salon/ui/SalonPage'
import { MasterPage } from '@pages/master/ui/MasterPage'
import { LoginPage } from '@pages/login/ui/LoginPage'
import { DashboardPage } from '@pages/dashboard/ui/DashboardPage'
import { MasterDashboardPage } from '@pages/master-dashboard/ui/MasterDashboardPage'
import { ROUTES } from '@shared/config/routes'
import { DeviceLocationSync } from '@features/location/ui/DeviceLocationSync'
import { GeoLocationStorageWatcher } from '@features/location/ui/GeoLocationStorageWatcher'
import { LocationBootstrap } from '@features/location/ui/LocationBootstrap'
import { AuthBootstrap } from './AuthBootstrap'

export function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap />
      <DeviceLocationSync />
      <GeoLocationStorageWatcher />
      <LocationBootstrap />
      <Routes>
        <Route path={ROUTES.HOME} element={<SearchPage />} />
        <Route path={ROUTES.SALON} element={<SalonPage />} />
        <Route path={ROUTES.PLACE} element={<SalonPage />} />
        <Route path={ROUTES.MASTER} element={<MasterPage />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={`${ROUTES.DASHBOARD}/*`} element={<DashboardPage />} />
        <Route path={`${ROUTES.MASTER_DASHBOARD}/*`} element={<MasterDashboardPage />} />
      </Routes>
    </BrowserRouter>
  )
}
