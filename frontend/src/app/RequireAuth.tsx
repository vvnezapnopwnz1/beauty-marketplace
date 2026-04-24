import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAppSelector } from '@app/store'
import { selectIsAuthenticated } from '@features/auth-by-phone/model/authSlice'
import { ROUTES } from '@shared/config/routes'

export function RequireAuth({ children }: { children: ReactNode }) {
  const authed = useAppSelector(selectIsAuthenticated)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!authed) {
      const returnTo = encodeURIComponent(`${location.pathname}${location.search}`)
      navigate(`${ROUTES.LOGIN}?returnTo=${returnTo}`, { replace: true })
    }
  }, [authed, location.pathname, location.search, navigate])

  if (!authed) {
    return null
  }
  return <>{children}</>
}
