import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import {
  approveClaim,
  fetchAdminClaims,
  rejectClaim,
  type AdminClaimItem,
} from '@shared/api/claimApi'
import { NavBar } from '@shared/ui/Navbar/NavBar'

export function AdminClaimsPage() {
  const [claims, setClaims] = useState<AdminClaimItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setActionError(null)
    try {
      const res = await fetchAdminClaims('pending')
      setClaims(res.items)
      setTotal(res.total)
    } catch {
      setError('Не удалось загрузить заявки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleApprove = async (id: string) => {
    setActionLoading(true)
    setActionError(null)
    try {
      await approveClaim(id)
      await load()
    } catch (e: unknown) {
      setActionError((e as Error).message || 'Не удалось одобрить заявку')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return
    setActionLoading(true)
    setActionError(null)
    try {
      await rejectClaim(id, rejectReason)
      setRejectingId(null)
      setRejectReason('')
      await load()
    } catch (e: unknown) {
      setActionError((e as Error).message || 'Не удалось отклонить заявку')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <NavBar />
      <Box sx={{ maxWidth: 900, mx: 'auto', px: 2, py: 4 }}>
        <Typography variant="h5" sx={{ fontFamily: "'Fraunces', serif", mb: 1 }}>
          Заявки на салоны
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Pending: {total}
        </Typography>

        {loading && <CircularProgress />}
        {error && <Alert severity="error">{error}</Alert>}
        {actionError && <Alert severity="error">{actionError}</Alert>}

        <Stack gap={2}>
          {claims.map(claim => (
            <Box
              key={claim.id}
              sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography fontWeight={700} fontSize={16}>
                    {claim.place.name}
                  </Typography>
                  {claim.place.address && (
                    <Typography variant="body2" color="text.secondary">
                      {claim.place.address}
                    </Typography>
                  )}
                  {claim.place.phone && (
                    <Typography variant="body2" color="text.secondary">
                      {claim.place.phone}
                    </Typography>
                  )}
                </Box>
                <Chip
                  label={claim.relationType}
                  size="small"
                  variant="outlined"
                  sx={{ textTransform: 'capitalize' }}
                />
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="body2">
                <strong>Заявитель:</strong> {claim.user.displayName ?? '-'} · {claim.user.phone}
              </Typography>
              {claim.comment && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  "{claim.comment}"
                </Typography>
              )}
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ mt: 0.5, display: 'block' }}
              >
                {new Date(claim.createdAt).toLocaleString('ru-RU')}
              </Typography>

              {rejectingId === claim.id ? (
                <Stack direction="row" gap={1} mt={1.5} alignItems="center">
                  <TextField
                    size="small"
                    placeholder="Причина отклонения"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    disabled={!rejectReason.trim() || actionLoading}
                    onClick={() => handleReject(claim.id)}
                  >
                    Подтвердить
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setRejectingId(null)
                      setRejectReason('')
                    }}
                  >
                    Отмена
                  </Button>
                </Stack>
              ) : (
                <Stack direction="row" gap={1} mt={1.5}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    disabled={actionLoading}
                    onClick={() => handleApprove(claim.id)}
                  >
                    Одобрить
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => setRejectingId(claim.id)}
                  >
                    Отклонить
                  </Button>
                </Stack>
              )}
            </Box>
          ))}

          {!loading && claims.length === 0 && (
            <Typography color="text.secondary">Нет pending-заявок.</Typography>
          )}
        </Stack>
      </Box>
    </Box>
  )
}
