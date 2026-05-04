import { Accordion, AccordionDetails, AccordionSummary, Box, Container, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';

export function FaqSection() {
  const { t } = useTranslation();

  const faqs = [
    {
      question: t('forMasters.faq.q1.question'),
      answer: t('forMasters.faq.q1.answer'),
    },
    {
      question: t('forMasters.faq.q2.question'),
      answer: t('forMasters.faq.q2.answer'),
    },
    {
      question: t('forMasters.faq.q3.question'),
      answer: t('forMasters.faq.q3.answer'),
    },
    {
      question: t('forMasters.faq.q4.question'),
      answer: t('forMasters.faq.q4.answer'),
    },
    {
      question: t('forMasters.faq.q5.question'),
      answer: t('forMasters.faq.q5.answer'),
    },
    {
      question: t('forMasters.faq.q6.question'),
      answer: t('forMasters.faq.q6.answer'),
    },
  ];

  return (
    <Box id="faq" sx={{ py: 8, mb: 8 }}>
      <Container maxWidth="md">
        <Typography 
          variant="h2" 
          component="h2" 
          align="center" 
          sx={{ 
            mb: 6,
            fontSize: { xs: 28, md: 36 },
            fontWeight: 700,
          }}
        >
          {t('forMasters.faq.title')}
        </Typography>
        
        {faqs.map((faq, index) => (
          <Accordion 
            key={index}
            sx={{ 
              mb: 2,
              borderRadius: '16px !important',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                px: 3,
                py: 2,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {faq.question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 3, pb: 3 }}>
              <Typography variant="body1" color="textSecondary">
                {faq.answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Container>
    </Box>
  );
}