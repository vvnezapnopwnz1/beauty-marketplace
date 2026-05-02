import { useState } from 'react'
import { Box } from '@mui/material'
import { MasterClientsGrid } from './MasterClientsGrid'
import { CreateMasterClientDrawer } from './drawers/CreateMasterClientDrawer'
import { MasterClientDetailDrawer } from './drawers/MasterClientDetailDrawer'
import type { MasterClientDTO } from '@entities/master'

export function MasterDashboardClients() {
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<MasterClientDTO | null>(null)

  return (
    <Box>
      <MasterClientsGrid
        onRequestCreate={() => setCreateOpen(true)}
        onRowClick={row => setSelected(row)}
      />
      <CreateMasterClientDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
      <MasterClientDetailDrawer open={!!selected} client={selected} onClose={() => setSelected(null)} />
    </Box>
  )
}
