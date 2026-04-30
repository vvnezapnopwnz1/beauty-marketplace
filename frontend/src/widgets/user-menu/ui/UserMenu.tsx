import { useState } from 'react'
import { Avatar, Badge, IconButton, Menu, MenuItem } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@app/store'
import { logout, selectUser } from '@features/auth-by-phone'
import { ROUTES, dashboardPath, salonRoleLabelRu } from '@shared/config/routes'
import { selectProfile } from '@features/edit-profile'
import { useTranslation } from 'react-i18next'

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function UserMenu() {
  const user = useAppSelector(selectUser)
  const profile = useAppSelector(selectProfile)
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const { t } = useTranslation()
  if (!user) return null

  const roles = profile?.effectiveRoles ?? user.effectiveRoles
  const memberships = roles?.salonMemberships ?? []
  const canSalon = memberships.length > 0
  const canMaster = !!roles?.isMaster || !!user.masterProfileId

  return (
    <>
      <IconButton onClick={e => setAnchor(e.currentTarget)} size="small">
        <Badge color="error" max={99}>
          <Avatar sx={{ width: 30, height: 30 }}>
            {initials(profile?.displayName ?? user.displayName)}
          </Avatar>
        </Badge>
      </IconButton>

      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <MenuItem
          onClick={() => {
            setAnchor(null)
            navigate(ROUTES.HOME)
          }}
        >
          {t('userMenu.home')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null)
            navigate(ROUTES.ME)
          }}
        >
          {t('userMenu.profile')}
        </MenuItem>
        {canSalon && memberships.length === 1 && (
          <MenuItem
            onClick={() => {
              setAnchor(null)
              navigate(dashboardPath(memberships[0].salonId))
            }}
          >
            {t('cabinet.cabinetOfSalon', { salonName: memberships[0].salonName || 'Салон' })}
          </MenuItem>
        )}
        {canSalon &&
          memberships.length > 1 &&
          memberships.map(m => (
            <MenuItem
              key={m.salonId}
              onClick={() => {
                setAnchor(null)
                navigate(dashboardPath(m.salonId))
              }}
            >
              {m.salonName || 'Салон'} ({salonRoleLabelRu(m.role)})
            </MenuItem>
          ))}
        {canMaster && (
          <MenuItem
            onClick={() => {
              setAnchor(null)
              navigate(ROUTES.MASTER_DASHBOARD)
            }}
          >
            {t('cabinet.cabinetOfMaster')}
          </MenuItem>
        )}

        <MenuItem
          onClick={() => {
            setAnchor(null)
            void dispatch(logout()).finally(() => {
              navigate(ROUTES.HOME)
            })
          }}
        >
          {t('userMenu.logout')}
        </MenuItem>
      </Menu>
    </>
  )
}
