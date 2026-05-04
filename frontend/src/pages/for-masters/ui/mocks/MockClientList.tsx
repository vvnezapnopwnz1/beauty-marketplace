import { Box, Stack } from '@mui/material';

export function MockClientList() {
  return (
    <Box 
      sx={{ 
        height: '100%', 
        bgcolor: 'grey.50', 
        borderRadius: 2,
        p: 2,
        display: 'flex',
        flexDirection: 'column'
      }}
      aria-hidden="true"
    >
      <Stack spacing={1}>
        {[...Array(3)].map((_, i) => (
          <Box 
            key={i} 
            sx={{ 
              display: 'flex',
              alignItems: 'center',
              height: 30
            }}
          >
            <Box 
              sx={{ 
                width: 24, 
                height: 24, 
                borderRadius: '50%', 
                bgcolor: 'grey.300',
                mr: 1
              }} 
            />
            <Box 
              sx={{ 
                height: 16, 
                bgcolor: 'grey.200', 
                borderRadius: 1,
                flex: 1
              }} 
            />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}