import { Autocomplete, Box, Chip, TextField } from '@mui/material'
import { V } from '@shared/theme/palettes'
import type { ClientTag } from '../model/types'

type TagsAutocompleteProps = {
  tags: ClientTag[]
  selectedTagIds: string[]
  onChange: (nextTagIds: string[]) => void
  placeholder?: string
}

export function TagsAutocomplete({
  tags,
  selectedTagIds,
  onChange,
  placeholder = 'Фильтр по тегам',
}: TagsAutocompleteProps) {
  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id))

  return (
    <Autocomplete
      multiple
      size="small"
      options={tags}
      value={selectedTags}
      onChange={(_, next) => onChange(next.map(tag => tag.id))}
      getOptionLabel={option => option.name}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      disableCloseOnSelect
      noOptionsText="Теги не найдены"
      sx={{
        minWidth: 260,
        '& .MuiOutlinedInput-root': {
          bgcolor: V.surface,
          borderRadius: V.rSm,
          color: V.text,
          fontSize: 12,
        },
      }}
      renderOption={(props, option, { selected }) => (
        <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: option.color,
              border: `1px solid ${option.color}`,
              flexShrink: 0,
            }}
          />
          <Box sx={{ flex: 1 }}>{option.name}</Box>
          {selected ? <Box sx={{ fontSize: 11, color: V.accent }}>Выбран</Box> : null}
        </Box>
      )}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => (
          <Chip
            {...getTagProps({ index })}
            key={option.id}
            label={option.name}
            size="small"
            sx={{
              bgcolor: option.color,
              color: '#fff',
              border: `1px solid ${option.color}`,
              fontWeight: 600,
              fontSize: 11,
            }}
          />
        ))
      }
      renderInput={params => <TextField {...params} placeholder={placeholder} />}
    />
  )
}
