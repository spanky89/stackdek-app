import { supabase } from '../api/supabaseClient'
import demoData from '../data/demoData.json'

export async function seedDemoData(companyId: string) {
  try {
    // Mark company as demo mode
    await supabase
      .from('companies')
      .update({ is_demo_mode: true })
      .eq('id', companyId)

    // Seed clients
    const clientsToInsert = demoData.contacts.map(contact => ({
      company_id: companyId,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      address: contact.address,
      vip: contact.type === 'Repeat Customer'
    }))

    const { data: insertedClients, error: clientsError } = await supabase
      .from('clients')
      .insert(clientsToInsert)
      .select()

    if (clientsError) throw clientsError

    // Create a map of client names to IDs
    const clientMap = new Map(
      insertedClients.map(client => [client.name, client.id])
    )

    // Seed jobs
    const jobsToInsert = demoData.jobs.map(job => ({
      company_id: companyId,
      client_id: clientMap.get(job.customer),
      title: job.title,
      description: job.description,
      status: job.status.toLowerCase().replace(' ', '_'),
      date_scheduled: job.scheduledDate,
      estimate_amount: job.value,
      location: job.address
    }))

    const { data: insertedJobs, error: jobsError } = await supabase
      .from('jobs')
      .insert(jobsToInsert)
      .select()

    if (jobsError) throw jobsError

    // Seed quotes
    const quotesToInsert = demoData.quotes.map(quote => ({
      company_id: companyId,
      client_id: clientMap.get(quote.customer),
      title: quote.jobTitle,
      amount: quote.total,
      status: quote.status.toLowerCase(),
      created_at: quote.date
    }))

    const { error: quotesError } = await supabase
      .from('quotes')
      .insert(quotesToInsert)

    if (quotesError) throw quotesError

    // Seed invoices
    const invoicesToInsert = demoData.invoices.map(invoice => ({
      company_id: companyId,
      client_id: clientMap.get(invoice.customer),
      amount: invoice.total,
      status: invoice.status.toLowerCase(),
      due_date: invoice.dueDate,
      paid_date: invoice.paidDate || null,
      created_at: invoice.date
    }))

    const { error: invoicesError } = await supabase
      .from('invoices')
      .insert(invoicesToInsert)

    if (invoicesError) throw invoicesError

    console.log('✅ Demo data seeded successfully')
    return { success: true }
  } catch (error) {
    console.error('❌ Error seeding demo data:', error)
    return { success: false, error }
  }
}

export async function clearDemoData(companyId: string) {
  try {
    // Delete in reverse order due to foreign keys
    await supabase.from('invoices').delete().eq('company_id', companyId)
    await supabase.from('quotes').delete().eq('company_id', companyId)
    await supabase.from('jobs').delete().eq('company_id', companyId)
    await supabase.from('clients').delete().eq('company_id', companyId)

    // Mark company as no longer in demo mode
    await supabase
      .from('companies')
      .update({ is_demo_mode: false })
      .eq('id', companyId)

    console.log('✅ Demo data cleared successfully')
    return { success: true }
  } catch (error) {
    console.error('❌ Error clearing demo data:', error)
    return { success: false, error }
  }
}
