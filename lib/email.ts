import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendPasswordResetEmailParams {
  to: string;
  resetUrl: string;
  expiresAt: Date;
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  expiresAt,
}: SendPasswordResetEmailParams) {
  const { data, error } = await resend.emails.send({
    from: "ProCapacity <noreply@procapacity.io>",
    to: [to],
    subject: "Reset your ProCapacity password",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 24px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a;">
                Pro<span style="color: #10b981;">Capacity</span>
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #0f172a;">
                Reset your password
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0;">
                    <a href="${resetUrl}" 
                       style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                This link will expire on <strong>${expiresAt.toLocaleString()}</strong> (1 hour from now).
              </p>
              
              <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 40px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 13px; color: #94a3b8; text-align: center;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #10b981; text-align: center; word-break: break-all;">
                ${resetUrl}
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Sub-footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px;">
          <tr>
            <td style="padding: 24px 40px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} ProCapacity. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    console.error("Failed to send password reset email:", error);
    throw new Error("Failed to send email");
  }

  return data;
}

interface SendWelcomeEmailParams {
  to: string;
  firstName: string;
}

export async function sendWelcomeEmail({
  to,
  firstName,
}: SendWelcomeEmailParams) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://procapacity.io";
  
  const { data, error } = await resend.emails.send({
    from: "ProCapacity <noreply@procapacity.io>",
    to: [to],
    subject: "Welcome to ProCapacity",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 8px;">
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #1e293b;">
                Hi ${firstName},
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #1e293b;">
                Welcome to <strong>ProCapacity</strong>! Your account is ready.
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #475569;">
                ProCapacity helps you see who's available, when, and for how much work — so you can staff projects without spreadsheets or guesswork.
              </p>
              
              <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 1.6; color: #1e293b;">
                <strong>Here's how to get started:</strong>
              </p>
              
              <p style="margin: 0 0 8px 0; font-size: 16px; line-height: 1.6; color: #475569;">
                → <a href="${appUrl}/team" style="color: #10b981; text-decoration: none;">Add your team</a>
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #475569;">
                → <a href="${appUrl}/projects" style="color: #10b981; text-decoration: none;">Create your first project</a>
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #475569;">
                Need help setting up? Just reply to this email — we're here to help.
              </p>
              
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #1e293b;">
                Best,<br>
                The ProCapacity Team
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    console.error("Failed to send welcome email:", error);
    throw new Error("Failed to send email");
  }

  return data;
}

