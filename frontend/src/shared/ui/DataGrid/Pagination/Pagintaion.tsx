import { TablePaginationProps, PaginationItem, useTheme } from '@mui/material';
import {
  gridPaginationModelSelector,
  gridPaginationRowCountSelector,
  useGridApiContext,
  useGridSelector,
} from '@mui/x-data-grid-premium';
import MuiPagination from '@mui/material/Pagination';
import Iconify from '@shared/ui/iconify';

function directionButtonBack() {
  return <Iconify icon="lucide:chevron-left" />;
}

function directionButtonForward() {
  return <Iconify icon="lucide:chevron-right" />;
}

const Pagintaion = (props: Pick<TablePaginationProps, 'page' | 'onPageChange' | 'className'>) => {
  const { page, onPageChange, className } = props;
  const theme = useTheme();

  const apiRef = useGridApiContext();
  const rowsCount = useGridSelector(apiRef, gridPaginationRowCountSelector);
  const { pageSize } = useGridSelector(apiRef, gridPaginationModelSelector);
  const pagesCount = Math.ceil(rowsCount / pageSize);
  return (
    <MuiPagination
      color="primary"
      className={className}
      count={pagesCount}
      page={page + 1}
      sx={{
        '.MuiPaginationItem-page': {
          // Стили для всех кнопок-цифр
          color: theme.palette.grey[600],
          fontWeight: 600,
          background: 'none !important',
          border: '1px solid',
          minWidth: '36px',
          height: '36px',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderColor: 'transparent !important',
          transition: 'border-color 0.05s',

          '&:hover': {
            borderColor: '#37415127 !important',
          },

          '&.Mui-selected': {
            color: theme.palette.grey[700],
            background: 'rgba(121, 128, 136, 0.08) !important',
            borderColor: '#374151 !important',
          },
        },
      }}
      // componentsProps={{
      //   pagination: {
      //     SelectProps: {
      //       // IconComponent: ArrowDropDownIcon,
      //     }
      //   }
      // }}

      renderItem={(item) => (
        <PaginationItem
          slots={{
            previous: directionButtonBack,
            next: directionButtonForward,
          }}
          {...item}
        />
      )}
      onChange={(event, newPage) => {
        onPageChange(event as any, newPage - 1);
      }}
    />
  );
};

export default Pagintaion;
