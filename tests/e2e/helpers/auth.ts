import { expect, type Page } from '@playwright/test'
import { e2eEnv, hasAuthCredentials } from '../fixtures/env'

export async function loginToAdmin(page: Page, targetPath = '/dashboard') {
  if (!hasAuthCredentials()) {
    throw new Error('Faltan TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD para ejecutar pruebas E2E autenticadas.')
  }

  await page.goto(targetPath)

  const emailInput = page.locator('#email')
  const needsLogin = await emailInput
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false)

  if (needsLogin) {
    await emailInput.fill(e2eEnv.adminEmail)
    await page.locator('#password').fill(e2eEnv.adminPassword)
    await page.locator('button[type="submit"]').click()
    await expect(emailInput).toBeHidden({ timeout: 30_000 })
  }

  await expect(page).not.toHaveURL(/\/login/)
}
