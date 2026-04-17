import { Link, Stack, Typography } from '@mui/material'
import type { SalonContactRow } from '@entities/salon'

function toHref(row: SalonContactRow): string {
  if (row.type === 'phone') return `tel:${row.value}`
  if (row.type === 'email') return `mailto:${row.value}`
  if (row.type === 'website') return row.value.startsWith('http') ? row.value : `https://${row.value}`
  return row.value
}

export function SalonContactList({ contactRows }: { contactRows: SalonContactRow[] }) {
  return (
    <Stack gap={1.2}>
      {contactRows.map((row, idx) => (
        row.type === 'phone' || row.type === 'email' || row.type === 'website' ? (
          <Link key={`${row.type}-${idx}`} href={toHref(row)} target="_blank" rel="noreferrer" underline="hover">
            <Typography sx={{ fontSize: 14 }}>
              {(row.label ?? row.type).toUpperCase()}: {row.value}
            </Typography>
          </Link>
        ) : (
          <Typography key={`${row.type}-${idx}`} sx={{ fontSize: 14 }}>
            {(row.label ?? row.type).toUpperCase()}: {row.value}
          </Typography>
        )
      ))}
    </Stack>
  )
}
