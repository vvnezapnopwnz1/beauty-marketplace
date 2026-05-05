---
name: frontend-react-fsd
description: 'Frontend development with React 19, Redux Toolkit, RTK Query, MUI, and Feature Sliced Design. Use when building components, pages, API integration, forms, and state management in the Beauty Marketplace frontend. Covers architecture patterns, best practices, code organization, and full-stack workflows using the project''s tech stack.'
argument-hint: 'Describe the component, feature, or page to build. Include context about state, API interaction, or form handling if applicable.'
user-invocable: true
---

# Frontend React + FSD Workflow

## Tech Stack

- **React** 19.2 + TypeScript
- **State**: Redux Toolkit + React-Redux
- **API**: RTK Query for server state
- **UI**: Material-UI (MUI) v7 + MUI X Data Grid / Date Pickers
- **Forms**: React Hook Form + Yup validation
- **Routing**: React Router v7
- **Build**: Vite
- **Architecture**: Feature Sliced Design (FSD)
- **Utilities**: Framer Motion, ApexCharts, i18n, notistack (toast)

## When to Use

- Building new components, pages, or features
- Integrating with backend APIs using RTK Query
- Managing form state with React Hook Form
- Organizing code following FSD patterns
- Implementing data tables, date pickers, modals
- Adding state management and caching strategies
- Debugging type safety issues in TypeScript

## Architecture: Feature Sliced Design (FSD)

FSD organizes code into logical **slices** (features), each self-contained with its own layers. This improves scalability and cross-team collaboration.

### Folder Structure

```
src/
├── app/                    # App initialization, routing, global providers
│   ├── App.tsx
│   ├── router.tsx          # React Router configuration
│   └── store.tsx           # Redux store setup
├── shared/                 # Shared utilities, components, types (no business logic)
│   ├── ui/                 # Reusable UI components (Button, Modal, etc.)
│   ├── utils/              # Helpers, formatters
│   ├── types/              # Shared types/interfaces
│   └── api/                # Shared API utilities (e.g., axios instance)
├── entities/               # Core business entities (User, Salon, Appointment, etc.)
│   ├── user/
│   │   ├── model/          # Redux slices, types, constants
│   │   ├── ui/             # Entity-scoped UI components
│   │   └── api/            # RTK Query hooks
│   └── salon/
│       ├── model/
│       ├── ui/
│       └── api/
├── features/               # User-facing features (complex business logic)
│   ├── auth/
│   │   ├── AuthFlow.tsx    # Feature component
│   │   ├── model/          # Feature slices, types
│   │   ├── ui/             # UI components for auth
│   │   └── api/            # Feature-specific RTK Query
│   └── appointment-booking/
│       ├── components/     # Complex composable components
│       ├── model/
│       ├── ui/
│       └── api/
└── pages/                  # Page/route components (typically simple wrappers)
    ├── LoginPage.tsx
    └── DashboardPage.tsx
```

**Layer rules:**
- **Deepest imports allowed upward** (pages → features → entities → shared)
- **No circular deps** (enforce with eslint-plugin-import)
- Each layer exports via `index.ts`

### Best Practices

1. **Keep model/ minimal**: Redux slices, types, constants only.
2. **UI stays in ui/**: Reusable components, export via `index.ts`.
3. **API in api/**: RTK Query `useQuery`/`useMutation` hooks.
4. **Share via public exports**: Each feature has `index.ts` for external consumption.

## Redux Toolkit + RTK Query Patterns

### Setup Redux Store

```typescript
// app/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { userReducer } from '@entities/user';
import { appointmentReducer } from '@entities/appointment';
import { baseApi } from '@shared/api';

export const store = configureStore({
  reducer: {
    user: userReducer,
    appointment: appointmentReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

export type AppState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### RTK Query API Integration

Define RTK Query endpoints in **entities** or **features** API folders. Use TS generics for type safety.

```typescript
// entities/user/api/userApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { User, LoginPayload, LoginResponse } from '../model/types';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    credentials: 'include',
  }),
  tagTypes: ['User'],
  endpoints: (builder) => ({
    getMe: builder.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
    login: builder.mutation<LoginResponse, LoginPayload>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const { useGetMeQuery, useLoginMutation } = userApi;
```

### Usage in Components

```typescript
// features/auth/AuthFlow.tsx
import { useLoginMutation } from '@entities/user';
import { useDispatch } from 'react-redux';

export const AuthFlow = () => {
  const [login, { isLoading }] = useLoginMutation();

  const handleLogin = async (email: string, password: string) => {
    try {
      const result = await login({ email, password }).unwrap();
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return <form onSubmit={handleLogin}>{/* Form JSX */}</form>;
};
```

## React Hook Form + Yup Validation

### Setup Validation Schema

```typescript
// entities/appointment/model/validation.ts
import * as yup from 'yup';

export const appointmentSchema = yup.object().shape({
  serviceId: yup.string().required('Service is required'),
  date: yup.date().required('Date is required').typeError('Invalid date'),
  time: yup.string().required('Time is required'),
  notes: yup.string().max(500, 'Notes too long').optional(),
});

export type AppointmentFormData = yup.InferType<typeof appointmentSchema>;
```

### Form with MUI Integration

```typescript
// features/appointment-booking/AppointmentForm.tsx
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { TextField, Button, Box } from '@mui/material';
import { appointmentSchema, AppointmentFormData } from '@entities/appointment';

