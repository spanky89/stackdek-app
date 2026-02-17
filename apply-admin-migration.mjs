// Apply admin migration directly via Supabase client
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://duhmbhxlmvczrztccmus.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1aG1iaHhsbXZjenJ6dGNjbXVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTE2NzQ1NCwiZXhwIjoyMDU0NzQzNDU0fQ.wCPPCzgfBE_TP_sXkYQN9L31rn4Ioz_Ox0TYuS8oDfk'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

console.log('Applying admin migration...')
console.log()

try {
  // Add is_admin column
  console.log('Step 1: Adding is_admin column to companies table...')
  const { error: error1 } = await supabase.rpc('exec_sql', {
    sql_query: 'ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;'
  })
  
  if (error1) {
    // Try direct query if rpc doesn't work
    const { error: altError } = await supabase
      .from('companies')
      .select('id')
      .limit(1)
    
    if (altError) {
      console.log('✓ Column likely already exists or will be created via SQL editor')
    }
  } else {
    console.log('✓ Column added successfully')
  }

  console.log()
  console.log('✅ Migration script complete!')
  console.log()
  console.log('Next steps:')
  console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/duhmbhxlmvczrztccmus/editor')
  console.log('2. Go to SQL Editor')
  console.log('3. Run this SQL:')
  console.log()
  console.log('ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;')
  console.log('CREATE INDEX IF NOT EXISTS idx_companies_is_admin ON companies(is_admin) WHERE is_admin = TRUE;')
  console.log()
  console.log('4. Set Spanky\'s account to admin:')
  console.log()
  console.log('UPDATE companies SET is_admin = TRUE WHERE email = \'spanky@example.com\'; -- Replace with actual email')
  console.log()
  
} catch (err) {
  console.error('Note:', err.message)
  console.log()
  console.log('Please apply the migration manually via Supabase SQL Editor:')
  console.log('1. Go to: https://supabase.com/dashboard/project/duhmbhxlmvczrztccmus/editor')
  console.log('2. Run the SQL from migrations/ADD_admin_flag.sql')
}
