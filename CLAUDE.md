# CLAUDE.md

Guía para trabajar en FORJA (PWA en español de recomposición corporal: entrenamiento + nutrición, 100 % local).

## Comandos

- `npm run dev` — servidor de desarrollo.
- `npm run check` — lint + formato + tipos + tests con cobertura + build. Debe pasar antes de cada commit.
- `npm run test:watch` — tests en modo observación.
- `npm run e2e` — prueba de punta a punta con Playwright sobre la build (móvil y sin conexión).
- `npm run format` — Prettier (con orden de clases de Tailwind).

## Arquitectura

- `src/domain/` — lógica pura y determinista. **No** importa React, Dexie, Zustand ni nada de `@/data`, `@/features`, `@/components`, `@/hooks`, `@/stores`, `@/lib` (lo impide ESLint). Toda fórmula devuelve `Calculated<T>` con su `Explanation` en español. Cobertura de tests **100 %** obligatoria.
- `src/domain/constants/formulas.ts` — única fuente de constantes y referencias. Cambiar un valor aquí lo cambia en cálculos, explicaciones y tests.
- `src/data/` — esquemas Zod (`schemas.ts`), Dexie (`db.ts`), repositorios (`repositories/`), catálogos (`seeds/`), respaldo. Los alimentos se generan con `scripts/build-food-seed.py` (no editar `foods.data.ts` a mano).
- `src/services/` — orquesta dominio + repositorios para las pantallas (objetivos del día, sesión de entreno, check-in, progreso).
- `src/features/<módulo>/` — pantallas (`pages/`), componentes y hooks del módulo. Acceden a datos solo con `useRepositories()` y `useLive()`; nunca a Dexie directo.
- `src/components/` — `ui/` (shadcn/ui), `form/`, `charts/`, `common/`, `layout/`.

## Convenciones

- Todo el texto de la interfaz en español de Colombia; números con `fmt()` (coma decimal) y fechas con `formatDay()`.
- Pesos siempre en kg internamente; convertir solo para mostrar (`toDisplay`/`fromDisplay`, `fromKg`/`toKg`).
- Fechas como `DayKey` (`yyyy-MM-dd`, hora local).
- Cada número visible para el usuario lleva su "¿Por qué?" (`WhyButton`, `StatTile` con `why`).
- Reglas de React Compiler activas: nada de `setState` síncrono en efectos, deps de `useMemo` literales, `useWatch` en lugar de `form.watch`.
- Selectores de Zustand: no devolver objetos/arrays nuevos en cada llamada (usar el valor y el respaldo fuera del selector).
- Colores de gráficas: `var(--chart-1..5)` y macros `var(--kcal|protein|carbs|fat|water)`; están validados para daltonismo y contraste en claro y oscuro. No inventar colores nuevos para series.
- Mobile-first: probar a 390 px de ancho; botones de al menos 44 px de alto.
- Mensajes de commit en español, descriptivos, por fase o funcionalidad.

## Pruebas

- Dominio: `src/domain/**/*.test.ts` (Vitest, jsdom).
- Repositorios: `// @vitest-environment node` (fake-indexeddb no clona `Blob` en jsdom).
- Pantallas: `renderScreen()` de `src/test/render.tsx`; usuario con plan listo: `onboardedRepos()` de `src/test/onboarding.ts`.
- E2E: `e2e/*.spec.ts` (Playwright 1.63, perfil móvil Pixel 7).

## Despliegue

`.github/workflows/deploy.yml`: check + e2e + publicación en GitHub Pages con `BASE_PATH=/<repo>/` y `404.html` para rutas profundas. El entorno `github-pages` debe permitir la rama que publica.
