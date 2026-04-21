import { Button, Typography } from '@mui/material'

const BadRequest = () => {
  return (
    <>
      <Typography fontSize={21} fontWeight={700} py={3}>
        Bad Request!
      </Typography>

      <Typography fontSize={16} fontWeight={400} width={400} textAlign={'center'}>
        Sorry, we couldn’t find the page you’re looking for. Perhaps you’ve mistyped the URL? Be
        sure to check your spelling.
      </Typography>

      {/* <Link to="/">
        <Button sx={{ mt: 2, borderRadius: 1.5 }} variant="contained">
          Go to Home page
        </Button>
      </Link> */}
    </>
  )
}

export default BadRequest
