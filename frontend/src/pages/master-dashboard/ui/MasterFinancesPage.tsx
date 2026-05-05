import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import Chart from 'react-apexcharts'
import { useAppDispatch, useAppSelector } from '@app/store'
import {
  FinanceSource,
  useCreateExpenseCategoryMutation,
  useCreateExpenseMutation,
  useDeleteExpenseCategoryMutation,
  useDeleteExpenseMutation,
  useGetExpenseCategoriesQuery,
  useGetExpensesQuery,
  useGetFinanceSummaryQuery,
  useGetFinanceTrendQuery,
  useGetTopServicesQuery,
  useLazyExportNpdReportQuery,
} from '@entities/master-finances'
import { formatCurrency } from '@entities/master-finances/ui/formatCurrency'
import {
  setFinancesDateRange,
  setFinancesSource,
} from '@entities/master-finances/model/financesSlice'

const sources: { id: FinanceSource; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'personal', label: 'Личные' },
  { id: 'salon', label: 'Салонные' },
]

const defaultPageSize = 10

export function MasterFinancesPage() {
  const theme = useTheme()
  const dispatch = useAppDispatch()
  const { source, from, to } = useAppSelector(state => state.masterFinances)
  const [expensePage] = useState(1)
  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false)
  const [newExpenseAmount, setNewExpenseAmount] = useState('')
  const [newExpenseDate, setNewExpenseDate] = useState(new Date().toISOString().slice(0, 10))
  const [newExpenseCategory, setNewExpenseCategory] = useState<string>('')
  const [newExpenseDescription, setNewExpenseDescription] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [categoryEmoji, setCategoryEmoji] = useState('')
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7))
  const [exportError, setExportError] = useState<string | null>(null)

  const { data: summary } = useGetFinanceSummaryQuery({
    source,
    from,
    to,
  })
  const { data: trend, isLoading: trendLoading } = useGetFinanceTrendQuery({
    source,
    from,
    to,
  })
  const { data: topServices, isLoading: topLoading } = useGetTopServicesQuery({
    source,
    from,
    to,
  })
  const { data: categories, isLoading: categoriesLoading } = useGetExpenseCategoriesQuery()
  const { data: expensesData } = useGetExpensesQuery({
    from,
    to,
    page: expensePage,
    pageSize: defaultPageSize,
  })

  const [createExpense] = useCreateExpenseMutation()
  const [deleteExpense] = useDeleteExpenseMutation()
  const [createCategory] = useCreateExpenseCategoryMutation()
  const [deleteCategory] = useDeleteExpenseCategoryMutation()
  const [triggerExport, exportState] = useLazyExportNpdReportQuery()

  const trendSeries = useMemo(
    () => [
      {
        name: 'Доход',
        data: trend?.map(point => ({ x: point.date, y: point.incomeCents / 100 })) ?? [],
      },
      {
        name: 'Расход',
        data: trend?.map(point => ({ x: point.date, y: point.expenseCents / 100 })) ?? [],
      },
    ],
    [trend],
  )

  const chartOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false }, animations: { enabled: true } },
      xaxis: { type: 'category' as const },
      yaxis: { labels: { formatter: (value: number) => `${value.toFixed(0)} ₽` } },
      stroke: { curve: 'smooth' as const },
      markers: { size: 4 },
      legend: { position: 'top' as const },
      tooltip: { y: { formatter: (value: number) => `${value.toFixed(2)} ₽` } },
    }),
    [],
  )

  const topServicesData = useMemo(
    () => ({
      series: [
        { name: 'Доход', data: topServices?.map(service => service.incomeCents / 100) ?? [] },
      ],
      options: {
        chart: { toolbar: { show: false } },
        plotOptions: { bar: { horizontal: true, barHeight: '40%' } },
        xaxis: {
          categories: topServices?.map(service => service.serviceName) ?? [],
          labels: { formatter: (value: number) => `${value.toFixed(0)} ₽` },
        },
      },
    }),
    [topServices],
  )

  async function handleCreateExpense() {
    const amount = Number(newExpenseAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return
    }
    try {
      await createExpense({
        amountCents: Math.round(amount * 100),
        categoryId: newExpenseCategory || null,
        description: newExpenseDescription,
        expenseDate: newExpenseDate,
      }).unwrap()
      setExpenseDrawerOpen(false)
      setNewExpenseAmount('')
      setNewExpenseDescription('')
      setNewExpenseCategory('')
    } catch {
      /* ignore */
    }
  }

  async function handleCreateCategory() {
    if (!categoryName.trim()) return
    await createCategory({ name: categoryName.trim(), emoji: categoryEmoji.trim() || undefined })
    setCategoryName('')
    setCategoryEmoji('')
  }

  async function handleExport() {
    setExportError(null)
    try {
      const data = await triggerExport({ month: exportMonth }).unwrap()
      const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(file)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `npd-export-${exportMonth}.json`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      setExportError('Не удалось выгрузить отчет')
    }
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
        <FormControl sx={{ minWidth: 120 }}>
          <TextField
            label="С"
            type="date"
            value={from}
            onChange={e => dispatch(setFinancesDateRange({ from: e.target.value, to }))}
            InputLabelProps={{ shrink: true }}
          />
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <TextField
            label="По"
            type="date"
            value={to}
            onChange={e => dispatch(setFinancesDateRange({ from, to: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
        </FormControl>
        <ButtonGroup variant="outlined" sx={{ ml: 'auto' }}>
          {sources.map(item => (
            <Button
              key={item.id}
              variant={source === item.id ? 'contained' : 'outlined'}
              onClick={() => dispatch(setFinancesSource(item.id))}
            >
              {item.label}
            </Button>
          ))}
        </ButtonGroup>
        <Button variant="contained" onClick={() => setExpenseDrawerOpen(true)}>
          Добавить расход
        </Button>
        <Button variant="outlined" onClick={handleExport} disabled={exportState.isLoading}>
          Экспорт НПД
        </Button>
        <TextField
          label="Месяц отчета"
          type="month"
          value={exportMonth}
          onChange={e => setExportMonth(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color={theme.palette.text.secondary}>
              Доход
            </Typography>
            <Typography variant="h5">{formatCurrency(summary?.incomeCents ?? 0)}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color={theme.palette.text.secondary}>
              Расходы
            </Typography>
            <Typography variant="h5">{formatCurrency(summary?.expenseCents ?? 0)}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color={theme.palette.text.secondary}>
              Прибыль
            </Typography>
            <Typography variant="h5">{formatCurrency(summary?.profitCents ?? 0)}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" mb={2}>
              Тренд доходов и расходов
            </Typography>
            {trendLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Chart options={chartOptions} series={trendSeries} type="line" height={320} />
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" mb={2}>
              Топ услуг по доходу
            </Typography>
            {topLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Chart
                options={{
                  ...topServicesData.options,
                  tooltip: { y: { formatter: (value: number) => `${value.toFixed(2)} ₽` } },
                }}
                series={topServicesData.series}
                type="bar"
                height={320}
              />
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1">Расходы</Typography>
              <Typography variant="body2" color="text.secondary">
                {expensesData?.total ?? 0} записей
              </Typography>
            </Stack>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Дата</TableCell>
                  <TableCell>Категория</TableCell>
                  <TableCell>Сумма</TableCell>
                  <TableCell>Описание</TableCell>
                  <TableCell align="right">Действие</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(expensesData?.items ?? []).map(expense => (
                  <TableRow key={expense.id}>
                    <TableCell>{expense.expenseDate}</TableCell>
                    <TableCell>{expense.categoryName ?? 'Без категории'}</TableCell>
                    <TableCell>{formatCurrency(expense.amountCents)}</TableCell>
                    <TableCell>{expense.description || '-'}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="error"
                        onClick={() => void deleteExpense(expense.id)}
                      >
                        Удалить
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" mb={2}>
              Категории расходов
            </Typography>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  label="Имя"
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Emoji"
                  value={categoryEmoji}
                  onChange={e => setCategoryEmoji(e.target.value)}
                  size="small"
                  sx={{ width: 100 }}
                />
                <Button variant="contained" onClick={() => void handleCreateCategory()}>
                  Добавить
                </Button>
              </Stack>
              <Divider />
              {categoriesLoading ? (
                <CircularProgress size={24} />
              ) : (
                categories?.map(category => (
                  <Stack
                    key={category.id}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography>
                      {category.emoji ? `${category.emoji} ` : ''}
                      {category.name}
                    </Typography>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => void deleteCategory(category.id)}
                    >
                      Удалить
                    </Button>
                  </Stack>
                ))
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Drawer anchor="right" open={expenseDrawerOpen} onClose={() => setExpenseDrawerOpen(false)}>
        <Box sx={{ width: 360, p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h6">Новый расход</Typography>
          <TextField
            label="Сумма (₽)"
            type="number"
            value={newExpenseAmount}
            onChange={e => setNewExpenseAmount(e.target.value)}
            fullWidth
          />
          <TextField
            label="Дата"
            type="date"
            value={newExpenseDate}
            onChange={e => setNewExpenseDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel id="expense-category-label">Категория</InputLabel>
            <Select
              labelId="expense-category-label"
              value={newExpenseCategory}
              label="Категория"
              onChange={e => setNewExpenseCategory(e.target.value)}
            >
              <MenuItem value="">Без категории</MenuItem>
              {categories?.map(category => (
                <MenuItem key={category.id} value={category.id}>
                  {category.emoji ? `${category.emoji} ` : ''}
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Описание"
            value={newExpenseDescription}
            onChange={e => setNewExpenseDescription(e.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setExpenseDrawerOpen(false)}>Отмена</Button>
            <Button variant="contained" onClick={() => void handleCreateExpense()}>
              Сохранить
            </Button>
          </Box>
        </Box>
      </Drawer>

      {exportError && <Alert severity="error">{exportError}</Alert>}
    </Stack>
  )
}
