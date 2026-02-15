// Verify that quote_id column exists in invoices table
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://duhmbhxlmvczrztccmus.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1aG1iaHhsbXZjenJ6dGNjbXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkxNjc0NTQsImV4cCI6MjA1NDc0MzQ1NH0.xFm7rE67YWzWzI6THoNfUX6nqX3v3eWUpkJXPUTQk6E'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Checking invoices table schema...')

// Try to query with quote_id to see if column exists
const { data, error } = await supabase
  .from('invoices')
  .select('id, quote_id')
  .limit(1)

if (error) {
  if (error.message.includes('quote_id')) {
    console.log('❌ quote_id column DOES NOT exist in invoices table')
    console.log('Error:', error.message)
    console.log('\n📋 To fix this, run the following SQL in Supabase SQL Editor:')
    console.log('---')
    console.log(await import('fs').then(fs => fs.readFileSync('./migrations/08_add_invoice_quote_id.sql', 'utf8')))
  } else {
    console.log('❌ Unexpected error:', error)
  }
  process.exit(1)
} else {
  console.log('✅ quote_id column EXISTS in invoices table!')
  console.log('Sample data:', data)
}
