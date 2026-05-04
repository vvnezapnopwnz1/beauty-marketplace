import { Box, Container, Grid, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { MockAppointmentList } from './mocks/MockAppointmentList';
import { MockCalendarStrip } from './mocks/MockCalendarStrip';
import { MockClientList } from './mocks/MockClientList';
import { MockServiceList } from './mocks/MockServiceList';
import { MockProfilePreview } from './mocks/MockProfilePreview';
import { MockInviteCard } from './mocks/MockInviteCard';
import { MockNotificationList } from './mocks/MockNotificationList';
import { MockPublicPagePreview } from './mocks/MockPublicPagePreview';

export function FeaturesSection() {
  const { t } = useTranslation();

  const features = [
    {
      title: t('forMasters.features.appointments.title'),
      description: t('forMasters.features.appointments.description'),
      component: <MockAppointmentList />,
    },
    {
      title: t('forMasters.features.calendar.title'),
      description: t('forMasters.features.calendar.description'),
      component: <MockCalendarStrip />,
    },
    {
      title: t('forMasters.features.clients.title'),
      description: t('forMasters.features.clients.description'),
      component: <MockClientList />,
    },
    {
      title: t('forMasters.features.services.title'),
      description: t('forMasters.features.services.description'),
      component: <MockServiceList />,
    },
    {
      title: t('forMasters.features.profile.title'),
      description: t('forMasters.features.profile.description'),
      component: <MockProfilePreview />,
    },
    {
      title: t('forMasters.features.invites.title'),
      description: t('forMasters.features.invites.description'),
      component: <MockInviteCard />,
    },
    {
      title: t('forMasters.features.notifications.title'),
      description: t('forMasters.features.notifications.description'),
      component: <MockNotificationList />,
    },
    {
      title: t('forMasters.features.publicPage.title'),
      description: t('forMasters.features.publicPage.description'),
      component: <MockPublicPagePreview />,
    },
  ];

  return (
    <Box id="features" sx={{ py: 8, mb: 8 }}>
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
          {t('forMasters.features.title')}
        </Typography>
        
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={6} lg={3} key={index}>
              <Box
                sx={{
                  backgroundColor: 'background.paper',
                  borderRadius: '24px',
                  p: 3,
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: 1,
                }}
              >
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600, 
                    mb: 1,
                    fontSize: 18,
                  }}
                >
                  {feature.title}
                </Typography>
                
                <Typography 
                  variant="body2" 
                  color="textSecondary" 
                  sx={{ mb: 2 }}
                >
                  {feature.description}
                </Typography>
                
                <Box sx={{ height: 180, overflow: 'hidden', borderRadius: 2 }}>
                  {feature.component}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}