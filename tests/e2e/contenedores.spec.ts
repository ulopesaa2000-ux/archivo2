// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\contenedores.spec.ts
import { expect, test } from '@playwright/test'
import { e2eEnv, hasAuthCredentials } from './fixtures/env'
import { loginToAdmin } from './helpers/auth'
import { firstDataRow, selectOption, waitForSearchParam, waitForSearchParamToClear } from './helpers/ui'

test.describe('Fase 5 - Contenedores', () => {
  test.skip(!hasAuthCredentials(), 'Configura TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD para ejecutar esta suite.')

  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page, '/contenedores')
    await expect(page.getByRole('heading', { name: 'Contenedores' })).toBeVisible()
  })

  test('lista: expandir, colapsar, filtrar y navegar a detalle', async ({ page }) => {
    const row = await firstDataRow(page)
    await expect(row).toBeVisible()

    const code = (await row.locator('td').nth(2).textContent())?.trim()
    test.skip(!code, 'No hay filas utilizables en la lista de contenedores.')

    const expandButton = page.getByRole('button', { name: /Expandir contenedor/i }).first()
    await expandButton.click()
    await expect(page.getByText('Naviera')).toBeVisible()
    await expect(page.getByText('BL')).toBeVisible()
    await expect(page.getByText('Buque')).toBeVisible()

    await page.getByRole('button', { name: /Colapsar contenedor/i }).first().click()
    await expect(page.getByRole('button', { name: /Expandir contenedor/i }).first()).toBeVisible()

    const searchInput = page.getByPlaceholder(/Buscar N/i)
    await searchInput.fill(code!)
    await waitForSearchParam(page, 'q', code!)
    await expect(page.locator('table tbody')).toContainText(code!)

    await page.getByRole('button', { name: /Limpiar/i }).click()
    await waitForSearchParamToClear(page, 'q')

    await page.getByTitle(/Ver contenedor/i).first().click()
    await expect(page).toHaveURL(/\/contenedores\/\d+$/)
    await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible()
  })

  test.describe.serial('CRUD y estados', () => {
    let createdCode = ''
    let updatedNaviera = ''

    test('crear contenedor único y rechazar duplicado', async ({ page }) => {
      createdCode = `PW-CONT-${Date.now()}`
      updatedNaviera = `Naviera ${Date.now()}`

      await page.getByRole('button', { name: /Nuevo Contenedor/i }).click()
      await page.locator('input[name="codigo_contenedor"]').fill(createdCode)
      await page.locator('input[name="numero_contenedor"]').fill(`NUM-${Date.now()}`)
      await page.locator('input[name="numero_bl"]').fill(`BL-${Date.now()}`)
      await page.getByRole('button', { name: 'Crear' }).click()

      await expect(page.getByText('Crear Contenedor')).not.toBeVisible()
      await expect(page.locator('table tbody')).toContainText(createdCode)
      await expect(page.locator('table tbody')).toContainText('Borrador')

      await page.getByRole('button', { name: /Nuevo Contenedor/i }).click()
      await page.locator('input[name="codigo_contenedor"]').fill(createdCode)
      await page.getByRole('button', { name: 'Crear' }).click()
      await expect(page.getByRole('alert')).toContainText('ya existe')
      await page.keyboard.press('Escape')
    })

    test('editar detalle, cancelar y guardar cambios', async ({ page }) => {
      test.skip(!createdCode, 'La prueba de creación no generó un código para editar.')

      await page.getByPlaceholder(/Buscar N/i).fill(createdCode)
      await waitForSearchParam(page, 'q', createdCode)
      await page.getByTitle(/Ver contenedor/i).first().click()

      await page.getByRole('button', { name: 'Editar' }).click()
      const navieraInput = page.locator('input[name="naviera"]')
      await navieraInput.fill('Temporal')
      await page.getByRole('button', { name: 'Cancelar' }).click()
      await expect(page.getByText('Temporal')).toHaveCount(0)

      await page.getByRole('button', { name: 'Editar' }).click()
      await navieraInput.fill(updatedNaviera)
      await page.getByRole('button', { name: 'Guardar' }).click()
      await expect(page.getByText(updatedNaviera)).toBeVisible()
    })

    test('aplica transiciones válidas hasta cerrado', async ({ page }) => {
      test.skip(!createdCode, 'La prueba de creación no generó un contenedor para mover de estado.')

      await page.goto('/contenedores')
      await page.getByPlaceholder(/Buscar N/i).fill(createdCode)
      await waitForSearchParam(page, 'q', createdCode)
      await page.getByTitle(/Ver contenedor/i).first().click()

      const trigger = page.getByTestId('contenedor-estado-trigger')

      await trigger.click()
      await expect(page.getByRole('option', { name: 'En Tránsito', exact: true })).toBeVisible()
      await expect(page.getByRole('option', { name: 'Completo', exact: true })).toHaveCount(0)
      await page.keyboard.press('Escape')

      await selectOption(trigger, 'En Tránsito')
      await expect(page.getByText('En Tránsito')).toBeVisible()

      await selectOption(page.getByTestId('contenedor-estado-trigger'), 'En Aduana')
      await expect(page.getByText('En Aduana')).toBeVisible()

      await selectOption(page.getByTestId('contenedor-estado-trigger'), 'En Bodega')
      await expect(page.getByText('En Bodega')).toBeVisible()

      await selectOption(page.getByTestId('contenedor-estado-trigger'), 'Completo')
      await expect(page.getByText('Completo')).toBeVisible()

      await selectOption(page.getByTestId('contenedor-estado-trigger'), 'Cerrado')
      await expect(page.getByText('Cerrado')).toBeVisible()
      await expect(page.getByTestId('contenedor-estado-trigger')).toHaveCount(0)
    })
  })

  test('detalle: estados vacíos de órdenes y packing con ids opcionales', async ({ page }) => {
    test.skip(
      !e2eEnv.contenedorSinOrdenesId || !e2eEnv.contenedorSinPackingId,
      'Configura TEST_CONTENEDOR_SIN_ORDENES_ID y TEST_CONTENEDOR_SIN_PACKING_ID para validar estados vacíos.'
    )

    await page.goto(`/contenedores/${e2eEnv.contenedorSinOrdenesId}`)
    await expect(page.getByText(/Sin órdenes vinculadas/i)).toBeVisible()

    await page.goto(`/contenedores/${e2eEnv.contenedorSinPackingId}`)
    await page.getByRole('tab', { name: /Packing List/i }).click()
    await expect(page.getByText(/Sin packing list/i)).toBeVisible()
  })
})
