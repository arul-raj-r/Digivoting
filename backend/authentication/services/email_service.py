from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings


class EmailService:
    @staticmethod
    def _get_frontend_url():
        return getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

    @staticmethod
    def send_verification_email(email, token_value):
        subject = "DigiVote - Verify Your Email Address"
        frontend_url = EmailService._get_frontend_url()
        verification_link = f"{frontend_url}/verify-email?token={token_value}"

        # Plain text fallback
        text_message = (
            f"Thank you for registering a DigiVote website account.\n\n"
            f"Please verify your email address by clicking the link below:\n"
            f"{verification_link}\n\n"
            f"This link will expire in 24 hours."
        )

        # HTML email template
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Segoe UI',Roboto,Arial,sans-serif;">
          <div style="max-width:520px; margin:40px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <div style="background:linear-gradient(135deg,#1e40af,#3b82f6); padding:32px 24px; text-align:center;">
              <h1 style="color:#ffffff; margin:0; font-size:22px; letter-spacing:0.5px;">🗳️ DigiVote</h1>
              <p style="color:#bfdbfe; margin:8px 0 0; font-size:13px;">Secure Digital Voting Platform</p>
            </div>
            <div style="padding:32px 24px;">
              <h2 style="color:#1e293b; margin:0 0 8px; font-size:18px;">Verify Your Email Address</h2>
              <p style="color:#64748b; font-size:14px; line-height:1.6; margin:0 0 24px;">
                Thank you for registering. Please click the button below to activate your account.
              </p>
              <div style="text-align:center; margin:24px 0;">
                <a href="{verification_link}" style="display:inline-block; background:linear-gradient(135deg,#1e40af,#3b82f6); color:#ffffff; text-decoration:none; padding:14px 36px; border-radius:8px; font-size:14px; font-weight:600; letter-spacing:0.3px;">
                  Verify Email Address
                </a>
              </div>
              <p style="color:#94a3b8; font-size:12px; line-height:1.5; margin:24px 0 0; border-top:1px solid #e2e8f0; padding-top:16px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="{verification_link}" style="color:#3b82f6; word-break:break-all;">{verification_link}</a>
              </p>
              <p style="color:#cbd5e1; font-size:11px; margin:16px 0 0;">This link expires in 24 hours.</p>
            </div>
          </div>
        </body>
        </html>
        """

        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@digivote.gov.in'),
            to=[email],
        )
        msg.attach_alternative(html_message, "text/html")
        msg.send(fail_silently=False)

    @staticmethod
    def send_password_reset_email(email, token_value):
        subject = "DigiVote - Password Reset Request"
        frontend_url = EmailService._get_frontend_url()
        reset_link = f"{frontend_url}/reset-password?token={token_value}"

        text_message = (
            f"We received a request to reset your DigiVote account password.\n\n"
            f"Please click the link below to set a new password:\n"
            f"{reset_link}\n\n"
            f"If you did not request this, you can ignore this email. The token will expire in 1 hour."
        )

        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Segoe UI',Roboto,Arial,sans-serif;">
          <div style="max-width:520px; margin:40px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <div style="background:linear-gradient(135deg,#1e40af,#3b82f6); padding:32px 24px; text-align:center;">
              <h1 style="color:#ffffff; margin:0; font-size:22px; letter-spacing:0.5px;">🗳️ DigiVote</h1>
              <p style="color:#bfdbfe; margin:8px 0 0; font-size:13px;">Secure Digital Voting Platform</p>
            </div>
            <div style="padding:32px 24px;">
              <h2 style="color:#1e293b; margin:0 0 8px; font-size:18px;">Reset Your Password</h2>
              <p style="color:#64748b; font-size:14px; line-height:1.6; margin:0 0 24px;">
                We received a request to reset your account password. Click the button below to create a new password.
              </p>
              <div style="text-align:center; margin:24px 0;">
                <a href="{reset_link}" style="display:inline-block; background:linear-gradient(135deg,#dc2626,#ef4444); color:#ffffff; text-decoration:none; padding:14px 36px; border-radius:8px; font-size:14px; font-weight:600; letter-spacing:0.3px;">
                  Reset Password
                </a>
              </div>
              <p style="color:#94a3b8; font-size:12px; line-height:1.5; margin:24px 0 0; border-top:1px solid #e2e8f0; padding-top:16px;">
                If you did not request this reset, please ignore this email. Your password will remain unchanged.<br>
                <a href="{reset_link}" style="color:#3b82f6; word-break:break-all;">{reset_link}</a>
              </p>
              <p style="color:#cbd5e1; font-size:11px; margin:16px 0 0;">This link expires in 1 hour.</p>
            </div>
          </div>
        </body>
        </html>
        """

        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@digivote.gov.in'),
            to=[email],
        )
        msg.attach_alternative(html_message, "text/html")
        msg.send(fail_silently=False)

    @staticmethod
    def send_otp_email(email, otp_code):
        """Send OTP verification code to the user's email for MFA."""
        subject = "DigiVote - Your Login Verification Code"

        text_message = (
            f"Your DigiVote verification code is: {otp_code}\n\n"
            f"This code will expire in 5 minutes.\n"
            f"If you did not attempt to log in, please secure your account immediately."
        )

        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Segoe UI',Roboto,Arial,sans-serif;">
          <div style="max-width:520px; margin:40px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <div style="background:linear-gradient(135deg,#1e40af,#3b82f6); padding:32px 24px; text-align:center;">
              <h1 style="color:#ffffff; margin:0; font-size:22px; letter-spacing:0.5px;">🗳️ DigiVote</h1>
              <p style="color:#bfdbfe; margin:8px 0 0; font-size:13px;">Secure Digital Voting Platform</p>
            </div>
            <div style="padding:32px 24px; text-align:center;">
              <h2 style="color:#1e293b; margin:0 0 8px; font-size:18px;">Login Verification Code</h2>
              <p style="color:#64748b; font-size:14px; line-height:1.6; margin:0 0 24px;">
                Enter the following code to complete your sign-in:
              </p>
              <div style="background:#f8fafc; border:2px dashed #cbd5e1; border-radius:12px; padding:20px; margin:20px 0;">
                <span style="font-size:36px; font-weight:700; letter-spacing:8px; color:#1e40af; font-family:monospace;">
                  {otp_code}
                </span>
              </div>
              <p style="color:#94a3b8; font-size:12px; margin:16px 0 0;">
                This code expires in <strong>5 minutes</strong>.
              </p>
              <p style="color:#cbd5e1; font-size:11px; margin:24px 0 0; border-top:1px solid #e2e8f0; padding-top:16px;">
                If you did not attempt to log in, please ignore this email and consider changing your password.
              </p>
            </div>
          </div>
        </body>
        </html>
        """

        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@digivote.gov.in'),
            to=[email],
        )
        msg.attach_alternative(html_message, "text/html")
        msg.send(fail_silently=False)
