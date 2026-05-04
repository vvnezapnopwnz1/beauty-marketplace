import { Box, Stack } from '@mui/material';

export function MockServiceList() {
  return (
    <Box 
      sx={{ 
        height: '100%', 
        bgcolor: 'grey.50', 
        borderRadius: 2,
        p: 2
      }}
      aria-hidden="true"
    >
      <Stack spacing={1}>
        {[...Array(4)].map((_, i) => (
          <Box 
            key={i} 
            sx={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: 20
            }}
          >
            <Box 
              sx={{ 
                height: 14, 
                bgcolor: 'grey.200', 
                borderRadius: 1,
                width: `${60 + i * 5}%`
              }} 
            />
            <Box 
              sx={{ 
                height: 14, 
                bgcolor: i % 2 === 0 ? 'primary.light' : 'secondary.light', 
                borderRadius: 1,
                width: 30
              }} 
            />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}