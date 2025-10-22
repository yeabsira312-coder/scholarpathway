const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@scholarpathway.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM;

async function sendEmail({ to, subject, html, text }) {
  // Option 1: Use Resend API (Professional)
  if (RESEND_API_KEY && EMAIL_FROM) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          from: EMAIL_FROM,
          to, 
          subject, 
          html,
          text: text || extractTextFromHtml(html),
          reply_to: ADMIN_EMAIL || EMAIL_FROM,
          headers: {
            'X-Entity-Ref-ID': `sp-${Date.now()}`,
            'List-Unsubscribe': `<${process.env.SITE_URL || 'https://scholarpathway.glitch.me'}/unsubscribe>`,
            'X-Priority': '3',
            'X-Mailer': 'ScholarPathway',
            'X-Auto-Response-Suppress': 'OOF, AutoReply'
          }
        })
      });
      
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        console.error(`❌ Resend API failed: ${res.status} ${errorText}`);
        return fallbackEmailLog({ to, subject, html });
      }
      
      const result = await res.json();
      console.log(`✅ Email sent via Resend to ${to}:`, result.id);
      return result;
    } catch (error) {
      console.error('❌ Resend API error:', error.message);
      return fallbackEmailLog({ to, subject, html });
    }
  }
  
  // Option 2: Fallback to console logging (Development/Testing)
  return fallbackEmailLog({ to, subject, html });
}

// Fallback function that logs emails to console
function fallbackEmailLog({ to, subject, html }) {
  console.log('\n📧 EMAIL WOULD BE SENT:');
  console.log('=======================');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`HTML Content: ${html.substring(0, 200)}...`);
  console.log('=======================\n');
  
  // For contact form emails to admin, also save to a simple log
  if (to === ADMIN_EMAIL) {
    try {
      const fs = require('fs');
      const path = require('path');
      const logFile = path.join(process.cwd(), 'contact-messages.log');
      const logEntry = `\n[${new Date().toISOString()}] Contact Form Submission\nTo: ${to}\nSubject: ${subject}\nContent: ${html}\n${'='.repeat(50)}\n`;
      fs.appendFileSync(logFile, logEntry);
      console.log('💾 Contact message saved to contact-messages.log');
    } catch (error) {
      console.error('Failed to save contact log:', error.message);
    }
  }
  
  return { 
    success: true, 
    method: 'console_log', 
    id: `log_${Date.now()}`,
    message: 'Email logged to console (no actual email sent)'
  };
}

// Helper function to extract plain text from HTML (to avoid spam filters)
function extractTextFromHtml(html) {
  if (!html) return '';
  
  // Remove HTML tags and normalize whitespace
  let text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style blocks
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script blocks
    .replace(/<[^>]+>/g, ' ') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/&[a-zA-Z0-9#]+;/g, ' ') // Remove HTML entities
    .trim();
    
  // Limit length to avoid being too long
  if (text.length > 1000) {
    text = text.substring(0, 1000) + '...';
  }
  
  return text;
}

module.exports = { sendEmail, ADMIN_EMAIL };
