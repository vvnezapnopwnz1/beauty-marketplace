import { Routes, Route } from 'react-router-dom'
import { SearchPage } from '@pages/search/ui/SearchPage'
import { SalonPage } from '@pages/salon/ui/SalonPage'
import { MasterPage } from '@pages/master/ui/MasterPage'
import { LoginPage } from '@pages/login/ui/LoginPage'
import { DashboardPage } from '@pages/dashboard/ui/DashboardPage'
import { MasterDashboardPage } from '@pages/master-dashboard/ui/MasterDashboardPage'
import { MePage } from '@pages/me'
import { ClaimSalonPage } from '@features/claim-salon/ui/ClaimSalonPage'
import { ClaimStatusPage } from '@features/claim-salon/ui/ClaimStatusPage'
import { AdminClaimsPage } from '@pages/admin/ui/AdminClaimsPage'
import { OnboardingWizard } from '@pages/dashboard/ui/OnboardingWizard'
import { JoinPage } from '@pages/join/ui/JoinPage'
import { ROUTES } from '@shared/config/routes'
import { DeviceLocationSync } from '@features/location/ui/DeviceLocationSync'
import { GeoLocationStorageWatcher } from '@features/location/ui/GeoLocationStorageWatcher'
import { LocationBootstrap } from '@features/location/ui/LocationBootstrap'
import { AuthBootstrap } from './AuthBootstrap'
import { RequireAuth } from './RequireAuth'
import '@entities/salon-invite'

export function App() {
  return (
    <>
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
        <Route path={ROUTES.ME} element={<RequireAuth><MePage /></RequireAuth>} />
        <Route path="/dashboard/:salonId/*" element={<DashboardPage />} />
        <Route path={`${ROUTES.MASTER_DASHBOARD}/*`} element={<MasterDashboardPage />} />
        <Route path={ROUTES.CLAIM_SALON} element={<RequireAuth><ClaimSalonPage /></RequireAuth>} />
        <Route path={ROUTES.CLAIM_STATUS} element={<RequireAuth><ClaimStatusPage /></RequireAuth>} />
        <Route path={ROUTES.JOIN} element={<JoinPage />} />
        <Route path={ROUTES.ADMIN_CLAIMS} element={<RequireAuth><AdminClaimsPage /></RequireAuth>} />
        <Route path={ROUTES.ONBOARDING} element={<RequireAuth><OnboardingWizard /></RequireAuth>} />
      </Routes>
    </>
  )
}
