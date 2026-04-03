import { AppBar, Toolbar, Typography, Button, Box, Stack } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@shared/config/routes'
import { COLORS } from '@shared/theme'

export function NavBar() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        height: 64,
        justifyContent: 'center',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 5 }, minHeight: '64px !important' }}>
        <Typography
          sx={{
            fontFamily: "'Fraunces', serif",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '-0.5px',
            color: COLORS.ink,
            cursor: 'pointer',
          }}
          onClick={() => navigate(ROUTES.HOME)}
        >
          beauti<Box component="span" sx={{ color: COLORS.accent }}>ca</Box>
        </Typography>

        <Stack component="ul" direction="row" gap={4} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {[t('nav.services'), t('nav.forBusinesses'), t('nav.giftCards')].map(label => (
            <Box
              key={label}
              component="li"
              sx={{
                fontSize: 14,
                color: COLORS.inkSoft,
                cursor: 'pointer',
                fontWeight: 400,
                transition: 'color 0.15s',
                '&:hover': { color: COLORS.ink },
              }}
            >
              {label}
            </Box>
          ))}
        </Stack>

        <Stack direction="row" gap={1.5} alignItems="center">
          <Button
            variant="text"
            onClick={() => navigate(ROUTES.LOGIN)}
            sx={{
              fontSize: 14,
              fontWeight: 500,
              color: COLORS.ink,
              px: 2,
              py: 1,
              borderRadius: 100,
              '&:hover': { bgcolor: COLORS.blushLight },
            }}
          >
            {t('nav.login')}
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate(ROUTES.DASHBOARD)}
            sx={{
              fontSize: 14,
              fontWeight: 500,
              bgcolor: COLORS.ink,
              color: COLORS.white,
              px: 2.5,
              py: 1.125,
              borderRadius: 100,
              '&:hover': { bgcolor: '#2e2a26' },
            }}
          >
            {t('nav.signUp')}
          </Button>
        </Stack>
      </Toolbar>
    </AppBar>
  )
}
