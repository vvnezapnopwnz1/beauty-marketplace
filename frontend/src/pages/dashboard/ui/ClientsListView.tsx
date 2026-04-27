import { Box } from '@mui/material'
import { useAppDispatch, useAppSelector } from '@app/store'
import { ShowClientsGrid } from '@features/clients/show-clients/ui/ShowClientsGrid'
import { CreateClientDrawer } from '@features/clients/create-client/ui/CreateClientDrawer'
import { ClientDetailDrawer } from '@widgets/client-detail-drawer/ui/ClientDetailDrawer'
import { closeClientDrawer } from '@entities/client'

export function ClientsListView() {
  const dispatch = useAppDispatch()
  const drawerData = useAppSelector(state => state.client.clientDrawerData)

  const isCreateOpen = drawerData.mode === 'create'
  const isViewOpen = drawerData.mode === 'view' && Boolean(drawerData.id)
  const handleClose = () => dispatch(closeClientDrawer())

  return (
    <Box>
      <ShowClientsGrid />
      <CreateClientDrawer open={isCreateOpen} onClose={handleClose} />
      <ClientDetailDrawer open={isViewOpen} clientId={drawerData.id} onClose={handleClose} />
    </Box>
  )
}
