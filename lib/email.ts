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

// ---------------------------------------------------------------------------
// Team import invite email
// ---------------------------------------------------------------------------

interface SendTeamInviteEmailParams {
  to: string;
  userName: string;
  workspaceName: string;
  inviterName: string;
  resetUrl: string;
}

export async function sendTeamInviteEmail({
  to,
  userName,
  workspaceName,
  inviterName,
  resetUrl,
}: SendTeamInviteEmailParams) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://procapacity.io";

  const { data, error } = await resend.emails.send({
    from: "ProCapacity <noreply@procapacity.io>",
    to: [to],
    subject: `You've been added to ${workspaceName} on ProCapacity`,
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
                You've been added to ${workspaceName}
              </h2>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                Hi ${userName},
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                <strong>${inviterName}</strong> has added you to the <strong>${workspaceName}</strong> workspace on ProCapacity. Click the button below to set your password and get started:
              </p>              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0;">
                    <a href="${resetUrl}"
                       style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px;">
                      Set Your Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                This link will expire in 7 days. After setting your password, you can log in at <a href="${appUrl}/login" style="color: #10b981; text-decoration: none;">${appUrl}/login</a>.
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
                &copy; ${new Date().getFullYear()} ProCapacity. All rights reserved.
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
    console.error("Failed to send team invite email:", error);
    throw new Error("Failed to send team invite email");
  }

  return data;
}

// ---------------------------------------------------------------------------
// Assignment notification email
// ---------------------------------------------------------------------------

interface SendAssignmentNotificationEmailParams {
  to: string;
  memberName: string;
  projectName: string;
  role?: string;
  hoursPerWeek: number;
  startDate: Date;
  endDate: Date;
  projectUrl: string;
}

export async function sendAssignmentNotificationEmail({
  to,
  memberName,
  projectName,
  role,
  hoursPerWeek,
  startDate,
  endDate,
  projectUrl,
}: SendAssignmentNotificationEmailParams) {
  const firstName = memberName.split(" ")[0] || memberName;
  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const { data, error } = await resend.emails.send({
    from: "ProCapacity <noreply@procapacity.io>",
    to: [to],
    subject: `New assignment: ${projectName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f8fafc;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <tr><td style="padding:40px 40px 24px;text-align:center;">
    <h1 style="margin:0;font-size:24px;font-weight:700;color:#0f172a;">Pro<span style="color:#10b981;">Capacity</span></h1>
  </td></tr>
  <tr><td style="padding:0 40px 24px;">
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;">Hi ${firstName},</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#0f172a;">
      You've been assigned to <strong>${projectName}</strong>${role ? ` as ${role}` : ""}.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;margin-bottom:20px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 6px;font-size:14px;color:#475569;"><strong>Hours/week:</strong> ${hoursPerWeek}h</p>
        <p style="margin:0 0 6px;font-size:14px;color:#475569;"><strong>Start:</strong> ${formatDate(startDate)}</p>
        <p style="margin:0;font-size:14px;color:#475569;"><strong>End:</strong> ${formatDate(endDate)}</p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0;">
      <a href="${projectUrl}" style="display:inline-block;padding:12px 28px;background:#10b981;color:#fff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;">View Project</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:24px 40px 40px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">© ${new Date().getFullYear()} ProCapacity</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`,
  });

  if (error) {
    console.error("Failed to send assignment notification email:", error);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Over-allocation warning email
// ---------------------------------------------------------------------------

interface AssignmentSummary {
  projectName: string;
  hoursPerWeek: number;
}

interface SendOverAllocationEmailParams {
  to: string;
  memberName: string;
  utilization: number;
  assignments: AssignmentSummary[];
  dashboardUrl: string;
}

export async function sendOverAllocationEmail({
  to,
  memberName,
  utilization,
  assignments,
  dashboardUrl,
}: SendOverAllocationEmailParams) {
  const utilizationPct = Math.round(utilization * 100);
  const assignmentRows = assignments
    .map((a) => `<tr><td style="padding:4px 8px;font-size:14px;color:#475569;">${a.projectName}</td><td style="padding:4px 8px;font-size:14px;color:#475569;text-align:right;">${a.hoursPerWeek}h/week</td></tr>`)
    .join("");

  const { data, error } = await resend.emails.send({
    from: "ProCapacity <noreply@procapacity.io>",
    to: [to],
    subject: `⚠️ Over-allocation: ${memberName} at ${utilizationPct}%`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f8fafc;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <tr><td style="padding:40px 40px 24px;text-align:center;">
    <h1 style="margin:0;font-size:24px;font-weight:700;color:#0f172a;">Pro<span style="color:#10b981;">Capacity</span></h1>
  </td></tr>
  <tr><td style="padding:0 40px 24px;">
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
      <p style="margin:0;font-size:14px;color:#dc2626;font-weight:600;">
        ⚠️ ${memberName} is at ${utilizationPct}% utilization
      </p>
    </div>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;">
      ${memberName} is currently over-allocated. Here are their assignments:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;margin-bottom:20px;">
      <tr><td style="padding:12px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${assignmentRows}
        </table>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0;">
      <a href="${dashboardUrl}" style="display:inline-block;padding:12px 28px;background:#10b981;color:#fff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;">View Capacity</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:24px 40px 40px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">© ${new Date().getFullYear()} ProCapacity</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`,
  });

  if (error) {
    console.error("Failed to send over-allocation email:", error);
  }
  return data;
}
