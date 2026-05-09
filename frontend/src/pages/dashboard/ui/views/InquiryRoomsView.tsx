import { Box, Typography, List, ListItemButton, ListItemText, Badge, CircularProgress, alpha, Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useListSalonInquiryRoomsQuery, useGetUnreadCountsQuery, ChatRoom } from '@entities/chat';
import { getActiveSalonId } from '@shared/lib/activeSalon';
import { useState } from 'react';
import { InquiryChatDrawer } from '../drawers/InquiryChatDrawer';

export function InquiryRoomsView() {
    const { t } = useTranslation();
    const salonId = getActiveSalonId();
    const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);

    const { data: rooms, isLoading } = useListSalonInquiryRoomsQuery(
        { salonId: salonId ?? '' },
        { skip: !salonId, pollInterval: 30000 }
    );

    const roomIds = (rooms ?? []).map((r) => r.id);
    const { data: unreadCounts } = useGetUnreadCountsQuery(roomIds, {
        skip: roomIds.length === 0,
        pollInterval: 10000,
    });

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!rooms || rooms.length === 0) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">{t('chat.noInquiries')}</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
                {t('chat.inquiryChat')}
            </Typography>
            
            <List sx={{ bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden', boxShadow: (theme) => `0 4px 20px ${alpha(theme.palette.common.black, 0.05)}` }}>
                {rooms.map((room, index) => (
                    <Box key={room.id}>
                        {index > 0 && <Divider />}
                        <ListItemButton 
                            onClick={() => setSelectedRoom(room)}
                            sx={{ 
                                py: 2,
                                px: 3,
                                '&:hover': { bgcolor: 'primary.50' }
                            }}
                        >
                            <ListItemText
                                primary={`Чат #${room.id.slice(-6).toUpperCase()}`}
                                secondary={`${t('chat.unreadMessages')}: ${unreadCounts?.[room.id] ?? 0}`}
                                primaryTypographyProps={{ fontWeight: unreadCounts?.[room.id] ? 700 : 500 }}
                            />
                            <Badge 
                                badgeContent={unreadCounts?.[room.id]} 
                                color="primary" 
                                sx={{ ml: 2 }}
                            />
                        </ListItemButton>
                    </Box>
                ))}
            </List>

            <InquiryChatDrawer 
                room={selectedRoom} 
                onClose={() => setSelectedRoom(null)} 
            />
        </Box>
    );
}
