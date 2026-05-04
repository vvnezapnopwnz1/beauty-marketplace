import { Box } from '@mui/material';

export function MockProfilePreview() {
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
      <Box 
        sx={{ 
          width: 40, 
          height: 40, 
          borderRadius: '50%', 
          bgcolor: 'grey.300',
          alignSelf: 'center',
          mb: 2
        }} 
      />
      <Box 
        sx={{ 
          height: 12, 
          bgcolor: 'grey.200', 
          borderRadius: 1,
          width: '80%',
          mb: 1,
          alignSelf: 'center'
        }} 
      />
      <Box 
        sx={{ 
          height: 10, 
          bgcolor: 'grey.200', 
          borderRadius: 1,
          width: '60%',
          alignSelf: 'center'
        }} 
      />
    </Box>
  );
}