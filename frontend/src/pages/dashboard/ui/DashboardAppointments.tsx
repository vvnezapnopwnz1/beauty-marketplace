import { Box } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { ru } from 'date-fns/locale'
import { AppointmentDrawer } from '@pages/dashboard/ui/drawers/AppointmentDrawer'
import { CreateAppointmentDrawer } from '@pages/dashboard/ui/drawers/CreateAppointmentDrawer'
import { closeAppointmentDrawer, openAppointmentDrawer, setFilters } from '@entities/appointment'
import { useAppDispatch, useAppSelector } from '@app/store'
import { useEffect, useState } from 'react'

import { ShowAppointmentsGrid } from '@features/appointment/show-appointments/ui/ShowAppointmentsGrid'
import FilterAppointmentsBar from '@features/appointment/show-appointments/ui/FilterAppointmentsBar'
import {
  DashboardServiceRow,
  DashboardStaffRow,
  fetchDashboardServices,
  fetchDashboardStaff,
  staffListItemsToRows,
} from '@shared/api/dashboardApi'

export function DashboardAppointments() {
  const dispatch = useAppDispatch()
  const filters = useAppSelector(state => state.appointment.filters)
  const drawerData = useAppSelector(state => state.appointment.appointmentDrawerData)
  const isCreateOpen = drawerData.mode === 'create' && drawerData.id === null
  const isEditOpen = drawerData.mode === 'edit' && Boolean(drawerData.id)
  const [staff, setStaff] = useState<DashboardStaffRow[]>([])
  const [services, setServices] = useState<DashboardServiceRow[]>([])

  const handleCloseDrawer = () => {
    dispatch(closeAppointmentDrawer())
  }

  useEffect(() => {
    let mounted = true
    Promise.all([fetchDashboardServices(), fetchDashboardStaff()])
      .then(([serviceRows, staffItems]) => {
        if (!mounted) return
        setServices(serviceRows.filter(s => s.isActive))
        setStaff(staffListItemsToRows(staffItems).filter(s => s.isActive))
      })
      .catch(() => {
        if (!mounted) return
        setServices([])
        setStaff([])
      })

    return () => {
      mounted = false
    }
  }, [])

  const handleSetModal = (open: boolean) => {
    if (!open) return
    dispatch(openAppointmentDrawer({ mode: 'create', id: null }))
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
      <Box>
        <FilterAppointmentsBar
          filters={filters}
          setFilters={next => dispatch(setFilters(next))}
          staff={staff}
          services={services}
          setModal={handleSetModal}
        />
        <ShowAppointmentsGrid />

        <CreateAppointmentDrawer
          key={isCreateOpen ? 'create' : 'idle'}
          open={isCreateOpen}
          onClose={handleCloseDrawer}
        />

        <AppointmentDrawer open={isEditOpen} appointmentId={drawerData.id} onClose={handleCloseDrawer} />
      </Box>
    </LocalizationProvider>
  )
}
