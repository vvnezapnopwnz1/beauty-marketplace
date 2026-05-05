import { useEffect, useMemo, useState } from 'react'
import { Autocomplete, Box, CircularProgress, TextField, type SxProps, type Theme } from '@mui/material'
import type { MasterClientDTO } from '../model/masterDashboardApi'
import { useLazyGetMasterClientsQuery } from '../model/masterDashboardApi'

type MasterClientAsyncAutocompleteProps = {
  clientName: string
  selectedClient: MasterClientDTO | null
  onClientNameChange: (value: string) => void
  onSelectedClientChange: (client: MasterClientDTO | null) => void
  onClientPhoneFill?: (phone: string) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  textFieldSx?: SxProps<Theme>
}

export function MasterClientAsyncAutocomplete({
  clientName,
  selectedClient,
  onClientNameChange,
  onSelectedClientChange,
  onClientPhoneFill,
  label = 'Клиент',
  placeholder = 'Введите имя или выберите клиента',
  disabled,
  textFieldSx,
}: MasterClientAsyncAutocompleteProps) {
  const [inputValue, setInputValue] = useState(clientName)
  const [options, setOptions] = useState<MasterClientDTO[]>([])
  const [triggerSearch, { isFetching }] = useLazyGetMasterClientsQuery()

  useEffect(() => {
    setInputValue(clientName)
  }, [clientName])

  useEffect(() => {
    if (disabled) return
    const search = inputValue.trim()
    const timer = setTimeout(() => {
      void triggerSearch({ search: search || undefined, page: 1, pageSize: 20 })
        .unwrap()
        .then(res => setOptions(res.items ?? []))
        .catch(() => setOptions([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [inputValue, triggerSearch, disabled])

  const value = useMemo(() => {
    if (selectedClient) return selectedClient
    return inputValue
  }, [inputValue, selectedClient])

  return (
    <Autocomplete<MasterClientDTO, false, false, true>
      freeSolo
      options={options}
      value={value}
      disabled={disabled}
      inputValue={inputValue}
      filterOptions={x => x}
      isOptionEqualToValue={(option, val) => typeof val !== 'string' && option.id === val.id}
      getOptionLabel={option => (typeof option === 'string' ? option : option.displayName)}
      onInputChange={(_, next, reason) => {
        setInputValue(next)
        if (reason === 'clear') {
          onClientNameChange('')
          onSelectedClientChange(null)
          return
        }
        onClientNameChange(next)
        if (selectedClient && selectedClient.displayName !== next) {
          onSelectedClientChange(null)
        }
      }}
      onChange={(_, next) => {
        if (typeof next === 'string') {
          onSelectedClientChange(null)
          onClientNameChange(next)
          setInputValue(next)
          return
        }
        if (!next) {
          onSelectedClientChange(null)
          onClientNameChange('')
          setInputValue('')
          return
        }
        onSelectedClientChange(next)
        onClientNameChange(next.displayName)
        setInputValue(next.displayName)
        onClientPhoneFill?.(next.phone ?? '')
      }}
      noOptionsText="Клиенты не найдены"
      loadingText="Поиск клиентов..."
      loading={isFetching}
      renderOption={(props, option) => (
        <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Box sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', minWidth: 0, flex: 1 }}>
            {option.displayName}
          </Box>
          <Box sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>{option.phone || '—'}</Box>
        </Box>
      )}
      renderInput={params => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          sx={textFieldSx}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isFetching ? <CircularProgress size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  )
}
