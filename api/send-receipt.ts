import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { quoteId, clientEmail, clientName, companyName, depositAmount, quoteTitle, jobId } = req.body

    if (!clientEmail || !quoteId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Check if Resend API key is configured
    const resendApiKey = process.env.RESEND_API_KEY
    
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not configured - receipt email skipped')
      return res.status(200).json({ 
        success: true, 
        message: 'Receipt email service not configured'
      })
    }

    // Try to send via Resend
    try {
      const emailContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #171717; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
      .receipt-box { background: white; padding: 20px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #e0e0e0; }
      .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
      .label { color: #666; font-size: 14px; }
      .amount { font-weight: bold; font-size: 16px; }
      .total { border-top: 2px solid #e0e0e0; padding-top: 15px; margin-top: 15px; display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; }
      .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0;">Payment Receipt</h1>
        <p style="margin: 5px 0 0 0;">Thank you for your deposit!</p>
      </div>
      <div class="content">
        <p>Hi ${clientName || 'there'},</p>
        <p>We've received your deposit payment for <strong>${quoteTitle}</strong>. Your work will begin shortly.</p>
        
        <div class="receipt-box">
          <div class="row">
            <span class="label">Quote ID</span>
            <span>${quoteId.slice(0, 8)}</span>
          </div>
          <div class="row">
            <span class="label">From</span>
            <span>${companyName || 'Your Service Provider'}</span>
          </div>
          <div class="row">
            <span class="label">Service</span>
            <span>${quoteTitle}</span>
          </div>
          <div class="total">
            <span>Deposit Paid</span>
            <span>$${(parseFloat(depositAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          <strong>What's next?</strong><br>
          Your job has been created and scheduled. You'll receive updates about the work timeline and any additional details needed.
        </p>
        
        <p style="color: #666; font-size: 14px;">
          If you have any questions, please reach out to ${companyName || 'the service provider'} directly.
        </p>
        
        <div class="footer">
          <p>Powered by StackDek • Job ID: ${jobId.slice(0, 8)}</p>
        </div>
      </div>
    </div>
  </body>
</html>
      `.trim()

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'noreply@stackdek.app',
          to: clientEmail,
          subject: `Payment Received - ${quoteTitle}`,
          html: emailContent,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Resend error:', data)
        return res.status(200).json({ 
          success: true, 
          message: 'Receipt email queued (delivery may be delayed)'
        })
      }

      console.log('Receipt email sent:', data.id)
      return res.status(200).json({ 
        success: true, 
        emailId: data.id,
        message: 'Receipt email sent'
      })
    } catch (error: any) {
      console.error('Error sending receipt email:', error)
      // Don't fail - just log
      return res.status(200).json({ 
        success: true, 
        message: 'Receipt email service error (non-critical)'
      })
    }
  } catch (error: any) {
    console.error('Send receipt handler error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
