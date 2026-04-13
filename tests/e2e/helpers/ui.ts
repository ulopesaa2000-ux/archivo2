// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\helpers\ui.ts
import { expect, type Locator, type Page } from '@playwright/test'

export async function selectOption(trigger: Locator, optionText: string) {
  await trigger.click()
  await trigger.page().getByRole('option', { name: new RegExp(escapeRegExp(optionText), 'i') }).click()
}

export async function selectNthOption(trigger: Locator, index = 1) {
  await trigger.click()
  const option = trigger.page().getByRole('option').nth(index)
  const text = ((await option.textContent()) ?? '').trim()
  await option.click()
  return text
}

export async function waitForSearchParam(page: Page, key: string, value: string) {
  await expect
    .poll(() => new URL(page.url()).searchParams.get(key))
    .toBe(value)
}

export async function waitForSearchParamToClear(page: Page, key: string) {
  await expect
    .poll(() => new URL(page.url()).searchParams.get(key))
    .toBe(null)
}

export async function firstDataRow(page: Page) {
  return page.locator('table tbody tr').first()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
