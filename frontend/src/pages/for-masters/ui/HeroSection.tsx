import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@shared/config/routes';

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <Box 
      id="hero" 
      sx={{ 
        py: { xs: 6, md: 10 }, 
        textAlign: 'center',
        mb: 8,
      }}
    >
      <Container maxWidth="md">
        <Typography 
          variant="h1" 
          component="h1"
          sx={{
            fontFamily: 'Fraunces, serif',
            fontSize: { xs: 36, sm: 48, md: 64 },
            fontWeight: 700,
            lineHeight: 1.1,
            mb: 3,
          }}
        >
          {t('forMasters.hero.title')}
        </Typography>
        
        <Typography 
          variant="h5" 
          sx={{ 
            color: 'text.secondary', 
            mb: 5,
            maxWidth: '600px',
            mx: 'auto',
          }}
        >
          {t('forMasters.hero.subtitle')}
        </Typography>
        
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={2} 
          justifyContent="center"
          alignItems="center"
        >
          <Button 
            variant="contained" 
            size="large"
            href={ROUTES.LOGIN}
            sx={{ minWidth: 180 }}
          >
            {t('forMasters.hero.primaryCta')}
          </Button>
          
          <Button 
            variant="outlined" 
            size="large"
            href="#features"
            sx={{ minWidth: 180 }}
          >
            {t('forMasters.hero.secondaryCta')}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}