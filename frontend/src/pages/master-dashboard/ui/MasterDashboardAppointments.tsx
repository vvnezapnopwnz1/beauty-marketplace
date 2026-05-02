import { useState } from 'react'
import { Box } from '@mui/material'
import { MasterAppointmentsGrid } from './MasterAppointmentsGrid'
import { CreateMasterAppointmentDrawer } from './drawers/CreateMasterAppointmentDrawer'
import { MasterPersonalAppointmentDrawer } from './drawers/MasterPersonalAppointmentDrawer'
import type { MasterAppointmentDTO } from '@entities/master'

export function MasterDashboardAppointments() {
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<MasterAppointmentDTO | null>(null)

  return (
    <Box>
      <MasterAppointmentsGrid
        onRequestCreate={() => setCreateOpen(true)}
        onRowClick={row => setSelected(row)}
      />
      <CreateMasterAppointmentDrawer
        key={createOpen ? 'create-open' : 'create-idle'}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <MasterPersonalAppointmentDrawer
        open={!!selected}
        appointment={selected}
        onClose={() => setSelected(null)}
      />
    </Box>
  )
}
