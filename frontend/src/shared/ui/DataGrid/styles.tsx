import { styled, alpha } from '@mui/material/styles'
import { DataGridPremium } from '@mui/x-data-grid-premium'
import { HEADER } from '@shared/config/config-global'
import { DashboardPalette } from '@shared/theme'

interface Props {
  heightOffset?: number
  hideToolbar?: boolean
  minHeight?: number
  /** Доп. пиксели под тулбар/заголовки (напр. при column grouping), чтобы virtualScroller не вытеснял скроллбар за экран */
  extraHeaderOffset?: number
  dashboardPalette?: DashboardPalette
}

const DataGrid = styled(DataGridPremium)<Props>(
  ({
    theme,
    heightOffset = 0,
    hideToolbar,
    rows,
    minHeight = 0,
    extraHeaderOffset = 0,
    dashboardPalette,
  }) => ({
    border: `1px solid ${dashboardPalette?.border}`,
    borderRadius: '10px',
    backgroundColor: dashboardPalette?.card,
    color: dashboardPalette?.text,
    fontFamily: 'inherit',
    '& .MuiDataGrid-columnHeaders': {
      backgroundColor: dashboardPalette?.gridHeader,
      borderBottom: `1px solid ${dashboardPalette?.border}`,
      borderRadius: '10px 10px 0 0',
    },
    '& .MuiDataGrid-columnHeaderTitle': {
      fontWeight: 600,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '.4px',
      color: dashboardPalette?.muted,
    },
    '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
      outline: 'none',
    },
    minHeight: `max(calc(97vh - ${HEADER.H_DASHBOARD_DESKTOP}px - ${heightOffset}px), ${minHeight}px)`,
    maxHeight: `calc(97vh - ${HEADER.H_DASHBOARD_DESKTOP}px - ${heightOffset}px)`,

    '*': {
      borderColor: 'inherit !important',
    },
    '.MuiDataGrid-row:last-child .MuiDataGrid-cell': {
      borderBottom: 'none',
    },
    '.MuiDataGrid-virtualScroller': {
      minHeight: `calc(97vh - ${HEADER.H_DASHBOARD_DESKTOP}px - ${
        (hideToolbar ? 122 : 195) + extraHeaderOffset
      }px - ${heightOffset}px)`,
      flex: 1,
    },

    '.MuiDataGrid-pinnedColumns--right': {
      boxShadow: '0px 4px 16px 0px #C6D0F4', // TODO! цвет вынести
      borderLeft: '1px solid',
      borderRight: '1px solid',
    },

    '.MuiDataGrid-columnHeadersInner .MuiDataGrid-columnHeader.MuiDataGrid-withBorderColor:last-child':
      {
        border: 'none',
      },

    '.MuiDataGrid-pinnedColumns.MuiDataGrid-pinnedColumns--right .MuiDataGrid-cell': {
      borderRight: '1px solid',

      '&:last-child': {
        borderRight: 'none',
      },
    },

    // ****************headers start
    '.MuiDataGrid-pinnedColumnHeaders': {
      height: '100%',
      boxShadow: 'none',
      borderRight: '1px solid',
      '&--right': {
        borderLeft: '1px solid',
        paddingRight: `${(rows?.length && rows.length > 13 && '9px') || '0px'} !important`,
        borderRight: 'none',
        '.MuiDataGrid-columnHeader:last-child': {
          borderRight: 'none',
        },
      },
      '& .MuiDataGrid-columnHeaderTitle': {
        fontWeight: '400',
      },
    },
    // Нижние pinned rows (Progress Steps и т.д.) — не сжимать и не скрывать
    '.MuiDataGrid-pinnedRows--bottom': {
      flexShrink: 0,
      minHeight: 0,
    },
    '.MuiDataGrid-columnHeader:focus-within, .MuiDataGrid-cell:focus-within': {
      outline: 'none',
      background: alpha(theme.palette.primary.light, 0.5),
    },
    '.MuiDataGrid-columnHeaders': {
      borderBottom: `1px solid`,
      zIndex: theme.zIndex.mobileStepper - 1,
      borderRadius: '0',
    },
    '.MuiDataGrid-columnHeader--withRightBorder': {
      borderRight: `1px solid`,
    },
    '.MuiDataGrid-pinnedColumnHeaders.MuiDataGrid-pinnedColumnHeaders--left .MuiDataGrid-columnHeader--withRightBorder':
      {
        borderRight: 'none',
      },
    '.MuiDataGrid-columnHeaderTitleContainerContent': {
      fontWeight: '600 !important',
      width: '100%',
      height: '100%',

      '.MuiBox-root': {
        display: 'grid',
        gridTemplateColumns: 'minmax(60px, 1fr) max-content',
        alignItems: 'center',
        overflow: 'visible',
        minWidth: 0,
        whiteSpace: 'initial',
        lineHeight: 'normal',
        width: '100%',
        height: '100%',
      },

      '.MuiTypography-root': {
        fontWeight: '600 !important',
      },

      '.MuiDataGrid-columnHeaderTitle': {
        fontWeight: '600 !important',
      },
    },
    // Высота строки заголовков больше только при наличии work step колонок
    '& .MuiDataGrid-columnHeaders:has(.ws-header)': {
      '& .MuiDataGrid-columnHeader:not(.ws-header) .MuiDataGrid-columnHeaderTitleContainerContent':
        {
          justifyContent: 'center',
        },
    },

    // ***************headers end

    '& .MuiDataGrid-virtualScroller ': {
      '@supports(overflow: overlay)': {
        overflow: 'overlay',
      },
      overflow: 'overlay',
      scrollbarGutter: 'auto',
      '& + div': {
        // watermark: none
        display: 'none',
        // marginTop: "0 !important"
      },
      '::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
        backgroundColor: theme.palette.grey[300],
        outline: 'none',
      },
      ':hover::-webkit-scrollbar': {
        backgroundColor: theme.palette.grey[300],
      },
      ':hover::-webkit-scrollbar-thumb': {
        backgroundColor: theme.palette.grey[500],
        borderRadius: '15px',
        border: 'none',
      },
      '::-webkit-scrollbar-thumb': {
        backgroundColor: theme.palette.grey[500],
        outline: 'none',
        borderRadius: '15px',
        border: 'none',
      },
    },
    '& .cellInputField div, .cellSelectField div': {
      borderRadius: 4,
      backgroundColor: theme.palette.common.white,
      border: `1px solid`,
      fontSize: 12,
      padding: '0px 10px',
      display: 'flex',
      alignItems: 'center',
      height: '70%',
      width: '100%',
      justifyContent: 'space-between',
    },
    '.row--inactive': {
      color: `${theme.palette.grey[500]} !important`,
    },
    '& .cellSwtichField svg': {
      borderRadius: 4,
      backgroundColor: theme.palette.common.white,
      border: `1px solid ${theme.palette.grey[400]}`,
      padding: '7px',
      width: '40px',
      height: '70%',
    },
    '& .cellSelectField .MuiDataGrid-cellContent:after': {
      display: 'block',
      content: `""`,
      backgroundSize: '10px 10px',
      height: '10px',
      width: '10px',
    },
    '& .cellSelectField div div': {
      border: 'none',
    },
    '& .cellSelectField div fieldset': {
      border: 'none',
    },
    '& .MuiTablePagination-toolbar': {
      overflow: 'auto',
    },
    '& .MuiTablePagination-toolbar nav': {
      order: -1,
      [theme.breakpoints.up('lg')]: {
        marginRight: '1vw',
        minWidth: '380px',
      },
      [theme.breakpoints.up('xl')]: {
        minWidth: '480px',
      },
    },
    // '& .MuiDataGrid-columnHeader:last-child': {
    //   border: 'none',
    // },
    '& .ColumnHeaderActions div': {
      fontWeight: 400,
      wordBreak: 'break-word',
      whiteSpace: 'inherit',
      lineHeight: 'normal',
    },
    '.MuiDataGrid-columnHeaderCheckbox .MuiDataGrid-columnHeaderTitleContainerContent': {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    '.MuiDataGrid-columnHeaderCheckbox .MuiDataGrid-columnHeaderTitleContainerContent .MuiCheckbox-root':
      {
        width: '44px',
      },
    '.css-18rgrra': {
      color: theme.palette.primary.main,
    },
    '[data-field="isDummy"]': {
      justifyContent: 'start',
    },
    // wrapper intialized over no results overlay in empty state
    ' & .MuiDataGrid-overlayWrapperInner div': {
      width: 'min(400px, 50%) !important',
      height: 'min(400px, 50%) !important',
    },
    '& .MuiDataGrid-overlayWrapperInner': {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
    '&.MuiDataGrid-root .MuiDataGrid-cell:focus': {
      outline: 'none',
    },
    '& .rowSpanCell': {
      paddingLeft: 0,
      paddingRight: 0,
    },
    '& .MuiDataGrid-columnSeparator': { color: dashboardPalette?.border },
    '& .MuiDataGrid-row': {
      borderBottom: `1px solid ${dashboardPalette?.borderSubtle}`,
      cursor: 'pointer',
      transition: 'background .12s',
      '&:hover': { backgroundColor: dashboardPalette?.controlHover },
      '&.Mui-selected': { backgroundColor: `${dashboardPalette?.accent}14` },
      '&.Mui-selected:hover': { backgroundColor: `${dashboardPalette?.accent}1e` },
    },
    '& .MuiDataGrid-cell': {
      // borderBottom: 'none',
      color: dashboardPalette?.text,
      display: 'flex',
      alignItems: 'center',
      '&:focus, &:focus-within': { outline: 'none' },
    },
  }),
)

export default DataGrid
