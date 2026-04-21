import { useEffect, useState } from 'react'
import NotFound from './404'
import Forbidden from './403'
import {
  gridFilterModelSelector,
  useGridApiContext,
  useGridSelector,
} from '@mui/x-data-grid-premium'
import NoRows from './NoRows'
import Server from './500'
import NoMatchedRows from './NoMatchedRows'
import BadRequest from './400'

interface Props {
  status?: number
  title?: string
}

const EmptyState = ({ status, title }: Props) => {
  const [variant, setVariant] = useState<string>()
  const apiContext = useGridApiContext()
  const { items, quickFilterValues } = useGridSelector(apiContext, gridFilterModelSelector)

  useEffect(() => {
    const hasFilter = !!items.length || !!quickFilterValues?.length
    if (!status) return setVariant(hasFilter ? 'noRows' : 'empty')
    if (status == 500) return setVariant('500')
    if (status == 404) return setVariant('404')
    if (status == 403) return setVariant('403')
    if (status == 400) return setVariant('400')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  switch (variant) {
    case 'empty':
      return <NoRows title={title} description="" />
    case '403':
      return <Forbidden />
    case '404':
      return <NotFound />
    case '400':
      return <BadRequest />
    case '500':
      return <Server />
    case 'noRows':
      return <NoMatchedRows />
  }
}

export default EmptyState
