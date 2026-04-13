// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\ordenes-b2b.spec.ts
import { expect, test } from '@playwright/test'
import { e2eEnv, hasAuthCredentials } from './fixtures/env'
import { loginToAdmin } from './helpers/auth'
import { firstDataRow, selectNthOption, selectOption, waitForSearchParam, waitForSearchParamToClear } from './helpers/ui'

test.describe('Fase 5 - Órdenes B2B', () => {
  test.skip(!hasAuthCredentials(), 'Configura TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD para ejecutar esta suite.')

  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page, '/ordenes-b2b')
    await expect(page.getByRole('heading', { name: /Órdenes B2B/i })).toBeVisible()
  })

  test('lista: expandir, filtrar por folio y navegar a detalle', async ({ page }) => {
    const row = await firstDataRow(page)
    await expect(row).toBeVisible()

    const folio = (await row.locator('td').nth(2).textContent())?.trim()
    test.skip(!folio || folio === '—', 'No hay folio proveedor disponible para filtrar.')

    await page.getByRole('button', { name: /Expandir orden/i }).first().click()
    await expect(page.getByText('Cliente B2B')).toBeVisible()
    await expect(page.getByText('CBM Orden')).toBeVisible()

    await page.getByPlaceholder(/Buscar folio proveedor/i).fill(folio!)
    await waitForSearchParam(page, 'q', folio!)
    await expect(page.locator('table tbody')).toContainText(folio!)

    await page.getByRole('button', { name: /Limpiar/i }).click()
    await waitForSearchParamToClear(page, 'q')

    await page.getByTitle('Ver detalle').first().click()
    await expect(page).toHaveURL(/\/ordenes-b2b\/\d+$/)
    await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible()
  })

  test.describe.serial('CRUD y estados', () => {
    let createdOrderId = ''
    let createdFolio = ''
    let updatedFolio = ''

    test('crear orden con proveedor y validar proveedor obligatorio', async ({ page }) => {
      createdFolio = `PW-ORD-${Date.now()}`
      updatedFolio = `${createdFolio}-EDIT`

      await page.getByRole('button', { name: /Nueva Orden/i }).click()
      await selectNthOption(page.getByTestId('orden-proveedor-trigger'))
      await page.locator('input[name="folio_proveedor"]').fill(createdFolio)
      await expect(page.getByTestId('orden-moneda-trigger')).toContainText('USD')
      await page.getByRole('button', { name: /Crear Orden/i }).click()

      await expect(page).toHaveURL(/\/ordenes-b2b\/\d+$/)
      createdOrderId = page.url().split('/').pop() ?? ''
      await expect(page.getByText('Borrador')).toBeVisible()

      await page.goto('/ordenes-b2b')
      await page.getByRole('button', { name: /Nueva Orden/i }).click()
      await page.getByRole('button', { name: /Crear Orden/i }).click()
      await expect(page.getByRole('alert')).toContainText('Proveedor obligatorio')
      await page.keyboard.press('Escape')
    })

    test('editar orden, cancelar, guardar y cerrar flujo', async ({ page }) => {
      test.skip(!createdOrderId, 'La prueba de creación no generó una orden para editar.')

      await page.goto(`/ordenes-b2b/${createdOrderId}`)
      await page.getByRole('button', { name: 'Editar' }).click()
      const folioInput = page.locator('input[name="folio_proveedor"]')
      await folioInput.fill('TEMP')
      await page.getByRole('button', { name: 'Cancelar' }).click()
      await expect(page.getByText('TEMP')).toHaveCount(0)

      await page.getByRole('button', { name: 'Editar' }).click()
      await folioInput.fill(updatedFolio)
      await selectOption(page.getByTestId('orden-edit-moneda-trigger'), 'MXN')
      await page.locator('input[name="tipo_cambio"]').fill('17.25')
      await page.locator('textarea[name="observaciones"]').fill('Actualizada desde Playwright.')
      await page.getByRole('button', { name: 'Guardar' }).click()

      await expect(page.getByText(updatedFolio)).toBeVisible()
      await expect(page.getByText('MXN (TC: 17.25)')).toBeVisible()

      const trigger = page.getByTestId('orden-estado-trigger')
      await trigger.click()
      await expect(page.getByRole('option', { name: 'Borrador', exact: true })).toHaveCount(0)
      await page.keyboard.press('Escape')

      await selectOption(trigger, 'Enviada')
      await expect(page.getByText('Enviada')).toBeVisible()

      await selectOption(page.getByTestId('orden-estado-trigger'), 'Cerrada')
      await expect(page.getByText('Cerrada')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0)
      await expect(page.getByTestId('orden-estado-trigger')).toHaveCount(0)
    })
  })

  test('detalle: estados vacíos opcionales de productos y cajas', async ({ page }) => {
    test.skip(
      !e2eEnv.ordenSinProductosId || !e2eEnv.ordenSinCajasId,
      'Configura TEST_ORDEN_SIN_PRODUCTOS_ID y TEST_ORDEN_SIN_CAJAS_ID para validar estados vacíos.'
    )

    await page.goto(`/ordenes-b2b/${e2eEnv.ordenSinCajasId}`)
    await expect(page.getByText(/Sin cajas vinculadas/i)).toBeVisible()

    await page.goto(`/ordenes-b2b/${e2eEnv.ordenSinProductosId}`)
    await page.getByRole('tab', { name: /Líneas de producto/i }).click()
    await expect(page.getByText(/Sin productos/i)).toBeVisible()
  })

  test('detalle: orden terminal opcional no permite editar ni cambiar estado', async ({ page }) => {
    test.skip(!e2eEnv.ordenTerminalId, 'Configura TEST_ORDEN_TERMINAL_ID para validar el comportamiento terminal.')

    await page.goto(`/ordenes-b2b/${e2eEnv.ordenTerminalId}`)
    await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0)
    await expect(page.getByTestId('orden-estado-trigger')).toHaveCount(0)
  })
})
