import { Box, IconButton, TextField } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useState } from 'react';

export interface ChatComposerProps {
    disabled?: boolean;
    placeholder?: string;
    onSubmit: (body: string) => Promise<void>;
}

export function ChatComposer({ disabled, placeholder, onSubmit }: ChatComposerProps) {
    const [value, setValue] = useState('');
    const [busy, setBusy] = useState(false);

    const handleSubmit = async () => {
        const trimmed = value.trim();
        if (!trimmed || busy) return;
        setBusy(true);
        try {
            await onSubmit(trimmed);
            setValue('');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                gap: 1,
                p: 1,
                borderTop: '1px solid',
                borderColor: 'divider',
            }}
        >
            <TextField
                fullWidth
                size="small"
                multiline
                maxRows={4}
                value={value}
                disabled={disabled || busy}
                placeholder={placeholder ?? 'Сообщение…'}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSubmit();
                    }
                }}
            />
            <IconButton
                color="primary"
                onClick={() => void handleSubmit()}
                disabled={disabled || busy || !value.trim()}
            >
                <SendIcon />
            </IconButton>
        </Box>
    );
}
