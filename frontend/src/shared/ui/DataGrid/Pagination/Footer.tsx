import { ReactNode } from 'react';
import { Box, Container, Typography, useTheme } from '@mui/material';
import { GridPagination, GridRowSelectionModel, useGridApiContext } from '@mui/x-data-grid-premium';
import Pagination from './Pagintaion';
import Iconify from '@shared/ui/iconify';

const CustomSelectIcon = (props: any) => {
  return <Iconify icon="iconamoon:arrow-down-2" {...props} />;
};

function CenteredPagination(props: any) {
  return (
    <GridPagination
      ActionsComponent={Pagination}
      {...props}
      SelectProps={{
        IconComponent: CustomSelectIcon,
      }}
    />
  );
}

interface Props {
  renderStartFooter: ReactNode;
  pagination?: boolean;
  keepNonExistentRowsSelected?: boolean;
  userItemsSelected?: GridRowSelectionModel;
  handleUserItemsSelected?: (items: GridRowSelectionModel) => void;
}

function ExtendedFooter(props: Props) {
  const api = useGridApiContext();
  const theme = useTheme();
  const selectedRows = api.current.getSelectedRows();
  const totalRows = api.current.getRowsCount();
  const {
    renderStartFooter,
    pagination,
    keepNonExistentRowsSelected,
    userItemsSelected,
    handleUserItemsSelected,
  } = props;

  const paginationNode = <CenteredPagination sx={{ flex: '2.5' }} {...props} />;

  return (
    <Container
      maxWidth={false}
      sx={{
        borderTop: `1px solid ${theme.palette.grey[400]} `,
        backgroundColor: theme.palette.primary.lighter,
        display: 'flex',
        justifyContent: 'space-between',
        justifyItems: 'start',
        alignItems: 'center',
        height: '60px',
        px: '10px',
        borderRadius: ' 0 0 8px 8px',
      }}
    >
      {selectedRows?.size > 0 || userItemsSelected?.length ? (
        <Box flex="1" display="flex" alignItems="center" gap="16px" height={40}>
          {!userItemsSelected?.length && (
            <Typography variant="body2">Selected: {selectedRows.size}</Typography>
          )}
          {renderStartFooter && renderStartFooter}
        </Box>
      ) : (
        <Box flex="1" height={40} />
      )}
      {(pagination && paginationNode) || <>Total elements: {totalRows}</>}
    </Container>
  );
}

export default ExtendedFooter;