export const AppointmentForm = () => {
  const { control, handleSubmit, formState: { errors } } = useForm<AppointmentFormData>({
    resolver: yupResolver(appointmentSchema),
  });

  const onSubmit = (data: AppointmentFormData) => {
    // Handle form submission
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="serviceId"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Service"
            error={!!errors.serviceId}
            helperText={errors.serviceId?.message}
            fullWidth
          />
        )}
      />
      <Button type="submit" variant="contained">
        Book Appointment
      </Button>
    </Box>
  );
};
```

## MUI Data Grid Integration

### Usage Pattern

```typescript
// features/salon-dashboard/SalonTable.tsx
import { DataGridPremium, GridColDef } from '@mui/x-data-grid-premium';
import { useSalonsQuery } from '@entities/salon';

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'name', headerName: 'Salon Name', width: 200 },
  {
    field: 'status',
    headerName: 'Status',
    width: 120,
    renderCell: (params) => <StatusBadge status={params.value} />,
  },
];

export const SalonTable = () => {
  const { data: salons = [], isLoading } = useSalonsQuery();

  return (
    <DataGridPremium
      rows={salons}
      columns={columns}
      loading={isLoading}
      pageSizeOptions={[10, 25, 50]}
      initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
    />
  );
};
```

## TypeScript Best Practices

1. **Type entities at their source**: Define User, Salon types in `entities/*/model/types.ts`.
2. **Generics for API responses**: `useQuery<T, ErrorType>()`
3. **Use `const` assertions** for immutable data:
   ```typescript
   const SALON_STATUSES = ['pending', 'approved', 'rejected'] as const;
   type SalonStatus = (typeof SALON_STATUSES)[number];
   ```
4. **Discriminated unions** for complex state:
   ```typescript
   type ApiState<T> =
     | { status: 'idle' }
     | { status: 'pending' }
     | { status: 'success'; data: T }
     | { status: 'error'; error: string };
   ```

## File Naming Conventions

- **Components**: PascalCase → `UserProfile.tsx`
- **Hooks**: camelCase with `use` prefix → `useAppointments.ts`
- **Utils**: camelCase → `formatDate.ts`
- **Types**: PascalCase → `User.ts` or `types.ts`
- **Redux slices**: kebab-case → `user-slice.ts`
- **API**: kebab-case → `user-api.ts`

## Code Organization Checklist

- [ ] Feature has own `index.ts` exporting public API
- [ ] Redux slice in `model/`, API in `api/`, UI in `ui/`
- [ ] Types defined at source (entity-scoped)
- [ ] No circular dependencies between features
- [ ] Components use `Controller` (React Hook Form) for controlled inputs
- [ ] RTK Query endpoints tagged for cache invalidation
- [ ] MUI components sized/styled via theme or `sx` prop
- [ ] TypeScript strict mode enabled

## Common Patterns

### Hooks for Reusable Logic

```typescript
// shared/hooks/useApiCall.ts
export function useApiCall<T>(query: (arg?: any) => any) {
  const result = query();
  return {
    data: result.data,
    loading: result.isLoading,
    error: result.error,
  };
}
```

### Controlled Components with MUI

Always use `TextField` with `control` prop from React Hook Form; avoid uncontrolled inputs.

### Error Handling

Wrap mutations in try-catch; use `unwrap()` to throw RTK Query errors:

```typescript
try {
  await mutation(payload).unwrap();
} catch (error) {
  enqueueSnackbar(error?.data?.message || 'Error', { variant: 'error' });
}
```

## Testing Strategy

- **Unit**: Redux slices, utils (Vitest)
- **Integration**: Components + RTK Query mocking (Playwright, Vitest)
- **E2E**: User workflows (Playwright)

Reference: проверки фронта — `AGENTS.md` (раздел Verification) и `npm run lint` / `npm run build` в каталоге `frontend/`.

## Workflow Example: Adding a New Feature

1. **Define types** in `entities/feature-name/model/types.ts`
2. **Create Redux slice** in `entities/feature-name/model/slice.ts` (if needed)
3. **Add RTK Query endpoints** in `entities/feature-name/api/featureApi.ts`
4. **Build UI components** in `entities/feature-name/ui/` and `features/feature-name/`
5. **Export via index**: `entities/feature-name/index.ts` → `export { useFeatureQuery } from './api/featureApi'`
6. **Use in pages**: Import from `@entities/feature-name` or `@features/feature-name`
7. **Run tests**: `npm run lint && npm run typecheck`

## Quick Reference

| Task | Example |
|------|---------|
| Create query | `builder.query<T, void>({ query: () => '/endpoint' })` |
| Create mutation | `builder.mutation<T, Payload>({ query: (body) => ({ url: '/endpoint', method: 'POST', body }) })` |
| Use query hook | `const { data, isLoading } = useQueryNameQuery()` |
| Use mutation hook | `const [mutate, { isLoading }] = useMutationNameMutation()` |
| Form field (MUI) | `<Controller name="field" control={control} render={({ field }) => <TextField {...field} />} />` |
| Trigger cache invalidation | `invalidatesTags: ['Entity']` + `providesTags: ['Entity']` |

---

**Questions?** Refer to [Redux Docs](https://redux.js.org/), [RTK Query Docs](https://redux-toolkit.js.org/rtk-query/overview), [MUI Docs](https://mui.com/), and project conventions in [AGENTS.md](../../../AGENTS.md).
