import { useState } from 'react'
import { Avatar, IconButton, Menu, MenuItem } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@app/store'
import { logout, selectUser } from '@features/auth-by-phone/model/authSlice'
import { ROUTES } from '@shared/config/routes'
import { selectProfile } from '@features/edit-profile/model/profileSlice'

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

  if (!user) return null

  const roles = profile?.effectiveRoles ?? user.effectiveRoles
  const canSalon = (roles?.ownerOfSalons.length ?? 0) + (roles?.adminOfSalons.length ?? 0) > 0
  const canMaster = !!roles?.isMaster || !!user.masterProfileId

  return (
    <>
      <IconButton onClick={(e) => setAnchor(e.currentTarget)} size="small">
        <Avatar sx={{ width: 30, height: 30 }}>
          {initials(profile?.displayName ?? user.displayName)}
        </Avatar>
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { setAnchor(null); navigate(ROUTES.ME) }}>Профиль</MenuItem>
        {canSalon && <MenuItem onClick={() => { setAnchor(null); navigate(ROUTES.DASHBOARD) }}>Кабинет салона</MenuItem>}
        {canMaster && <MenuItem onClick={() => { setAnchor(null); navigate(ROUTES.MASTER_DASHBOARD) }}>Кабинет мастера</MenuItem>}
        <MenuItem onClick={() => { setAnchor(null); void dispatch(logout()) }}>Выйти</MenuItem>
      </Menu>
    </>
  )
}
