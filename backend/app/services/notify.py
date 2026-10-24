from __future__ import annotations
import logging
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app import models
from app.database import SessionLocal
from app.services.email import send_event_alert
log=logging.getLogger('gymai.notify')
def norm(value:str)->str:return ' '.join(value.strip().split())
def publish_event(db:Session,*,title:str,message_text:str,country:str,state:str,area:str,target_url:str|None=None):
    note=models.Notification(title=norm(title),message_text=message_text.strip(),country=norm(country),state=norm(state),area=norm(area),target_url=target_url);db.add(note);db.commit();db.refresh(note)
    rows=db.execute(select(models.UserPreference.notification_email).where(func.lower(models.UserPreference.country)==note.country.lower()).where(func.lower(models.UserPreference.state)==note.state.lower()).where(func.lower(models.UserPreference.area)==note.area.lower()).where(models.UserPreference.email_enabled.is_(True))).scalars().all()
    return note,sorted({e.strip().lower() for e in rows if e})
def email_recipients(notification_id:str,emails:list[str])->list[str]:
    with SessionLocal() as db: note=db.get(models.Notification,notification_id)
    if not note:return emails
    failed=[]
    for email in emails:
        try: send_event_alert(email,note.title,note.message_text,note.country,note.state,note.area,note.target_url)
        except Exception as exc: failed.append(email);log.warning('event email to %s failed: %s',email,exc)
    return failed
