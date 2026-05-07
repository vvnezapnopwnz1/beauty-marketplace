import { Box, CircularProgress, Container, Paper, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetRoomByTokenQuery } from '@entities/chat';
import { ChatWindow } from '@features/chat-window';

export default function GuestChatPage() {
    const { t } = useTranslation();
    const { accessToken } = useParams<{ accessToken: string }>();
    const room = useGetRoomByTokenQuery(accessToken ?? '', { skip: !accessToken });

    if (!accessToken) {
        return (
            <Container maxWidth="sm" sx={{ py: 3 }}>
                <Typography>{t('chat.empty')}</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="sm" sx={{ py: 3 }}>
            <Typography variant="h6" gutterBottom>
                {t('chat.title')}
            </Typography>
            <Paper sx={{ height: { xs: 'calc(100vh - 160px)', sm: 600 } }}>
                <Box sx={{ height: '100%' }}>
                    {room.isLoading || !room.data ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : (
                        <ChatWindow
                            accessToken={accessToken}
                            roomIdOverride={room.data.id}
                            roomStatusOverride={room.data.status}
                            lockedOverride={room.data.lockedUntilFirstReply}
                        />
                    )}
                </Box>
            </Paper>
        </Container>
    );
}
