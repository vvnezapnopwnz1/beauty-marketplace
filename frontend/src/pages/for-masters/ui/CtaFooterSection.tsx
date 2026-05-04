import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@shared/config/routes';

export function CtaFooterSection() {
  const { t } = useTranslation();

  return (
    <Box id="cta-footer" sx={{ py: 8, mb: 4 }}>
      <Container maxWidth="md">
        <Typography 
          variant="h2" 
          component="h3" 
          align="center" 
          sx={{ 
            mb: 4,
            fontSize: { xs: 24, md: 32 },
            fontWeight: 700,
          }}
        >
          {t('forMasters.cta.title')}
        </Typography>
        
        <Typography 
          variant="h6" 
          align="center" 
          color="textSecondary" 
          sx={{ mb: 5 }}
        >
          {t('forMasters.cta.subtitle')}
        </Typography>
        
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={2} 
          justifyContent="center"
          alignItems="center"
          sx={{ mb: 3 }}
        >
          <Button 
            variant="contained" 
            size="large"
            href={ROUTES.LOGIN}
            sx={{ minWidth: 180 }}
          >
            {t('forMasters.cta.primaryCta')}
          </Button>
        </Stack>
        
        <Typography 
          variant="body2" 
          align="center" 
          color="textSecondary"
        >
          {t('forMasters.cta.salonOwnerText')}{' '}
          <Button 
            component="a" 
            href={ROUTES.JOIN}
            variant="text"
            size="small"
            sx={{ 
              color: 'primary.main',
              p: 0,
              minWidth: 'auto',
              verticalAlign: 'baseline',
            }}
          >
            {t('forMasters.cta.salonOwnerLink')}
          </Button>
        </Typography>
      </Container>
    </Box>
  );
}