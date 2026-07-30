import { expect, Page, test } from '@playwright/test'

const password = 'StackDek-E2E-2026!'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await completeSignIn(page, email)
}

async function completeSignIn(page: Page, email: string) {
  await page.getByPlaceholder('Enter your email').fill(email)
  await page.getByPlaceholder('Enter your password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).last().click()
  await page.waitForURL(/\/(home|employee-dashboard)/)
}

async function clearSession(page: Page) {
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto('/login')
}

test('Starter owner is blocked from Team Management', async ({ page }) => {
  await signIn(page, 'starter-owner@test.local')
  await page.goto('/team')
  await expect(page.getByRole('heading', { name: 'Pro feature' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'View Pro plan' })).toBeVisible()
})

test('active Pro owner can open Team Operations', async ({ page }) => {
  await signIn(page, 'pro-owner@test.local')
  await page.goto('/team')
  await expect(page.getByRole('heading', { name: 'Team Operations' })).toBeVisible()
  await page.getByRole('button', { name: 'Team', exact: true }).click()
  await expect(page.getByRole('button', { name: /Invite Team Member/ })).toBeVisible()
})

test('owner can set and persist the company time zone', async ({ page }) => {
  await signIn(page, 'pro-owner@test.local')
  await page.goto('/settings')
  await page.getByRole('button', { name: /Business Information/ }).click()
  await page.getByLabel('Company Time Zone').selectOption('America/Los_Angeles')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('✅ Saved successfully')).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: /Business Information/ }).click()
  await expect(page.getByLabel('Company Time Zone')).toHaveValue('America/Los_Angeles')
})

test('owner navigation reuses access state without permission screens', async ({ page }) => {
  await signIn(page, 'pro-owner@test.local')

  for (const [path, label] of [
    ['/jobs', 'Jobs'],
    ['/home', 'Home'],
    ['/jobs', 'Jobs'],
    ['/home', 'Home'],
    ['/jobs', 'Jobs'],
  ] as const) {
    await page.getByRole('button', { name: label, exact: true }).last().click()
    await page.waitForURL(new RegExp(`${path.replace('/', '\\/')}$`))
    await expect(page.getByText('Checking permissions…')).toHaveCount(0)
    await expect(page.getByText('Checking subscription...')).toHaveCount(0)
  }
})

test('Job Costing is visible to active Pro owner', async ({ page }) => {
  await signIn(page, 'pro-owner@test.local')
  await page.goto('/job/34000000-0000-0000-0000-000000000001')
  await expect(page.getByRole('button', { name: 'Job Costing' })).toBeVisible()
})

test('owner-to-employee-to-profit workflow succeeds', async ({ page }) => {
  test.setTimeout(60_000)
  // Owner creates a secure single-use invitation.
  await signIn(page, 'pro-owner@test.local')
  await page.goto('/team')
  await page.getByRole('button', { name: 'Team', exact: true }).click()
  await page.getByRole('button', { name: /Invite Team Member/ }).click()
  await page.getByPlaceholder('Mike Davis').fill('Pro Employee')
  await page.getByPlaceholder('teammate@example.com').fill('pro-employee@test.local')
  await page.getByPlaceholder('0.00').fill('24')
  await page.getByRole('button', { name: 'Send Invitation' }).click()
  const invitationUrl = await page.locator('input[readonly]').inputValue()
  expect(invitationUrl).toContain('/accept-invite?token=')

  // The invited employee signs in with the matching email and accepts.
  await clearSession(page)
  await page.goto(invitationUrl)
  await page.getByRole('button', { name: 'Sign in or create account' }).click()
  await completeSignIn(page, 'pro-employee@test.local')
  await page.waitForURL(/\/employee-dashboard/)
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Pro/ })).toBeVisible()
  await expect(page.getByText('No jobs assigned. You can still clock in normally.')).toBeVisible()
  await page.getByRole('button', { name: 'Clock In' }).click()
  await expect(page.getByText('CLOCKED IN')).toBeVisible()
  await page.getByRole('button', { name: 'Clock Out' }).click()
  await page.getByPlaceholder(/Installed fence panels/).fill('General shop cleanup')
  await page.getByRole('button', { name: 'Clock Out' }).last().click()
  await expect(page.getByText('READY FOR WORK?')).toBeVisible()

  // Owner assigns the accepted employee independently, then starts the job.
  await clearSession(page)
  await signIn(page, 'pro-owner@test.local')
  await page.goto('/team')
  await page.getByRole('button', { name: 'Timesheets', exact: true }).click()
  await expect(page.getByText('General shop cleanup')).toBeVisible()
  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Approved ✓' })).toBeVisible()
  await page.goto('/job/34000000-0000-0000-0000-000000000001')
  await page.getByRole('button', { name: 'Manage Crew' }).click()
  await page.getByRole('button', { name: /Pro Employee/ }).click()
  await page.getByRole('button', { name: 'Save Crew (1)' }).click()
  await expect(page.getByRole('heading', { name: 'Manage Crew' })).not.toBeVisible()
  await page.getByRole('button', { name: 'In Progress' }).click()
  await expect(page.getByRole('button', { name: 'In Progress' })).toBeDisabled()
  await page.getByRole('button', { name: 'Manage Crew' }).click()
  await page.getByRole('button', { name: /Pro Employee/ }).click()
  await page.getByRole('button', { name: 'Save Empty Crew' }).click()
  await expect(page.getByRole('heading', { name: 'Manage Crew' })).not.toBeVisible()
  await page.getByRole('button', { name: 'Manage Crew' }).click()
  await page.getByRole('button', { name: /Pro Employee/ }).click()
  await page.getByRole('button', { name: 'Save Crew (1)' }).click()
  await expect(page.getByRole('heading', { name: 'Manage Crew' })).not.toBeVisible()

  // Employee sees only the assigned job, clocks time, and submits an expense.
  await clearSession(page)
  await signIn(page, 'pro-employee@test.local')
  await expect(page.getByText('Pro E2E Job')).toBeVisible()
  await page.getByText('Pro E2E Job').click()
  await page.waitForURL(/\/employee-job\//)
  const navigateLink = page.getByRole('link', { name: 'Navigate to Job' })
  await expect(page.getByText('123 Pro Street')).toBeVisible()
  await expect(navigateLink).toHaveAttribute(
    'href',
    'https://www.google.com/maps/search/?api=1&query=123%20Pro%20Street',
  )
  await page.getByRole('button', { name: 'Clock In' }).click()
  await expect(page.getByRole('button', { name: 'Clock Out' })).toBeVisible()
  await page.getByRole('button', { name: 'Clock Out' }).click()
  await expect(page.getByRole('button', { name: 'Clock In' })).toBeVisible()
  await page.getByRole('button', { name: 'expenses' }).click()
  await page.getByRole('button', { name: '+ Add Expense' }).click()
  await page.getByPlaceholder('0.00').fill('125.50')
  await page.getByPlaceholder('e.g. Pressure treated lumber').fill('E2E lumber')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('$125.50')).toBeVisible()
  await expect(page.getByText('pending')).toBeVisible()

  // Owner approves the employee expense and sees the resulting profit.
  await clearSession(page)
  await signIn(page, 'pro-owner@test.local')
  await page.goto('/job/34000000-0000-0000-0000-000000000001')
  await page.getByRole('button', { name: 'Job Costing' }).click()
  await expect(page.getByText('E2E lumber')).toBeVisible()
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText('approved')).toBeVisible()
  await expect(page.getByText('$125.50 expenses')).toBeVisible()
  await expect(page.getByText('$874.50')).toBeVisible()
})
