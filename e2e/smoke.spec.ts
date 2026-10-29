import { expect, test, type Page } from '@playwright/test'

async function completeOnboarding(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /Empezar/ }).click()
  await page.getByLabel('¿Cómo te llamas?').fill('Daniel')
  await page.getByRole('radio', { name: 'Hombre' }).click()
  await page.getByLabel('Edad').fill('30')
  await page.getByLabel('Altura').fill('178')
  await page.getByLabel('Peso actual').fill('80')
  await page.getByRole('button', { name: /Siguiente/ }).click()
  await page.getByLabel('Cuello').fill('38')
  await page.getByLabel('Cintura').fill('85')
  await page.getByRole('button', { name: /Siguiente/ }).click()
  await page.getByRole('radio', { name: /Sentado/ }).click()
  await page.getByRole('button', { name: /Siguiente/ }).click()
  await page.getByRole('radio', { name: /Intermedio/ }).click()
  await page.getByRole('button', { name: /Siguiente/ }).click()
  await page.getByRole('switch').first().click()
  await page.getByLabel('Peso').first().fill('100')
  await page.getByLabel('Repeticiones').first().fill('5')
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /Siguiente/ }).click()
  await expect(page.getByRole('heading', { name: 'Tu plan' })).toBeVisible()
  await page.getByText('Entiendo y quiero empezar').click()
  await page.getByRole('button', { name: /Confirmar y empezar/ }).click()
  await expect(
    page.getByRole('heading', { name: /Buen[oa]s (días|tardes|noches), Daniel/ }),
  ).toBeVisible()
}

test('de los datos al plan: onboarding, comida registrada y entreno completo', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await completeOnboarding(page)

  // Nutrición: registrar la siguiente comida del plan desde Hoy.
  const nutrition = page.getByRole('region', { name: 'Nutrición de hoy' })
  await expect(nutrition.getByRole('progressbar', { name: /Calorías: 0 de/ })).toBeVisible()
  await nutrition.getByRole('button', { name: /Lo comí/ }).click()
  await expect(nutrition.getByRole('progressbar', { name: /Calorías: [1-9]/ })).toBeVisible()

  // Entreno: elegir una sesión, registrar una serie y terminar.
  await page.getByRole('link', { name: 'Entreno' }).first().click()
  await page.getByRole('button', { name: /Elegir otra sesión/ }).click()
  await page.getByRole('dialog').getByRole('button').first().click()
  await expect(page).toHaveURL(/\/entreno\/sesion$/)
  const first = page.locator('article').first()
  const weight = first.getByLabel('Peso')
  if ((await weight.inputValue()) === '') await weight.fill('60')
  await first.getByRole('button', { name: /Registrar serie 1/ }).click()
  await expect(first.getByRole('button', { name: /Registrar serie 2/ })).toBeVisible()
  await expect(page.getByRole('timer')).toBeVisible()
  await page.getByRole('button', { name: /Terminar entreno/ }).click()
  await page.getByRole('button', { name: /Terminar y ver resumen/ }).click()
  await expect(page.getByRole('heading', { name: '¡Entreno completado!' })).toBeVisible()

  expect(errors).toEqual([])
})

test('funciona sin conexión después de la primera visita', async ({ page, context }) => {
  await completeOnboarding(page)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  // La primera carga instala el service worker; desde la segunda, la app sale de la caché.
  await page.reload()
  await expect(page.getByRole('heading', { name: /Daniel/ })).toBeVisible()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: /Daniel/ })).toBeVisible()
  await page.getByRole('link', { name: 'Nutrición' }).first().click()
  await expect(page.getByRole('heading', { name: 'Nutrición' })).toBeVisible()
  await context.setOffline(false)
})
