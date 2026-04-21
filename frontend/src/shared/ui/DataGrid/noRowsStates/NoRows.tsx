import { Typography } from '@mui/material'

type NoRowsProps = {
  title?: string
  description?: string
}

const NoRows = ({ title, description }: NoRowsProps) => {
  const resolvedTitle = title ?? 'Table is empty.'
  const resolvedDescription = description ?? 'Upload or create data'

  return (
    <>
      <Typography fontSize={21} fontWeight={700} py={3}>
        {resolvedTitle}
      </Typography>

      <Typography fontSize={16} fontWeight={400} width={400} textAlign="center">
        {resolvedDescription}
      </Typography>
    </>
  )
}

export default NoRows
