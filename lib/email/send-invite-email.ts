/**
 * Send Invite Email
 *
 * Sends a professionally designed invite email via SendGrid.
 * Called from the invite API route after generating the Supabase invite link.
 */

import sgMail from '@sendgrid/mail';

// Trim to guard against trailing newlines injected by shell echo when setting env vars
const SENDGRID_API_KEY = (process.env.SENDGRID_API_KEY ?? '').trim();
const FROM_EMAIL = (process.env.SENDGRID_FROM_EMAIL ?? 'noreply@apextech.group').trim();
const FROM_NAME = (process.env.SENDGRID_FROM_NAME ?? 'FibreCompare Lead Engagement').trim();

interface SendInviteEmailParams {
  to: string;
  inviteUrl: string;
  inviterName: string;
  role: string;
}

export async function sendInviteEmail(params: SendInviteEmailParams): Promise<void> {
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not configured');
  }

  sgMail.setApiKey(SENDGRID_API_KEY);

  const { to, inviteUrl, inviterName, role } = params;
  const roleBadge = role === 'admin' ? 'Administrator' : 'Agent';

  const html = buildInviteHtml({ inviteUrl, inviterName, roleBadge });

  await sgMail.send({
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `You've been invited to FibreCompare Lead Engagement`,
    text: `${inviterName} has invited you to join FibreCompare Lead Engagement as ${roleBadge === 'Administrator' ? 'an' : 'a'} ${roleBadge}. Set up your account: ${inviteUrl}`,
    html,
  });
}

function buildInviteHtml(params: { inviteUrl: string; inviterName: string; roleBadge: string }): string {
  const { inviteUrl, inviterName, roleBadge } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to FibreCompare Lead Engagement</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:24px;color:#facc15;padding-right:8px;">&#9889;</td>
                  <td style="font-size:22px;font-weight:700;color:#fafafa;letter-spacing:-0.5px;">FibreCompare Lead Engagement</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#18181b;border:1px solid #27272a;border-radius:16px;padding:40px 32px;">
              <!-- Heading -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:20px;font-weight:600;color:#fafafa;padding-bottom:12px;">
                    You've been invited
                  </td>
                </tr>
                <tr>
                  <td style="font-size:15px;color:#a1a1aa;line-height:1.6;padding-bottom:24px;">
                    <strong style="color:#fafafa;">${inviterName}</strong> has invited you to join
                    FibreCompare Lead Engagement as ${roleBadge === 'Administrator' ? 'an' : 'a'}
                  </td>
                </tr>
              </table>

              <!-- Role Badge -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="padding-bottom:28px;">
                <tr>
                  <td style="background-color:${roleBadge === 'Administrator' ? 'rgba(250,204,21,0.1)' : 'rgba(161,161,170,0.1)'};color:${roleBadge === 'Administrator' ? '#facc15' : '#a1a1aa'};font-size:13px;font-weight:600;padding:6px 14px;border-radius:20px;letter-spacing:0.3px;">
                    ${roleBadge}
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="${inviteUrl}" target="_blank" style="display:inline-block;background-color:#fafafa;color:#09090b;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;letter-spacing:-0.2px;">
                      Set Up Your Account
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #27272a;padding-top:20px;">
                    <p style="margin:0;font-size:13px;color:#71717a;line-height:1.5;">
                      This invitation link will expire in 3 days. If you didn't expect this email, you can safely ignore it.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#52525b;">
                FibreCompare Lead Engagement &middot; Powered by Apex Tech
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
