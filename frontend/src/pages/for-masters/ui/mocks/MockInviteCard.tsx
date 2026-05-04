import { Box, Stack } from '@mui/material';

export function MockInviteCard() {
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
      <Box 
        sx={{ 
          height: 16, 
          bgcolor: 'grey.200', 
          borderRadius: 1,
          width: '70%',
          mb: 2
        }} 
      />
      <Stack direction="row" spacing={1}>
        <Box 
          sx={{ 
            width: 24, 
            height: 24, 
            borderRadius: '50%', 
            bgcolor: 'primary.light'
          }} 
        />
        <Box 
          sx={{ 
            height: 14, 
            bgcolor: 'grey.200', 
            borderRadius: 1,
            flex: 1,
            alignSelf: 'center'
          }} 
        />
      </Stack>
    </Box>
  );
}