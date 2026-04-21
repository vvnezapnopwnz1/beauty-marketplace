import { forwardRef } from 'react'
import { Icon, addAPIProvider } from '@iconify/react'
import { Box, type BoxProps } from '@mui/material'
import { type IconifyProps } from './types'
import { ICONIFY_API_URL } from '@shared/config/config-global'

interface Props extends BoxProps {
  icon: IconifyProps
}

addAPIProvider('local', {
  resources: [ICONIFY_API_URL],
})

const Iconify = forwardRef<SVGElement, Props>(({ icon, width = 20, sx, ...other }, ref) => (
  <Box
    ref={ref}
    component={Icon}
    icon={'local:' + icon}
    sx={{ width, height: width, ...sx }}
    {...other}
  />
))

export default Iconify
