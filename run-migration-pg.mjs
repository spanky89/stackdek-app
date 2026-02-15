// Migration runner using direct PostgreSQL connection
import pkg from 'pg'
import { readFileSync } from 'fs'

const { Client } = pkg

const connectionString = 'postgresql://postgres.duhmbhxlmvczrztccmus:Vette70Chevy@aws-0-us-east-1.pooler.supabase.com:6543/postgres'

const client = new Client({ connectionString })

try {
  console.log('🔌 Connecting to database...')
  await client.connect()
  
  const sql = readFileSync('./migrations/08_add_invoice_quote_id.sql', 'utf8')
  console.log('📄 Running migration: 08_add_invoice_quote_id.sql')
  console.log('SQL:', sql)
  console.log('')
  
  const result = await client.query(sql)
  
  console.log('✅ Migration completed successfully!')
  console.log('Result:', result)
} catch (error) {
  console.error('❌ Migration failed:', error)
  process.exit(1)
} finally {
  await client.end()
  console.log('🔌 Database connection closed')
}
