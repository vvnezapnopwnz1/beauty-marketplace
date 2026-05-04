import { Box, Stack, Typography } from '@mui/material';

export function MockAppointmentList() {
  return (
    <Box 
      sx={{ 
        height: '100%', 
        bgcolor: 'grey.50', 
        borderRadius: 2,
        p: 2,
        overflow: 'hidden'
      }}
      aria-hidden="true"
    >
      <Stack spacing={1}>
        {[...Array(4)].map((_, i) => (
          <Box 
            key={i} 
            sx={{ 
              height: 24, 
              bgcolor: i % 3 === 0 ? 'primary.light' : 'grey.200', 
              borderRadius: 1,
              width: `${80 - i * 10}%`
            }} 
          />
        ))}
      </Stack>
    </Box>
  );
}