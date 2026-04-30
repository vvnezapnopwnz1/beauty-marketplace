// @mui
import { Popover, PopoverOrigin } from '@mui/material'
//
import getPosition from './getPosition'
import { StyledArrow } from './styles'
import { MenuPopoverProps } from './types'

// ----------------------------------------------------------------------

export default function MenuPopover({
  open,
  children,
  arrow = 'bottom-left',
  disabledArrow,
  sx,
}: MenuPopoverProps) {
  const { style: _style, anchorOrigin, transformOrigin } = getPosition(arrow)

  return (
    <Popover
      open={Boolean(open)}
      anchorEl={open}
      anchorOrigin={anchorOrigin as PopoverOrigin}
      transformOrigin={transformOrigin as PopoverOrigin}
      sx={{
        ...sx,
      }}
    >
      {!disabledArrow && <StyledArrow arrow={arrow} />}

      {children}
    </Popover>
  )
}
