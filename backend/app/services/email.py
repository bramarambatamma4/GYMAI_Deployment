import json
import urllib.error
import urllib.request

from app.config import settings


def _resolve_sender() -> str:
    sender = (settings.email_from or settings.smtp_from).strip()
    if not sender:
        raise RuntimeError("EMAIL_FROM is not configured. Set EMAIL_FROM to a valid sender address.")
    return sender


def _send_via_resend(to_email: str, subject: str, text_body: str, html_body: str | None = None) -> None:
    api_key = (settings.resend_api_key or "").strip()
    if not api_key:
        raise RuntimeError("RESEND_API_KEY is not configured.")

    payload = {
        "from": _resolve_sender(),
        "to": [to_email],
        "subject": subject,
        "text": text_body,
    }
    if html_body:
        payload["html"] = html_body

    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        "https://api.resend.com/emails",
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            response_body = response.read().decode("utf-8", errors="replace")
            if response.status not in (200, 201, 202):
                raise RuntimeError(f"Resend rejected the email with HTTP {response.status}: {response_body}")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Resend API rejected the email: {exc.code} {body}") from exc
    except Exception as exc:
        raise RuntimeError(f"Email delivery failed via Resend: {exc}") from exc


def send_registration_code(to_email: str, code: str) -> None:
    text = f"""Hi,\n\nWelcome to GymAI. Your 6-digit verification code is: {code}\n\nThis code expires in {settings.registration_code_expire_minutes} minutes. If you did not create this account, you can ignore this email.\n\n— GymAI Security\n"""
    _send_via_resend(
        to_email,
        "Verify your GymAI email",
        text,
    )


def send_password_reset_code(to_email: str, code: str) -> None:
    text = f"""Hi,\n\nWe received a request to reset your GymAI password.\n\nYour verification code is: {code}\n\nThis code expires in {settings.password_reset_expire_minutes} minutes. If you did not request a password reset, you can safely ignore this email.\n\n— GymAI Security\n"""
    _send_via_resend(
        to_email,
        "GymAI password reset code",
        text,
    )


def send_event_alert(to_email: str, title: str, message: str, country: str, state: str, area: str, url: str | None) -> None:
    """Send one marathon / fitness event alert. Raises on delivery problems."""
    link = f"\nDetails: {url}\n" if url else ""
    text = f"{title}\nLocation: {area}, {state}, {country}\n\n{message}\n{link}\n— GymAI Events"
    _send_via_resend(
        to_email,
        f"GymAI event near you: {title}",
        text,
    )


def send_incomplete_workout_reminder(to_email: str, workout_url: str) -> None:
    """Reminder email with a prominent CTA button."""
    text = "Your workout today is not completed. Visit GymAI and complete your workout.\n\nComplete It Now: " + workout_url
    html = f"""<!doctype html><html><body style="margin:0;padding:24px;background:#0b0b0d;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:480px;background:#16161a;border:1px solid #2a2a30;border-radius:16px;">
<tr><td style="padding:32px;text-align:center;">
<p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#ffffff;">Gym<span style="color:#FF5A00;">AI</span></p>
<p style="margin:16px 0 28px;font-size:16px;line-height:1.6;color:#d4d4d8;">Your workout today is not completed. Visit GymAI and complete your workout.</p>
<a href="{workout_url}" style="display:inline-block;padding:14px 32px;background:#FF5A00;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:12px;">Complete It Now</a>
</td></tr></table></td></tr></table></body></html>"""
    _send_via_resend(
        to_email,
        "Your workout today is not completed!",
        text,
        html,
    )
