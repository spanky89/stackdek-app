import { expect, Page, test } from '@playwright/test'

async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('Enter your email').fill('pro-owner@test.local')
  await page.getByPlaceholder('Enter your password').fill('StackDek-E2E-2026!')
  await page.getByRole('button', { name: 'Sign In' }).last().click()
  await page.waitForURL(/\/home/)
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth,
  }))).toEqual(expect.objectContaining({
    viewport: 412,
    content: 412,
  }))
}

test('Pro team management remains usable on a phone viewport', async ({ page }) => {
  await signIn(page)
  await page.goto('/team')
  await expect(page.getByRole('heading', { name: 'Team Operations' })).toBeVisible()
  await page.getByRole('button', { name: 'Team', exact: true }).click()
  await expect(page.getByRole('button', { name: /Invite Team Member/ })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('Pro job costing remains usable on a phone viewport', async ({ page }) => {
  await signIn(page)
  await page.goto('/job/34000000-0000-0000-0000-000000000001')
  await page.getByRole('button', { name: 'Job Costing' }).click()
  await expect(page.getByText('Quoted Revenue')).toBeVisible()
  await expect(page.getByText('Projected Profit')).toBeVisible()
  await expectNoHorizontalOverflow(page)
})
