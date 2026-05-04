import { Box } from '@mui/material';

export function MockPublicPagePreview() {
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
          width: 32, 
          height: 32, 
          borderRadius: '50%', 
          bgcolor: 'primary.light',
          alignSelf: 'center',
          mb: 1
        }} 
      />
      <Box 
        sx={{ 
          height: 10, 
          bgcolor: 'grey.200', 
          borderRadius: 1,
          width: '90%',
          mb: 1,
          alignSelf: 'center'
        }} 
      />
      <Box 
        sx={{ 
          height: 8, 
          bgcolor: 'grey.200', 
          borderRadius: 1,
          width: '70%',
          alignSelf: 'center'
        }} 
      />
    </Box>
  );
}