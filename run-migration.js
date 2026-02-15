// Quick migration runner for 08_add_invoice_quote_id.sql
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = 'https://duhmbhxlmvczrztccmus.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1aG1iaHhsbXZjenJ6dGNjbXVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTE2NzQ1NCwiZXhwIjoyMDU0NzQzNDU0fQ.wCPPCzgfBE_TP_sXkYQN9L31rn4Ioz_Ox0TYuS8oDfk'

const supabase = createClient(supabaseUrl, supabaseKey)

const sql = readFileSync('./migrations/08_add_invoice_quote_id.sql', 'utf8')

console.log('Running migration: 08_add_invoice_quote_id.sql')
console.log('SQL:', sql)

// Execute the migration
const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

if (error) {
  console.error('❌ Migration failed:', error)
  process.exit(1)
} else {
  console.log('✅ Migration completed successfully!')
  console.log('Data:', data)
}
