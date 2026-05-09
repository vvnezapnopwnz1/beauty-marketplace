import { Drawer, Box, IconButton, Typography, Divider } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { ChatWindow } from '@features/chat-window';
import { ChatRoom } from '@entities/chat';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@app/store';
import { selectUser } from '@features/auth-by-phone/model/authSlice';

interface Props {
    room: ChatRoom | null;
    onClose: () => void;
}

export function InquiryChatDrawer({ room, onClose }: Props) {
    const { t } = useTranslation();
    const user = useAppSelector(selectUser);

    return (
        <Drawer
            anchor="right"
            open={Boolean(room)}
            onClose={onClose}
            PaperProps={{
                sx: { width: { xs: '100%', sm: 450 }, display: 'flex', flexDirection: 'column' }
            }}
        >
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">
                    {room ? `Чат #${room.id.slice(-6).toUpperCase()}` : t('chat.inquiryChat')}
                </Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </Box>
            <Divider />
            
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                {room && (
                    <ChatWindow 
                        roomIdOverride={room.id}
                        roomStatusOverride={room.status}
                        roomTypeOverride={room.type}
                        currentUserId={user?.id}
                    />
                )}
            </Box>
        </Drawer>
    );
}
