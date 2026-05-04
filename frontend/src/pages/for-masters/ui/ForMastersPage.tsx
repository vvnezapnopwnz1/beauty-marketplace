import { Box, Container, Typography, useTheme } from '@mui/material';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavBar } from '@shared/ui/Navbar/NavBar';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { HowItWorksSection } from './HowItWorksSection';
import { FaqSection } from './FaqSection';
import { CtaFooterSection } from './CtaFooterSection';

export function ForMastersPage() {
  const { t } = useTranslation();
  const theme = useTheme();

  // Set document title
  useEffect(() => {
    document.title = t('forMasters.pageTitle') || 'Для мастеров';
  }, [t]);

  return (
    <Box 
      minHeight="100vh" 
      bgcolor={theme.palette.background.default}
    >
      <NavBar />
      <Container 
        maxWidth="lg" 
        sx={{ 
          py: { xs: 4, md: 8 },
          borderRadius: '24px',
        }}
      >
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <FaqSection />
        <CtaFooterSection />
      </Container>
    </Box>
  );
}