import { Button, Typography } from '@mui/material'

const Forbidden = () => {
  return (
    <>
      <Typography fontSize={21} fontWeight={700} py={3}>
        Access Denied
      </Typography>

      <Typography fontSize={16} fontWeight={400} width={400} textAlign={'center'}>
        Sorry, you don't have permission to access this page. Please contact your administrator if
        you believe this is an error.
      </Typography>

      {/* <Link to="/">
        <Button sx={{ mt: 2, borderRadius: 1.5 }} variant="contained">
          Go to Home page
        </Button>
      </Link> */}
    </>
  )
}

export default Forbidden
