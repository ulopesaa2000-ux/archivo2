// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\helpers\auth.ts
import { expect, type Page } from '@playwright/test'
import { e2eEnv, hasAuthCredentials } from '../fixtures/env'

export async function loginToAdmin(page: Page, targetPath = '/dashboard') {
  if (!hasAuthCredentials()) {
    throw new Error('Faltan TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD para ejecutar pruebas E2E autenticadas.')
  }

  await page.goto(targetPath)

  if (page.url().includes('/login')) {
    await page.locator('#email').fill(e2eEnv.adminEmail)
    await page.locator('#password').fill(e2eEnv.adminPassword)
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()
  }

  await expect(page).not.toHaveURL(/\/login/)
}
