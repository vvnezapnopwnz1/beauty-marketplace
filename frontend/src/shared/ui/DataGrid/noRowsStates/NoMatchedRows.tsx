import { Typography } from '@mui/material'

const NoMatchedRows = () => {
  return (
    <>
      <Typography fontSize={21} fontWeight={700} py={3}>
        Nothing to show
      </Typography>

      <Typography fontSize={16} fontWeight={400} width={400} textAlign={'center'}>
        Please reload page or flush selected filters
      </Typography>
    </>
  )
}

export default NoMatchedRows
