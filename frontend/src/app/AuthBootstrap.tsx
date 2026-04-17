import { useEffect } from 'react'
import { useAppDispatch } from '@app/store'
import { loadMe } from '@features/auth-by-phone/model/authSlice'
import { getStoredAccessToken } from '@shared/api/authApi'

/** Loads current user when a token exists (NavBar, protected routes). */
export function AuthBootstrap() {
  const dispatch = useAppDispatch()
  useEffect(() => {
    if (getStoredAccessToken()) {
      void dispatch(loadMe())
    }
  }, [dispatch])
  return null
}
