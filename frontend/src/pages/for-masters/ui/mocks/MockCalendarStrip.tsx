import { Box, Stack } from '@mui/material';

export function MockCalendarStrip() {
  return (
    <Box 
      sx={{ 
        height: '100%', 
        bgcolor: 'grey.50', 
        borderRadius: 2,
        p: 2,
        display: 'flex',
        alignItems: 'center'
      }}
      aria-hidden="true"
    >
      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ width: '100%' }}>
        {[...Array(7)].map((_, i) => (
          <Box 
            key={i} 
            sx={{ 
              flex: '1 1 0',
              aspectRatio: '1',
              bgcolor: i === 2 ? 'primary.light' : 'grey.200', 
              borderRadius: 1,
              m: 0.25
            }} 
          />
        ))}
      </Stack>
      
      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ width: '100%', mt: 1 }}>
        {[...Array(7)].map((_, i) => (
          <Box 
            key={i} 
            sx={{ 
              flex: '1 1 0',
              aspectRatio: '1',
              bgcolor: i === 4 ? 'secondary.light' : 'grey.200', 
              borderRadius: 1,
              m: 0.25
            }} 
          />
        ))}
      </Stack>
    </Box>
  );
}