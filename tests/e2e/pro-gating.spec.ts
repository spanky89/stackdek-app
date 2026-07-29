import { expect, Page, test } from '@playwright/test'

const password = 'StackDek-E2E-2026!'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByPlaceholder('Enter your email').fill(email)
  await page.getByPlaceholder('Enter your password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).last().click()
  await page.waitForURL(/\/(home|employee-dashboard)/)
}

test('Starter owner is blocked from Team Management', async ({ page }) => {
  await signIn(page, 'starter-owner@test.local')
  await page.goto('/team')
  await expect(page.getByRole('heading', { name: 'Pro feature' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'View Pro plan' })).toBeVisible()
})

test('active Pro owner can open Team Management', async ({ page }) => {
  await signIn(page, 'pro-owner@test.local')
  await page.goto('/team')
  await expect(page.getByRole('heading', { name: 'Team Management' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Invite Team Member/ })).toBeVisible()
})

test('Job Costing is visible to active Pro owner', async ({ page }) => {
  await signIn(page, 'pro-owner@test.local')
  await page.goto('/job/34000000-0000-0000-0000-000000000001')
  await expect(page.getByRole('button', { name: 'Job Costing' })).toBeVisible()
})
