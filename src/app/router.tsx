import { createBrowserRouter, type RouteObject } from 'react-router'

import { AppShell } from './layouts/AppShell'
import { RootLayout } from './layouts/RootLayout'
import { NotFoundPage } from './NotFoundPage'
import { RouteError } from './RouteError'

const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      {
        path: 'onboarding',
        lazy: async () => ({
          Component: (await import('@/features/onboarding/pages/OnboardingPage')).OnboardingPage,
        }),
      },
      {
        path: 'perfil/editar',
        lazy: async () => ({
          Component: (await import('@/features/settings/pages/EditProfilePage')).EditProfilePage,
        }),
      },
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('@/features/today/pages/TodayPage')).TodayPage,
            }),
          },
          {
            path: 'entreno',
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (await import('@/features/training/pages/TrainingPage')).TrainingPage,
                }),
              },
              {
                path: 'sesion',
                lazy: async () => ({
                  Component: (await import('@/features/training/pages/SessionPage')).SessionPage,
                }),
              },
              {
                path: 'sesion/:id/resumen',
                lazy: async () => ({
                  Component: (await import('@/features/training/pages/SessionSummaryPage'))
                    .SessionSummaryPage,
                }),
              },
              {
                path: 'plan',
                lazy: async () => ({
                  Component: (await import('@/features/training/pages/PlanEditorPage'))
                    .PlanEditorPage,
                }),
              },
              {
                path: 'historial',
                lazy: async () => ({
                  Component: (await import('@/features/training/pages/HistoryPage')).HistoryPage,
                }),
              },
              {
                path: 'ejercicios',
                lazy: async () => ({
                  Component: (await import('@/features/training/pages/ExerciseLibraryPage'))
                    .ExerciseLibraryPage,
                }),
              },
              {
                path: 'ejercicios/:id',
                lazy: async () => ({
                  Component: (await import('@/features/training/pages/ExerciseDetailPage'))
                    .ExerciseDetailPage,
                }),
              },
            ],
          },
          {
            path: 'nutricion',
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (await import('@/features/nutrition/pages/NutritionPage'))
                    .NutritionPage,
                }),
              },
              {
                path: 'agregar',
                lazy: async () => ({
                  Component: (await import('@/features/nutrition/pages/AddFoodPage')).AddFoodPage,
                }),
              },
              {
                path: 'plan',
                lazy: async () => ({
                  Component: (await import('@/features/nutrition/pages/MealPlanPage')).MealPlanPage,
                }),
              },
              {
                path: 'mercado',
                lazy: async () => ({
                  Component: (await import('@/features/nutrition/pages/ShoppingListPage'))
                    .ShoppingListPage,
                }),
              },
            ],
          },
          {
            path: 'progreso',
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (await import('@/features/progress/pages/ProgressPage')).ProgressPage,
                }),
              },
              {
                path: 'registro',
                lazy: async () => ({
                  Component: (await import('@/features/progress/pages/BodyLogPage')).BodyLogPage,
                }),
              },
              {
                path: 'fotos',
                lazy: async () => ({
                  Component: (await import('@/features/progress/pages/PhotosPage')).PhotosPage,
                }),
              },
              {
                path: 'records',
                lazy: async () => ({
                  Component: (await import('@/features/progress/pages/RecordsPage')).RecordsPage,
                }),
              },
            ],
          },
          {
            path: 'checkin',
            lazy: async () => ({
              Component: (await import('@/features/checkin/pages/CheckinPage')).CheckinPage,
            }),
          },
          {
            path: 'perfil',
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (await import('@/features/settings/pages/ProfilePage')).ProfilePage,
                }),
              },
              {
                path: 'ajustes',
                lazy: async () => ({
                  Component: (await import('@/features/settings/pages/SettingsPage')).SettingsPage,
                }),
              },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]

/** GitHub Pages sirve la app bajo /<repo>/: el basename sale de la `base` de Vite. */
export const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export function createAppRouter() {
  return createBrowserRouter(routes, { basename })
}
