import { createClient } from '@supabase/supabase-js'

const url = 'http://127.0.0.1:54321'
// Supabase's local service-role key is stable but may vary by CLI version.
// Read the current value from the environment populated by the test command.
const actualServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function globalSetup() {
  if (!actualServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for local E2E setup')
  }

  const supabase = createClient(url, actualServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const fixtures = [
    {
      userId: '14000000-0000-0000-0000-000000000001',
      companyId: '24000000-0000-0000-0000-000000000001',
      email: 'starter-owner@test.local',
      plan: 'basic',
    },
    {
      userId: '14000000-0000-0000-0000-000000000002',
      companyId: '24000000-0000-0000-0000-000000000002',
      email: 'pro-owner@test.local',
      plan: 'pro',
    },
  ]

  for (const fixture of fixtures) {
    await supabase.auth.admin.deleteUser(fixture.userId)
    const { error: userError } = await supabase.auth.admin.createUser({
      id: fixture.userId,
      email: fixture.email,
      password: 'StackDek-E2E-2026!',
      email_confirm: true,
    })
    if (userError) throw userError

    const { error: companyError } = await supabase.from('companies').upsert({
      id: fixture.companyId,
      owner_id: fixture.userId,
      name: fixture.plan === 'pro' ? 'Pro E2E Company' : 'Starter E2E Company',
      subscription_plan: fixture.plan,
      subscription_status: 'active',
    })
    if (companyError) throw companyError
  }

  const { error: jobError } = await supabase.from('jobs').upsert({
    id: '34000000-0000-0000-0000-000000000001',
    company_id: fixtures[1].companyId,
    title: 'Pro E2E Job',
    date_scheduled: new Date().toISOString().slice(0, 10),
    status: 'scheduled',
    estimate_amount: 1000,
  })
  if (jobError) throw jobError
}
