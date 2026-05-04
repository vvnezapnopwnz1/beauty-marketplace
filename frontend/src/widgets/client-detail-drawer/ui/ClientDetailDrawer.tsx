import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { useDashboardFormStyles } from '@pages/dashboard/theme/formStyles'
import {
  useAssignTagMutation,
  useDeleteClientMutation,
  useGetClientAppointmentsQuery,
  useGetClientByIdQuery,
  useGetClientTagsQuery,
  useRemoveTagMutation,
  useRestoreClientMutation,
  useUpdateClientMutation,
} from '@entities/client'
import { enqueueFormSnackbar } from '@shared/ui/FormSnackbar'
import { formatPhone, parseOptionalRuPhone, toRuE164 } from '@shared/lib/formatPhone'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждена',
  completed: 'Завершена',
  cancelled_by_salon: 'Отмена',
  no_show: 'Не пришёл',
}

const INITIAL_NOW_TS = Date.now()

function formatDt(s: string): string {
  return new Date(s).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export type ClientDetailDrawerProps = {
  open: boolean
  clientId: string | null
  onClose: () => void
}

export function ClientDetailDrawer({ open, clientId, onClose }: ClientDetailDrawerProps) {
  const d = useDashboardPalette()
  const { inputBaseSx, textareaSx } = useDashboardFormStyles()
  const sectionSx = {
    bgcolor: d.card,
    border: `1px solid ${d.borderSubtle}`,
    borderRadius: '14px',
    p: 2.25,
  }

  const { data: client, isLoading } = useGetClientByIdQuery(clientId ?? '', {
    skip: !open || !clientId,
  })
  const { data: allTags = [] } = useGetClientTagsQuery(undefined, { skip: !open })
  const { data: apptData } = useGetClientAppointmentsQuery(
    { clientId: clientId ?? '', page: 1, pageSize: 25 },
    { skip: !open || !clientId },
  )
  const appointments = useMemo(() => apptData?.items ?? [], [apptData?.items])
  const apptTotal = apptData?.total ?? 0

  const [updateClient, { isLoading: updateBusy }] = useUpdateClientMutation()
  const [deleteClient] = useDeleteClientMutation()
  const [restoreClient] = useRestoreClientMutation()
  const [assignTag] = useAssignTagMutation()
  const [removeTag] = useRemoveTagMutation()

  const [draft, setDraft] = useState<{
    clientId: string
    nameVal: string
    phoneVal: string
    extraContactVal: string
    notesVal: string
  } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const isDeleted = Boolean(client?.deletedAt)

  const formState = useMemo(() => {
    if (!client) return null
    if (draft && draft.clientId === client.id) return draft
    return {
      clientId: client.id,
      nameVal: client.displayName,
      phoneVal: formatPhone(client.phoneE164 ?? ''),
      extraContactVal: client.extraContact ?? '',
      notesVal: client.notes ?? '',
    }
  }, [client, draft])

  const dirty = useMemo(() => {
    if (!client || !formState || isDeleted) return false
    const nextPhoneNorm = toRuE164(formState.phoneVal) ?? ''
    const serverPhoneNorm = toRuE164(client.phoneE164 ?? '') ?? ''
    const nextExtraContact = formState.extraContactVal.trim()
    return (
      formState.nameVal.trim() !== client.displayName ||
      nextPhoneNorm !== serverPhoneNorm ||
      nextExtraContact !== (client.extraContact ?? '') ||
      formState.notesVal !== (client.notes ?? '')
    )
  }, [client, formState, isDeleted])

  async function saveChanges() {
    if (!clientId || !client || isDeleted) return
    if (!formState) return
    const trimmedName = formState.nameVal.trim()
    if (!trimmedName) {
      enqueueFormSnackbar('Укажите имя клиента', 'Error')
      return
    }
    const phoneParsedForSave = parseOptionalRuPhone(formState.phoneVal)
    if (!client.userId && phoneParsedForSave.kind !== 'valid') {
      enqueueFormSnackbar('Укажите корректный телефон', 'Error')
      return
    }
    try {
      await updateClient({
        id: clientId,
        body: {
          displayName: trimmedName,
          notes: formState.notesVal,
          ...(client.userId
            ? { extraContact: formState.extraContactVal.trim() }
            : {
                phoneE164:
                  phoneParsedForSave.kind === 'valid' ? phoneParsedForSave.e164 : '',
              }),
        },
      }).unwrap()
    } catch (e) {
      enqueueFormSnackbar(e instanceof Error ? e.message : 'Не удалось сохранить', 'Error')
    }
  }

  async function handleAssignTag(tagId: string) {
    if (!clientId || !client) return
    const has = client.tags.some(t => t.id === tagId)
    if (has) {
      await removeTag({ clientId, tagId })
    } else {
      await assignTag({ clientId, tagId })
    }
  }

  async function handleDelete() {
    if (!clientId) return
    await deleteClient(clientId)
    setDeleteDialogOpen(false)
    onClose()
  }

  async function handleRestore() {
    if (!clientId) return
    await restoreClient(clientId)
    onClose()
  }

  const [recentAppts, recentAppts90] = useMemo(() => {
    let last30 = 0
    let last90 = 0

    for (const appointment of appointments) {
      const days = (INITIAL_NOW_TS - new Date(appointment.startsAt).getTime()) / 86400000
      if (days <= 90) last90 += 1
      if (days <= 30) last30 += 1
    }

    return [last30, last90]
  }, [appointments])

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{ backdrop: { sx: { bgcolor: d.backdrop, backdropFilter: 'blur(4px)' } } }}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: '520px' },
            maxWidth: '100%',
            bgcolor: d.page,
            borderLeft: `1px solid ${d.border}`,
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 3,
              py: 2,
              borderBottom: `1px solid ${d.borderSubtle}`,
              bgcolor: d.card,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: d.text, lineHeight: 1.2 }}>
                Клиент
              </Typography>
              <Typography sx={{ fontSize: 12, color: d.mutedDark }}>Просмотр и редактирование</Typography>
            </Box>
            <IconButton
              onClick={onClose}
              size="small"
              sx={{ color: d.mutedDark, bgcolor: d.control, '&:hover': { bgcolor: d.controlHover } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 3 }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={28} sx={{ color: d.accent }} />
              </Box>
            ) : !client || !formState ? (
              <Typography sx={{ color: d.muted }}>Клиент не найден</Typography>
            ) : (
              <Stack spacing={3}>
                {!isDeleted && (
                  <Box>
                    <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>Имя</Typography>
                    <TextField
                      value={formState.nameVal}
                      onChange={e =>
                        setDraft(prev => ({
                          clientId: client.id,
                          nameVal: e.target.value,
                          phoneVal:
                            prev?.clientId === client.id ? prev.phoneVal : formatPhone(client.phoneE164 ?? ''),
                          extraContactVal:
                            prev?.clientId === client.id ? prev.extraContactVal : (client.extraContact ?? ''),
                          notesVal: prev?.clientId === client.id ? prev.notesVal : (client.notes ?? ''),
                        }))
                      }
                      fullWidth
                      size="small"
                      placeholder="Имя клиента"
                      sx={inputBaseSx}
                    />
                  </Box>
                )}

                {isDeleted && (
                  <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: d.text }}>
                    {client.displayName}
                  </Typography>
                )}

                <Box sx={sectionSx}>
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: d.mutedDark,
                      mb: 1.25,
                    }}
                  >
                    Контакт
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography sx={{ color: d.mutedDark, fontSize: 13, minWidth: 120 }}>Телефон</Typography>
                      {client.userId ? (
                        <Typography sx={{ color: d.text, fontSize: 13 }}>{client.userPhone ?? '—'}</Typography>
                      ) : (
                        <TextField
                          value={formState.phoneVal}
                          onChange={e =>
                            setDraft(prev => ({
                              clientId: client.id,
                              nameVal:
                                prev?.clientId === client.id ? prev.nameVal : client.displayName,
                              phoneVal: formatPhone(e.target.value),
                              extraContactVal:
                                prev?.clientId === client.id ? prev.extraContactVal : (client.extraContact ?? ''),
                              notesVal: prev?.clientId === client.id ? prev.notesVal : (client.notes ?? ''),
                            }))
                          }
                          disabled={isDeleted}
                          size="small"
                          placeholder="+7 (___) ___ - __ - __"
                          inputMode="numeric"
                          sx={{ width: 220, ...inputBaseSx }}
                        />
                      )}
                    </Box>
                    {client.userId ? (
                      <>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography sx={{ color: d.mutedDark, fontSize: 13, minWidth: 120 }}>Аккаунт</Typography>
                          <Typography sx={{ color: d.green ?? d.accent, fontSize: 13 }}>
                            {client.userDisplayName ?? 'Зарегистрирован'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <Typography sx={{ color: d.mutedDark, fontSize: 13, minWidth: 120 }}>
                            Доп. контакт
                          </Typography>
                          <TextField
                            value={formState.extraContactVal}
                            onChange={e =>
                              setDraft(prev => ({
                                clientId: client.id,
                                nameVal:
                                  prev?.clientId === client.id ? prev.nameVal : client.displayName,
                                phoneVal:
                                  prev?.clientId === client.id ? prev.phoneVal : formatPhone(client.phoneE164 ?? ''),
                                extraContactVal: e.target.value,
                                notesVal: prev?.clientId === client.id ? prev.notesVal : (client.notes ?? ''),
                              }))
                            }
                            disabled={isDeleted}
                            size="small"
                            placeholder="Телефон или контакт для связи"
                            sx={{ width: 260, ...inputBaseSx }}
                          />
                        </Box>
                      </>
                    ) : null}
                  </Stack>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  {[
                    { label: 'Всего визитов', value: client.visitCount },
                    { label: 'За 30 дней', value: recentAppts },
                    { label: 'За 90 дней', value: recentAppts90 },
                  ].map(s => (
                    <Box
                      key={s.label}
                      sx={{
                        ...sectionSx,
                        p: 1.75,
                        flex: 1,
                        textAlign: 'center',
                      }}
                    >
                      <Typography sx={{ fontSize: 22, fontWeight: 700, color: d.accent }}>{s.value}</Typography>
                      <Typography sx={{ fontSize: 12, color: d.muted }}>{s.label}</Typography>
                    </Box>
                  ))}
                </Stack>

                <Box sx={sectionSx}>
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: d.mutedDark,
                      mb: 1.25,
                    }}
                  >
                    Теги
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
                    {allTags.map(tag => {
                      const active = client.tags.some(t => t.id === tag.id)
                      return (
                        <Chip
                          key={tag.id}
                          label={tag.name}
                          size="small"
                          onClick={() => void handleAssignTag(tag.id)}
                          sx={{
                            bgcolor: active ? tag.color : d.control,
                            color: active ? '#fff' : d.text,
                            border: `1px solid ${tag.color}`,
                            cursor: 'pointer',
                            fontWeight: active ? 600 : 400,
                            borderRadius: '8px',
                          }}
                        />
                      )
                    })}
                  </Stack>
                </Box>

                <Box sx={sectionSx}>
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: d.mutedDark,
                      mb: 1.25,
                    }}
                  >
                    Заметки
                  </Typography>
                  <TextField
                    multiline
                    minRows={3}
                    fullWidth
                    value={formState.notesVal}
                    onChange={e =>
                      setDraft(prev => ({
                        clientId: client.id,
                        nameVal: prev?.clientId === client.id ? prev.nameVal : client.displayName,
                        phoneVal:
                          prev?.clientId === client.id ? prev.phoneVal : formatPhone(client.phoneE164 ?? ''),
                        extraContactVal:
                          prev?.clientId === client.id ? prev.extraContactVal : (client.extraContact ?? ''),
                        notesVal: e.target.value,
                      }))
                    }
                    disabled={isDeleted}
                    placeholder="Заметки о клиенте..."
                    sx={textareaSx}
                  />
                </Box>

                <Box sx={sectionSx}>
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: d.mutedDark,
                      mb: 1.25,
                    }}
                  >
                    История визитов ({apptTotal})
                  </Typography>
                  {appointments.length === 0 ? (
                    <Typography sx={{ color: d.muted, fontSize: 14 }}>Визиты не найдены</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {appointments.map(a => (
                        <Box
                          key={a.id}
                          sx={{
                            px: 1.25,
                            py: 1,
                            borderRadius: '10px',
                            border: `1px solid ${d.borderSubtle}`,
                            bgcolor: d.page,
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" gap={1} alignItems="center">
                            <Typography sx={{ fontSize: 12, color: d.mutedDark }}>{formatDt(a.startsAt)}</Typography>
                            <Typography
                              component="span"
                              sx={{
                                fontSize: 11,
                                px: 1,
                                py: 0.25,
                                borderRadius: '999px',
                                bgcolor:
                                  a.status === 'completed'
                                    ? 'rgba(78,205,196,.15)'
                                    : a.status === 'pending'
                                      ? 'rgba(255,217,61,.15)'
                                      : 'rgba(255,255,255,.07)',
                                color:
                                  a.status === 'completed'
                                    ? d.blue ?? d.accent
                                    : a.status === 'pending'
                                      ? d.yellow ?? d.accent
                                      : d.muted,
                              }}
                            >
                              {STATUS_LABELS[a.status] ?? a.status}
                            </Typography>
                          </Stack>
                          <Typography sx={{ fontSize: 13, color: d.text, fontWeight: 600, mt: 0.5 }}>
                            {a.serviceName}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: d.mutedDark }}>
                            Мастер: {a.staffName ?? '—'}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Stack>
            )}
          </Box>

          <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${d.borderSubtle}`, bgcolor: d.card }}>
            {client && formState && (
              <Stack spacing={1}>
                {!isDeleted && (
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={
                      !dirty ||
                      updateBusy ||
                      !formState.nameVal.trim() ||
                      (!client.userId &&
                        parseOptionalRuPhone(formState.phoneVal).kind !== 'valid')
                    }
                    onClick={() => void saveChanges()}
                    sx={{
                      bgcolor: d.accent,
                      color: d.onAccent,
                      py: 1,
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: 15,
                      textTransform: 'none',
                      boxShadow: `0 4px 14px ${d.accent}40`,
                      '&:hover': {
                        bgcolor: d.accent,
                        boxShadow: `0 6px 20px ${d.accent}60`,
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.2s',
                    }}
                  >
                    {updateBusy ? 'Сохранение...' : 'Сохранить изменения'}
                  </Button>
                )}
                {isDeleted ? (
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => void handleRestore()}
                    sx={{
                      borderColor: d.green,
                      color: d.green,
                      py: 1,
                      borderRadius: '12px',
                      fontWeight: 600,
                      textTransform: 'none',
                    }}
                  >
                    Восстановить клиента
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setDeleteDialogOpen(true)}
                    sx={{
                      borderColor: d.red,
                      color: d.red,
                      py: 1,
                      borderRadius: '12px',
                      fontWeight: 600,
                      textTransform: 'none',
                      '&:hover': { bgcolor: `${d.red}10`, borderColor: d.red },
                    }}
                  >
                    Удалить клиента
                  </Button>
                )}
              </Stack>
            )}
          </Box>
        </Box>
      </Drawer>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Удалить клиента?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 14 }}>
            Клиент будет скрыт из базы. Его можно восстановить через «Показать неактивные».
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" color="error" onClick={() => void handleDelete()}>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

    </>
  )
}
