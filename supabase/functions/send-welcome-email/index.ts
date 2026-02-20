import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WelcomeEmailPayload {
  record: {
    id: string
    email: string
    raw_user_meta_data?: {
      full_name?: string
      company_name?: string
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: WelcomeEmailPayload = await req.json()
    console.log('Welcome email trigger received:', payload)

    const { email, raw_user_meta_data } = payload.record
    const fullName = raw_user_meta_data?.full_name || 'there'
    const companyName = raw_user_meta_data?.company_name || 'your company'

    // Send email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'StackDek <hello@stackdek.com>',
        to: [email],
        subject: 'Welcome to StackDek! 🚀',
        html: generateWelcomeEmailHTML(fullName, companyName),
        text: generateWelcomeEmailText(fullName, companyName),
      }),
    })

    const data = await res.json()
    
    if (!res.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(data)}`)
    }

    console.log('Welcome email sent successfully:', data)

    return new Response(
      JSON.stringify({ success: true, emailId: data.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

function generateWelcomeEmailHTML(name: string, companyName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to StackDek</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 10px;
    }
    h1 {
      color: #1f2937;
      font-size: 24px;
      margin-bottom: 20px;
    }
    .cta-button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .feature-list {
      margin: 20px 0;
    }
    .feature-item {
      margin: 15px 0;
      padding-left: 25px;
      position: relative;
    }
    .feature-item:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #10b981;
      font-weight: bold;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    .highlight {
      background-color: #fef3c7;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      border-left: 4px solid #f59e0b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">StackDek</div>
    </div>
    
    <h1>Welcome to StackDek, ${name}! 🎉</h1>
    
    <p>We're excited to have ${companyName} on board! StackDek is built to make contractor management simple, fast, and professional.</p>
    
    <div class="highlight">
      <strong>🚀 Your account is ready!</strong> Log in now to start managing quotes, jobs, and invoices.
    </div>
    
    <div style="text-align: center;">
      <a href="https://app.stackdek.com/login" class="cta-button">Go to Dashboard</a>
    </div>
    
    <h2 style="margin-top: 30px; color: #1f2937;">What you can do right away:</h2>
    
    <div class="feature-list">
      <div class="feature-item">Create professional quotes in minutes</div>
      <div class="feature-item">Convert quotes to jobs with one click</div>
      <div class="feature-item">Send invoices with Stripe payment links</div>
      <div class="feature-item">Track job progress and client communications</div>
      <div class="feature-item">Import existing clients via CSV</div>
      <div class="feature-item">Manage recurring tasks and billing</div>
    </div>
    
    <h2 style="margin-top: 30px; color: #1f2937;">Getting Started (5 minutes):</h2>
    
    <ol style="padding-left: 20px;">
      <li><strong>Set up your company profile</strong> - Add logo, contact info, and payment settings</li>
      <li><strong>Add your first client</strong> - Import a CSV or add manually</li>
      <li><strong>Create a quote</strong> - Use our template to send your first quote</li>
    </ol>
    
    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Need help?</strong></p>
      <p style="margin: 10px 0 0 0;">Check out our <a href="https://app.stackdek.com/help" style="color: #2563eb;">Help Center</a> or reply to this email with any questions.</p>
    </div>
    
    <div class="footer">
      <p>StackDek - Contractor Management Made Simple</p>
      <p style="font-size: 12px; margin-top: 10px;">
        <a href="https://stackdek.com" style="color: #6b7280; text-decoration: none;">stackdek.com</a> | 
        <a href="mailto:hello@stackdek.com" style="color: #6b7280; text-decoration: none;">hello@stackdek.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`
}

function generateWelcomeEmailText(name: string, companyName: string): string {
  return `
Welcome to StackDek, ${name}!

We're excited to have ${companyName} on board! StackDek is built to make contractor management simple, fast, and professional.

🚀 Your account is ready! Log in now to start managing quotes, jobs, and invoices.

Go to Dashboard: https://app.stackdek.com/login

WHAT YOU CAN DO RIGHT AWAY:
✓ Create professional quotes in minutes
✓ Convert quotes to jobs with one click
✓ Send invoices with Stripe payment links
✓ Track job progress and client communications
✓ Import existing clients via CSV
✓ Manage recurring tasks and billing

GETTING STARTED (5 minutes):
1. Set up your company profile - Add logo, contact info, and payment settings
2. Add your first client - Import a CSV or add manually
3. Create a quote - Use our template to send your first quote

Need help? Check out our Help Center at https://app.stackdek.com/help or reply to this email with any questions.

---
StackDek - Contractor Management Made Simple
https://stackdek.com | hello@stackdek.com
`
}
