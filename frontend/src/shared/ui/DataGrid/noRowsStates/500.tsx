import { Button, Typography } from '@mui/material'

const Server = () => {
  return (
    <>
      <Typography fontSize={21} fontWeight={700} py={3}>
        Internal server error
      </Typography>

      <Typography fontSize={16} fontWeight={400} width={400} textAlign={'center'}>
        The server encountered an internal error and was unable to process your request.
      </Typography>

      {/* <Link to="/">
        <Button sx={{ mt: 2, borderRadius: 1.5 }} variant="contained">
          Go to Home page
        </Button>
      </Link> */}
    </>
  )
}

export default Server
