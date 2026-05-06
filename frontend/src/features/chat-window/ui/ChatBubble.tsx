import { Box, Typography } from '@mui/material';
import type { ChatMessage } from '@entities/chat';

interface Props {
    msg: ChatMessage;
    isOwn: boolean;
}

export function ChatBubble({ msg, isOwn }: Props) {
    if (msg.isSystem) {
        return (
            <Box sx={{ alignSelf: 'center', my: 0.75 }}>
                <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontStyle: 'italic' }}
                >
                    {msg.body}
                </Typography>
            </Box>
        );
    }
    return (
        <Box
            sx={{
                alignSelf: isOwn ? 'flex-end' : 'flex-start',
                bgcolor: isOwn ? 'primary.main' : 'grey.100',
                color: isOwn ? 'primary.contrastText' : 'text.primary',
                px: 1.5,
                py: 1,
                borderRadius: 2,
                maxWidth: '78%',
                my: 0.25,
            }}
        >
            <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
                {msg.body}
            </Typography>
            <Typography
                variant="caption"
                sx={{ opacity: 0.6, display: 'block', mt: 0.25 }}
            >
                {new Date(msg.createdAt).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                })}
            </Typography>
        </Box>
    );
}
