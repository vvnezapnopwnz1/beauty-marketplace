import { SyntheticEvent, useMemo, useState } from 'react'
import { Box, Button, IconButton, Stack, Tab, useTheme } from '@mui/material'
import { useMatch, useNavigate } from 'react-router-dom'
import { useGetStaffByIdQuery } from '@entities/staff'
import { StaffListView } from './StaffListView'
import { StaffDetailView } from './StaffDetailView'
import { TabContext, TabList, TabPanel } from '@mui/lab'
import CloseIcon from '@mui/icons-material/Close'
import { StaffFormModal } from '../modals/StaffFormModal'

export function StaffTabsView() {
  const theme = useTheme()
  const dashboard = theme.palette.dashboard
  const navigate = useNavigate()
  const staffMatch = useMatch('/dashboard/staff/:staffId')
  const staffId = staffMatch?.params.staffId ?? null
  const { data: staff } = useGetStaffByIdQuery(staffId ?? '', {
    skip: !staffId,
    refetchOnMountOrArgChange: true,
  })

  const activeTab = staffId ? 'details' : 'list'
  const detailLabel = useMemo(() => staff?.displayName ?? 'Мастер', [staff])

  const handleTabChange = (_: SyntheticEvent, value: 'list' | 'details') => {
    if (value === 'list') {
      navigate('/dashboard?section=staff')
      return
    }
    if (staffId) {
      navigate(`/dashboard/staff/${staffId}`)
    }
  }

  const [modalOpen, setModalOpen] = useState(false)

  return (
    <TabContext value={activeTab}>
      <Box>
        <Box
          sx={{
            borderBottom: `1px solid ${dashboard.grid}`,
            px: 1,
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <TabList onChange={handleTabChange} aria-label="Staff tabs">
            <Tab label="Мастера" value="list" />
            <Tab
              label={
                <Stack direction="row" alignItems="center" gap={1}>
                  {detailLabel}
                  {staffId && (
                    <IconButton
                      sx={{
                        cursor: 'pointer',
                        color: dashboard.accent,
                        bgcolor: dashboard.control,
                      }}
                      size="small"
                      onClick={() => navigate('/dashboard?section=staff')}
                    >
                      <CloseIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  )}
                </Stack>
              }
              value="details"
              disabled={!staffId}
            />
          </TabList>
          {activeTab === 'list' && (
            <Button
              size="small"
              sx={{
                bgcolor: dashboard.accent,
                color: dashboard.onAccent,
                px: 1.5,
                py: 0.5,
                borderRadius: '8px',
                '&:hover': { bgcolor: dashboard.accentDark },
              }}
              onClick={() => setModalOpen(true)}
            >
              + Добавить мастера
            </Button>
          )}
        </Box>
        <TabPanel value="list">
          <StaffListView onSelectStaff={(id: string) => navigate(`/dashboard/staff/${id}`)} />
        </TabPanel>
        <TabPanel value="details">
          {staffId ? <StaffDetailView staffId={staffId} /> : null}
        </TabPanel>
      </Box>
      <StaffFormModal
        open={modalOpen}
        staffId={null}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false)
        }}
      />
    </TabContext>
  )
}
