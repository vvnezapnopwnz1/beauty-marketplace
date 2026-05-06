import { Badge, Drawer, Fab } from '@mui/material';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import { useState, type ReactNode } from 'react';

export interface ChatTriggerProps {
    unreadCount?: number;
    children: ReactNode;
    drawerWidth?: number;
}

export function ChatTrigger({ unreadCount = 0, children, drawerWidth = 380 }: ChatTriggerProps) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Fab
                color="error"
                sx={{
                    position: 'fixed',
                    right: 24,
                    bottom: 24,
                    zIndex: (t) => t.zIndex.modal + 1,
                }}
                onClick={() => setOpen((v) => !v)}
                aria-label="Открыть чат"
            >
                <Badge
                    badgeContent={unreadCount}
                    color="default"
                    overlap="circular"
                    invisible={!unreadCount}
                >
                    <ChatBubbleIcon />
                </Badge>
            </Fab>
            <Drawer
                anchor="right"
                open={open}
                onClose={() => setOpen(false)}
                slotProps={{
                    paper: { sx: { width: { xs: '100vw', sm: drawerWidth } } },
                }}
            >
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {children}
                </div>
            </Drawer>
        </>
    );
}
