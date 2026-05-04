import { Box, Container, Grid, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export function HowItWorksSection() {
  const { t } = useTranslation();

  const steps = [
    {
      number: 1,
      title: t('forMasters.howItWorks.step1.title'),
      description: t('forMasters.howItWorks.step1.description'),
    },
    {
      number: 2,
      title: t('forMasters.howItWorks.step2.title'),
      description: t('forMasters.howItWorks.step2.description'),
    },
    {
      number: 3,
      title: t('forMasters.howItWorks.step3.title'),
      description: t('forMasters.howItWorks.step3.description'),
    },
  ];

  return (
    <Box id="how-it-works" sx={{ py: 8, mb: 8 }}>
      <Container maxWidth="lg">
        <Typography 
          variant="h2" 
          component="h2" 
          align="center" 
          sx={{ 
            mb: 8,
            fontSize: { xs: 28, md: 36 },
            fontWeight: 700,
          }}
        >
          {t('forMasters.howItWorks.title')}
        </Typography>
        
        <Grid container spacing={4}>
          {steps.map((step, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '24px',
                  backgroundColor: 'background.paper',
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: 'primary.main',
                    color: 'common.white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 'bold',
                    mb: 2,
                  }}
                >
                  {step.number}
                </Box>
                
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600, 
                    mb: 1,
                    fontSize: 20,
                  }}
                >
                  {step.title}
                </Typography>
                
                <Typography variant="body1" color="textSecondary">
                  {step.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}