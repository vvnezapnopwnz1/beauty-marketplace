import { Box, Tooltip } from '@mui/material'
import { GridColDef } from '@mui/x-data-grid-premium'
import { type DashboardAppointment } from '@entities/appointment'
import { V } from '@shared/theme/palettes'
import { getServiceColor } from '@shared/lib/getServiceColor'
import { InitialsAvatar } from '../ui/InitialsAvatar'
import StatusChip from '../ui/StatusChip'
import ActionBtn from '../ui/ActionButton'

type OnStatusChange = (id: string, status: string) => Promise<void>

export async function setApptStatus(id: string, s: string, onStatusChange: OnStatusChange) {
  try {
    await onStatusChange(id, s)
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'Ошибка')
  }
}

export const columns = ({ onStatusChange }: { onStatusChange: OnStatusChange }) =>
  [
    {
      field: 'startsAt',
      headerName: 'Дата и время',
      width: 160,
      sortable: true,
      renderCell: ({ value }) => {
        if (!value) return <Box sx={{ color: V.textMuted, fontSize: 12 }}>—</Box>
        const dt = new Date(value as string)
        return (
          <Box display="flex" flexDirection="row" alignItems="center" gap={0.5}>
            <Box sx={{ fontSize: 12, fontWeight: 600, color: V.text, lineHeight: 1.4 }}>
              {dt.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </Box>
            <Box sx={{ fontSize: 11, color: V.textMuted }}>
              {String(dt.getHours()).padStart(2, '0')}:{String(dt.getMinutes()).padStart(2, '0')}
            </Box>
          </Box>
        )
      },
    },
    {
      field: 'clientLabel',
      headerName: 'Клиент',
      flex: 1,
      minWidth: 200,
      sortable: true,
      renderCell: ({ row }) => (
        <Box display="flex" flexDirection="row" alignItems="center" gap={0.5}>
          <InitialsAvatar name={row.clientLabel ?? '?'} size={28} />
          <Box
            sx={{ minWidth: 0 }}
            display="flex"
            flexDirection="row"
            alignItems="center"
            gap={0.25}
          >
            <Box
              sx={{
                fontWeight: 600,
                fontSize: 12,
                color: V.text,
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {row.clientLabel}
            </Box>
            {row.clientPhone && (
              <Box sx={{ fontSize: 10, color: V.textMuted }}>{row.clientPhone}</Box>
            )}
          </Box>
        </Box>
      ),
    },
    {
      field: 'serviceName',
      headerName: 'Услуга',
      width: 210,
      sortable: true,
      renderCell: ({ value }) => {
        const svcColor = getServiceColor((value as string) ?? '')
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Box
              sx={{ width: 3, height: 24, borderRadius: '2px', bgcolor: svcColor, flexShrink: 0 }}
            />
            <Tooltip title={value as string} placement="top" enterDelay={400}>
              <Box
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: 12,
                  color: V.text,
                }}
              >
                {value as string}
              </Box>
            </Tooltip>
          </Box>
        )
      },
    },
    {
      field: 'staffName',
      headerName: 'Мастер',
      width: 170,
      sortable: false,
      renderCell: ({ value }) => {
        if (!value) return <Box sx={{ fontSize: 12, color: V.textMuted }}>—</Box>
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <InitialsAvatar name={value as string} size={24} />
            <Box
              sx={{
                fontSize: 12,
                color: V.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {value as string}
            </Box>
          </Box>
        )
      },
    },
    {
      field: 'status',
      headerName: 'Статус',
      width: 145,
      sortable: true,
      renderCell: ({ value }) => <StatusChip status={value as string} />,
    },
    {
      field: 'actions',
      headerName: 'Действия',
      width: 290,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: ({ row }) => (
        <Box
          sx={{ display: 'flex', gap: '6px', alignItems: 'center' }}
          onClick={e => e.stopPropagation()}
        >
          <ActionBtn
            label="Подтвердить"
            color={V.success}
            bg={V.successSoft}
            disabled={
              row.status === 'confirmed' ||
              row.status === 'completed' ||
              row.status === 'cancelled_by_salon'
            }
            onClick={() => void setApptStatus(row.id, 'confirmed', onStatusChange)}
          />
          <ActionBtn
            label="Отменить"
            color={V.error}
            bg={V.errorSoft}
            disabled={row.status === 'cancelled_by_salon' || row.status === 'completed'}
            onClick={() => void setApptStatus(row.id, 'cancelled_by_salon', onStatusChange)}
          />
        </Box>
      ),
    },
  ] as GridColDef<DashboardAppointment>[]
