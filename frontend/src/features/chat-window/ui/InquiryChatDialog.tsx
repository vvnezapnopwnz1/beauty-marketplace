import { Dialog, DialogContent, DialogTitle, IconButton, useMediaQuery, useTheme as useMuiTheme } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { ChatWindow } from './ChatWindow'

interface Props {
  open: boolean
  onClose: () => void
  accessToken: string
  title?: string
}

export function InquiryChatDialog({ open, onClose, accessToken, title = 'Чат с салоном' }: Props) {
  const theme = useMuiTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          height: fullScreen ? '100%' : '600px',
          borderRadius: fullScreen ? 0 : '16px',
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {title}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, height: '100%', overflow: 'hidden' }}>
        <ChatWindow accessToken={accessToken} />
      </DialogContent>
    </Dialog>
  )
}
