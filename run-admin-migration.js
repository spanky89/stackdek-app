// Migration runner for ADD_admin_flag.sql
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = 'https://duhmbhxlmvczrztccmus.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1aG1iaHhsbXZjenJ6dGNjbXVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTE2NzQ1NCwiZXhwIjoyMDU0NzQzNDU0fQ.wCPPCzgfBE_TP_sXkYQN9L31rn4Ioz_Ox0TYuS8oDfk'

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

const sql = readFileSync('./migrations/ADD_admin_flag.sql', 'utf8')

console.log('Running migration: ADD_admin_flag.sql')
console.log('SQL:', sql)
console.log()

try {
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'))

  for (const statement of statements) {
    if (!statement) continue
    console.log('Executing:', statement.substring(0, 100) + '...')
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
    
    if (error) {
      console.error('❌ Statement failed:', error)
      process.exit(1)
    }
  }

  console.log()
  console.log('✅ Migration completed successfully!')
} catch (err) {
  console.error('❌ Migration failed:', err)
  process.exit(1)
}
