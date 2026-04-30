import { forwardRef } from 'react'
import { Icon } from '@iconify/react'
import { Box, type BoxProps } from '@mui/material'
import { type IconifyProps } from './types'

interface Props extends BoxProps {
  icon: IconifyProps
}

const Iconify = forwardRef<SVGElement, Props>(({ icon, width = 20, sx, ...other }, ref) => (
  <Box ref={ref} component={Icon} icon={icon} sx={{ width, height: width, ...sx }} {...other} />
))

export default Iconify
