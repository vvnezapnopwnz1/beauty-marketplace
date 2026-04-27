import { Box, Typography } from '@mui/material'
import { useAppDispatch, useAppSelector } from '@app/store'
import { ShowClientsGrid } from '@features/clients/show-clients/ui/ShowClientsGrid'
import { CreateClientDrawer } from '@features/clients/create-client/ui/CreateClientDrawer'
import { ClientDetailDrawer } from '@widgets/client-detail-drawer/ui/ClientDetailDrawer'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { closeClientDrawer } from '@entities/client'

export function ClientsListView() {
  const d = useDashboardPalette()
  const dispatch = useAppDispatch()
  const drawerData = useAppSelector(state => state.client.clientDrawerData)

  const isCreateOpen = drawerData.mode === 'create'
  const isViewOpen = drawerData.mode === 'view' && Boolean(drawerData.id)
  const handleClose = () => dispatch(closeClientDrawer())

  return (
    <Box>
      <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: d.text, mb: 2 }}>
        Клиенты
      </Typography>
      <ShowClientsGrid />
      <CreateClientDrawer open={isCreateOpen} onClose={handleClose} />
      <ClientDetailDrawer open={isViewOpen} clientId={drawerData.id} onClose={handleClose} />
    </Box>
  )
}
