import smtplib
from email.message import EmailMessage

from app.config import settings




def send_registration_code(to_email: str, code: str) -> None:
    if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password:
        raise RuntimeError("SMTP email is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASSWORD.")
    sender = settings.smtp_from.strip() or settings.smtp_user.strip()
    message = EmailMessage()
    message["Subject"] = "Verify your GymAI email"
    message["From"] = sender
    message["To"] = to_email
    message.set_content(f"""Hi,\n\nWelcome to GymAI. Your 6-digit verification code is: {code}\n\nThis code expires in {settings.registration_code_expire_minutes} minutes. If you did not create this account, you can ignore this email.\n\n— GymAI Security\n""")
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
        if settings.smtp_use_tls: server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(message)


def send_password_reset_code(to_email: str, code: str) -> None:
    if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password:
        raise RuntimeError("SMTP email is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASSWORD.")

    sender = settings.smtp_from.strip() or settings.smtp_user.strip()

    message = EmailMessage()
    message["Subject"] = "GymAI password reset code"
    message["From"] = sender
    message["To"] = to_email
    message.set_content(
        f"""Hi,

We received a request to reset your GymAI password.

Your verification code is: {code}

This code expires in {settings.password_reset_expire_minutes} minutes. If you did not request a password reset, you can safely ignore this email.

— GymAI Security
"""
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
        if settings.smtp_use_tls:
            server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(message)


def send_event_alert(to_email: str, title: str, message: str, country: str, state: str, area: str, url: str | None) -> None:
    """Send one marathon / fitness event alert. Raises on SMTP problems."""
    if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password:
        raise RuntimeError("SMTP email is not configured.")

    sender = settings.smtp_from.strip() or settings.smtp_user.strip()
    msg = EmailMessage()
    msg["Subject"] = f"GymAI event near you: {title}"
    msg["From"] = sender
    msg["To"] = to_email
    link = f"\nDetails: {url}\n" if url else ""
    msg.set_content(f"{title}\nLocation: {area}, {state}, {country}\n\n{message}\n{link}\n— GymAI Events")

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
        if settings.smtp_use_tls:
            server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)



def send_incomplete_workout_reminder(to_email: str, workout_url: str) -> None:
    """CHANGE 4: reminder email with a prominent "Complete It Now" button."""
    if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password:
        raise RuntimeError("SMTP email is not configured.")

    sender = settings.smtp_from.strip() or settings.smtp_user.strip()
    msg = EmailMessage()
    msg["Subject"] = "Your workout today is not completed!"
    msg["From"] = sender
    msg["To"] = to_email
    text = "Your workout today is not completed. Visit GymAI and complete your workout.\n\nComplete It Now: " + workout_url
    msg.set_content(text)  # plain-text fallback
    msg.add_alternative(
        f"""<!doctype html><html><body style="margin:0;padding:24px;background:#0b0b0d;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:480px;background:#16161a;border:1px solid #2a2a30;border-radius:16px;">
<tr><td style="padding:32px;text-align:center;">
<p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#ffffff;">Gym<span style="color:#FF5A00;">AI</span></p>
<p style="margin:16px 0 28px;font-size:16px;line-height:1.6;color:#d4d4d8;">Your workout today is not completed. Visit GymAI and complete your workout.</p>
<a href="{workout_url}" style="display:inline-block;padding:14px 32px;background:#FF5A00;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:12px;">Complete It Now</a>
</td></tr></table></td></tr></table></body></html>""",
        subtype="html",
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
        if settings.smtp_use_tls:
            server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)
