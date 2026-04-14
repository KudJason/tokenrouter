// Trial Request Handler - Saves to D1 and sends email notification
import type { Env } from '../types';

interface TrialRequest {
  company: string;
  industry: string;
  email: string;
  employees: string;
  message?: string;
}

interface TrialRecord {
  id: string;
  company: string;
  industry: string;
  email: string;
  employees: string;
  message: string;
  status: 'pending' | 'contacted' | 'converted';
  created_at: number;
}

/**
 * Handle trial request submission
 * POST /v1/trial
 */
export async function handleTrialRequest(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json() as TrialRequest;

    // Validate required fields
    if (!body.company || !body.email || !body.industry) {
      return Response.json({
        success: false,
        error: 'Company, email, and industry are required'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return Response.json({
        success: false,
        error: 'Invalid email format'
      }, { status: 400 });
    }

    // Generate unique ID
    const id = `trial_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = Math.floor(Date.now() / 1000);

    // Save to D1
    await env.DB.prepare(`
      INSERT INTO trial_requests (id, company, industry, email, employees, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).bind(
      id,
      body.company,
      body.industry,
      body.email,
      body.employees || '',
      body.message || '',
      createdAt
    ).run();

    // Send email notification
    await sendTrialEmail(body, env);

    return Response.json({
      success: true,
      message: 'Trial request submitted successfully',
      id
    });

  } catch (error) {
    console.error('Trial request error:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * Send email notification for new trial request
 */
async function sendTrialEmail(data: TrialRequest, env: Env): Promise<void> {
  const adminEmail = 'jason.jia@thirdhour.eu';

  // Check if RESEND_API_KEY is configured
  const resendApiKey = (env as any).RESEND_API_KEY;
  if (!resendApiKey) {
    console.log('RESEND_API_KEY not configured, skipping email. Trial data:', JSON.stringify(data));
    return;
  }

  const industryLabels: Record<string, string> = {
    'law': 'Law Firms',
    'medical': 'Medical Institutions',
    'financial': 'Financial Institutions',
    'ecommerce': 'E-commerce',
    'other': 'Other'
  };

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #6366f1; }
    .value { margin-top: 5px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">New Trial Request</h2>
      <p style="margin: 10px 0 0 0;">TokenRouter Demo Request</p>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">Company</div>
        <div class="value">${escapeHtml(data.company)}</div>
      </div>
      <div class="field">
        <div class="label">Industry</div>
        <div class="value">${escapeHtml(industryLabels[data.industry] || data.industry)}</div>
      </div>
      <div class="field">
        <div class="label">Email</div>
        <div class="value"><a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></div>
      </div>
      <div class="field">
        <div class="label">Company Size</div>
        <div class="value">${escapeHtml(data.employees)} employees</div>
      </div>
      ${data.message ? `
      <div class="field">
        <div class="label">Message</div>
        <div class="value">${escapeHtml(data.message)}</div>
      </div>
      ` : ''}
      <div style="margin-top: 20px;">
        <span class="badge badge-pending">Pending Review</span>
      </div>
    </div>
    <div class="footer">
      <p>This request was submitted on ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/Madrid' })} (CET).</p>
      <p>Log in to the <a href="https://token.route.worthwolf.top/admin">Admin Dashboard</a> to manage this request.</p>
    </div>
  </div>
</body>
</html>
`;

  const textContent = `
New Trial Request - TokenRouter

Company: ${data.company}
Industry: ${industryLabels[data.industry] || data.industry}
Email: ${data.email}
Company Size: ${data.employees} employees
${data.message ? `\nMessage:\n${data.message}` : ''}

Status: Pending Review

Submitted: ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/Madrid' })} (CET)

Log in to Admin Dashboard to manage this request: https://token.route.worthwolf.top/admin
`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'TokenRouter <onboarding@resend.dev>',
        to: adminEmail,
        subject: `New Trial Request: ${data.company} (${industryLabels[data.industry] || data.industry})`,
        html: htmlContent,
        text: textContent
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Resend API error:', errorData);
    } else {
      console.log('Trial notification email sent successfully');
    }
  } catch (error) {
    console.error('Failed to send trial email:', error);
  }
}

/**
 * Get all trial requests (admin)
 * GET /v1/admin/trials
 */
export async function handleGetTrials(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    let query = 'SELECT * FROM trial_requests WHERE 1=1';
    const bindings: any[] = [];

    if (status) {
      query += ' AND status = ?';
      bindings.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    bindings.push(limit);

    const result = await env.DB.prepare(query).bind(...bindings).all();

    return Response.json({
      success: true,
      trials: result.results
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get trials'
    }, { status: 500 });
  }
}

/**
 * Update trial request status
 * PUT /v1/admin/trials/:id
 */
export async function handleUpdateTrial(
  request: Request,
  env: Env,
  trialId: string
): Promise<Response> {
  try {
    const body = await request.json();
    const { status } = body;

    if (!['pending', 'contacted', 'converted'].includes(status)) {
      return Response.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    await env.DB.prepare(`
      UPDATE trial_requests SET status = ? WHERE id = ?
    `).bind(status, trialId).run();

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update trial'
    }, { status: 500 });
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
