import { Box, Stack } from '@mui/material';

export function MockNotificationList() {
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
        {[...Array(3)].map((_, i) => (
          <Box 
            key={i} 
            sx={{ 
              display: 'flex',
              alignItems: 'center',
              height: 24
            }}
          >
            <Box 
              sx={{ 
                width: 16, 
                height: 16, 
                borderRadius: '50%', 
                bgcolor: i === 0 ? 'primary.light' : 'grey.200',
                mr: 1
              }} 
            />
            <Box 
              sx={{ 
                height: 12, 
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