import type { Theme } from '@mui/material/styles'
import { getDataGridDashboardSx } from '@shared/ui/DataGrid/dataGridDashboardSx'

export const getShowAppointmentsGridSx = (theme: Theme) => getDataGridDashboardSx(theme)
