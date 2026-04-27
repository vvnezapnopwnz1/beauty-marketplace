import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import {
  useGetSalonMembersQuery,
  useGetStaffInvitesQuery,
  useRemoveSalonMemberMutation,
  useRevokeStaffInviteMutation,
  useUpdateSalonMemberRoleMutation,
} from '@entities/salon-invite'
import { salonRoleLabelRu } from '@shared/config/routes'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { InviteStaffDrawer } from '../drawers/InviteStaffDrawer'

export function PersonnelView() {
  const d = useDashboardPalette()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { data: members = [], isLoading: mLoad, error: mErr } = useGetSalonMembersQuery()
  const { data: invites = [], isLoading: iLoad, error: iErr } = useGetStaffInvitesQuery()
  const [revoke] = useRevokeStaffInviteMutation()
  const [removeMember] = useRemoveSalonMemberMutation()
  const [updateRole] = useUpdateSalonMemberRoleMutation()
  const [localErr, setLocalErr] = useState<string | null>(null)

  const pendingInvites = useMemo(() => invites.filter(i => i.status === 'pending'), [invites])

  async function onRevokeInvite(id: string) {
    setLocalErr(null)
    try {
      await revoke(id).unwrap()
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  async function onRemoveMember(userId: string) {
    if (!window.confirm('Удалить сотрудника из салона?')) return
    setLocalErr(null)
    try {
      await removeMember(userId).unwrap()
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  async function onRoleChange(userId: string, role: string) {
    setLocalErr(null)
    try {
      await updateRole({ userId, role }).unwrap()
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: d.text }}>
          Персонал салона
        </Typography>
        <Button variant="contained" size="small" onClick={() => setDrawerOpen(true)}>
          Пригласить сотрудника
        </Button>
      </Stack>

      {(mErr || iErr) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Не удалось загрузить данные
        </Alert>
      )}
      {localErr && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLocalErr(null)}>
          {localErr}
        </Alert>
      )}

      <Typography variant="subtitle2" sx={{ mb: 1, color: d.mutedDark }}>
        Участники
      </Typography>
      <TableContainer sx={{ mb: 3, border: `1px solid ${d.borderHairline}`, borderRadius: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Имя</TableCell>
              <TableCell>Телефон</TableCell>
              <TableCell>Роль</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(mLoad ? [] : members).map(m => {
              const isOwner = m.role === 'owner'
              return (
                <TableRow key={m.userId}>
                  <TableCell>{m.displayName || '—'}</TableCell>
                  <TableCell>{m.phoneE164}</TableCell>
                  <TableCell>
                    {isOwner ? (
                      <Chip size="small" label={salonRoleLabelRu(m.role)} />
                    ) : (
                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel id={`role-${m.userId}`}>Роль</InputLabel>
                        <Select
                          labelId={`role-${m.userId}`}
                          label="Роль"
                          value={m.role === 'admin' || m.role === 'receptionist' ? m.role : 'receptionist'}
                          onChange={e => void onRoleChange(m.userId, e.target.value as string)}
                        >
                          <MenuItem value="admin">Администратор</MenuItem>
                          <MenuItem value="receptionist">Ресепшн</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {!isOwner && (
                      <Button size="small" color="error" onClick={() => void onRemoveMember(m.userId)}>
                        Удалить
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle2" sx={{ mb: 1, color: d.mutedDark }}>
        Приглашения (ожидают)
      </Typography>
      <TableContainer sx={{ border: `1px solid ${d.borderHairline}`, borderRadius: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Телефон</TableCell>
              <TableCell>Роль</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(iLoad ? [] : pendingInvites).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary">
                    Нет активных приглашений
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              pendingInvites.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.phoneE164}</TableCell>
                  <TableCell>{salonRoleLabelRu(inv.role)}</TableCell>
                  <TableCell>
                    <Chip size="small" label={inv.status} />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => void onRevokeInvite(inv.id)}>
                      Отозвать
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <InviteStaffDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </Box>
  )
}
