import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { useTranslation } from 'react-i18next';
import { ChatWindow } from '@features/chat-window';

interface Props {
    appointmentId: string;
    currentUserId?: string | null;
}

export function AppointmentChatSection({ appointmentId, currentUserId }: Props) {
    const { t } = useTranslation();
    return (
        <Accordion sx={{ mt: 2, borderRadius: 2, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <ChatBubbleOutlineIcon fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="subtitle2">{t('chat.title')}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
                <Box sx={{ height: 380 }}>
                    <ChatWindow appointmentId={appointmentId} currentUserId={currentUserId ?? undefined} />
                </Box>
            </AccordionDetails>
        </Accordion>
    );
}
