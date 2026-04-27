// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\config-roles.spec.ts
import { expect, test } from '@playwright/test'
import { hasAuthCredentials } from './fixtures/env'
import { loginToAdmin } from './helpers/auth'

const allowMutations = process.env.TEST_PHASE8_MUTATIONS === 'true'

test.describe('Fase 8 - Configuración de roles y usuarios', () => {
  test.skip(!hasAuthCredentials(), 'Configura TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD para ejecutar esta suite.')

  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page, '/configuracion/usuarios')
    await expect(page.getByRole('heading', { name: /Usuarios y Permisos/i })).toBeVisible()
  })

  test('renderiza tabs y contenido principal de usuarios/roles', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Usuarios \(\d+\)/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Roles y Permisos \(\d+\)/i })).toBeVisible()
    await expect(page.getByText(/El rol determina los permisos base del usuario/i)).toBeVisible()

    await page.getByRole('button', { name: /Roles y Permisos/i }).click()
    await expect(page.getByRole('button', { name: /Nuevo Rol/i })).toBeVisible()
    await expect(page.getByText(/Haz clic en cada rol para expandir\/colapsar los permisos/i)).toBeVisible()
  })

  test.describe.serial('mutaciones de roles/permisos (opcional)', () => {
    test.skip(!allowMutations, 'Define TEST_PHASE8_MUTATIONS=true para ejecutar pruebas mutantes en Fase 8.')

    test('crear, editar permisos y eliminar rol', async ({ page }) => {
      const roleName = `PW_ROLE_${Date.now()}`

      await page.getByRole('button', { name: /Roles y Permisos/i }).click()
      await page.getByRole('button', { name: /Nuevo Rol/i }).click()
      await page.getByLabel('Nombre del Rol').fill(roleName)
      await page.getByLabel('Descripción').fill('Rol creado por Playwright Fase 8')
      await page.getByLabel('Catálogo').check()
      await page.getByRole('button', { name: /Crear Rol/i }).click()

      await expect(page.getByText('Rol creado correctamente')).toBeVisible()

      const roleCard = page.locator('div.border.rounded-lg.overflow-hidden.bg-card', { hasText: roleName }).first()
      await expect(roleCard).toBeVisible()
      await roleCard.click()

      const firstPermisoToggle = roleCard.locator('tbody tr button').first()
      await expect(firstPermisoToggle).toBeVisible()
      await firstPermisoToggle.click()

      await roleCard.locator('button.h-8.w-8.text-muted-foreground').first().click()
      await expect(page.getByText('Rol eliminado')).toBeVisible()
    })
  })
})
