"""
Ten31 Tasks — Backend API
FastAPI + SQLite + Web Push + Built-in Reminder Scheduler.
Every mutation writes immediately. No save button.
"""
import json
import os
import sqlite3
import threading
import time
import traceback
from contextlib import contextmanager
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─── Config ──────────────────────────────────────────────────────────────────
DB_PATH = os.environ.get("DB_PATH", "/data/ten31-tasks.db")
VAPID_KEY_PATH = os.environ.get("VAPID_KEY_PATH", "/data/vapid")
VAPID_CLAIMS_EMAIL = os.environ.get("VAPID_EMAIL", "mailto:admin@ten31.xyz")

app = FastAPI(title="Ten31 Tasks", docs_url=None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ─── VAPID Keys ──────────────────────────────────────────────────────────────
vapid_private_key = None
vapid_public_key = None

def init_vapid():
    """Generate VAPID keys on first run, load from disk thereafter."""
    global vapid_private_key, vapid_public_key
    import base64
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import serialization
    
    priv_path = Path(VAPID_KEY_PATH) / "private_key.pem"
    pub_path = Path(VAPID_KEY_PATH) / "public_key.txt"
    
    if priv_path.exists() and pub_path.exists():
        vapid_private_key = priv_path.read_text().strip()
        vapid_public_key = pub_path.read_text().strip()
        print(f"VAPID keys loaded from {VAPID_KEY_PATH}")
        return
    
    private_key = ec.generate_private_key(ec.SECP256R1())
    Path(VAPID_KEY_PATH).mkdir(parents=True, exist_ok=True)
    
    priv_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode('utf-8')
    priv_path.write_text(priv_pem)
    
    raw = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    pub_b64 = base64.urlsafe_b64encode(raw).decode('utf-8').rstrip('=')
    pub_path.write_text(pub_b64)
    
    vapid_private_key = priv_pem
    vapid_public_key = pub_b64
    print(f"VAPID keys generated and saved to {VAPID_KEY_PATH}")


# ─── Database ────────────────────────────────────────────────────────────────
def init_db():
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    with get_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS team (
                slug TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS days (
                slug TEXT NOT NULL,
                date TEXT NOT NULL,
                data TEXT NOT NULL DEFAULT '{}',
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (slug, date)
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT NOT NULL,
                subscription TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(slug, subscription)
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS reminder_log (
                slug TEXT NOT NULL,
                date TEXT NOT NULL,
                checkpoint TEXT NOT NULL,
                sent_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (slug, date, checkpoint)
            )
        """)
        # Default settings
        defaults = {
            "reminder_timezone": "America/Chicago",
            "reminder_morning_hour": "9",
            "reminder_afternoon_hour": "15",
            "reminder_evening_hour": "20",
            "reminder_skip_weekends": "false",
            "reminders_enabled": "true",
        }
        for k, v in defaults.items():
            db.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
                (k, v)
            )
        db.commit()


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


@app.on_event("startup")
def startup():
    init_db()
    init_vapid()
    start_reminder_scheduler()


# ─── Models ──────────────────────────────────────────────────────────────────
class TeamMember(BaseModel):
    name: str
    slug: str


class DayItem(BaseModel):
    text: str = ""
    worked: bool = False
    done: bool = False


class DayData(BaseModel):
    items: list[DayItem] = []
    locked: bool = False
    lockedAt: Optional[str] = None
    reflection: str = ""


class DayUpdate(BaseModel):
    items: Optional[list[DayItem]] = None
    locked: Optional[bool] = None
    lockedAt: Optional[str] = None
    reflection: Optional[str] = None


class PushSubscription(BaseModel):
    slug: str
    subscription: dict


class SettingsUpdate(BaseModel):
    reminder_timezone: Optional[str] = None
    reminder_morning_hour: Optional[int] = None
    reminder_afternoon_hour: Optional[int] = None
    reminder_evening_hour: Optional[int] = None
    reminder_skip_weekends: Optional[bool] = None
    reminders_enabled: Optional[bool] = None


# ─── Team endpoints ──────────────────────────────────────────────────────────
@app.get("/api/team")
def list_team():
    with get_db() as db:
        rows = db.execute("SELECT slug, name FROM team ORDER BY created_at").fetchall()
        return [{"slug": r["slug"], "name": r["name"]} for r in rows]


@app.post("/api/team")
def add_member(member: TeamMember):
    slug = member.slug.strip().lower()
    name = member.name.strip()
    if not slug or not name:
        raise HTTPException(400, "Name and slug required")
    with get_db() as db:
        try:
            db.execute("INSERT INTO team (slug, name) VALUES (?, ?)", (slug, name))
            db.commit()
        except sqlite3.IntegrityError:
            raise HTTPException(409, f"Member '{slug}' already exists")
    return {"slug": slug, "name": name}


@app.delete("/api/team/{slug}")
def remove_member(slug: str):
    with get_db() as db:
        db.execute("DELETE FROM team WHERE slug = ?", (slug,))
        db.execute("DELETE FROM days WHERE slug = ?", (slug,))
        db.execute("DELETE FROM push_subscriptions WHERE slug = ?", (slug,))
        db.execute("DELETE FROM reminder_log WHERE slug = ?", (slug,))
        db.commit()
    return {"deleted": slug}


# ─── Day endpoints ───────────────────────────────────────────────────────────
@app.get("/api/days/{slug}")
def get_user_days(slug: str):
    with get_db() as db:
        rows = db.execute("SELECT date, data FROM days WHERE slug = ?", (slug,)).fetchall()
        result = {}
        for r in rows:
            result[r["date"]] = json.loads(r["data"])
        return result


@app.get("/api/days/{slug}/{day_date}")
def get_day(slug: str, day_date: str):
    with get_db() as db:
        row = db.execute("SELECT data FROM days WHERE slug = ? AND date = ?", (slug, day_date)).fetchone()
        if row:
            return json.loads(row["data"])
        return {
            "items": [{"text": "", "done": False} for _ in range(6)],
            "locked": False, "lockedAt": None, "reflection": ""
        }


@app.put("/api/days/{slug}/{day_date}")
def update_day(slug: str, day_date: str, update: DayUpdate):
    with get_db() as db:
        row = db.execute("SELECT data FROM days WHERE slug = ? AND date = ?", (slug, day_date)).fetchone()
        if row:
            existing = json.loads(row["data"])
        else:
            existing = {
                "items": [{"text": "", "done": False} for _ in range(6)],
                "locked": False, "lockedAt": None, "reflection": ""
            }

        update_dict = update.dict(exclude_none=True)
        if "items" in update_dict:
            existing["items"] = [item.dict() if hasattr(item, 'dict') else item for item in update_dict["items"]]
        if "locked" in update_dict:
            existing["locked"] = update_dict["locked"]
        if "lockedAt" in update_dict:
            existing["lockedAt"] = update_dict["lockedAt"]
        if "reflection" in update_dict:
            existing["reflection"] = update_dict["reflection"]

        db.execute(
            "INSERT OR REPLACE INTO days (slug, date, data, updated_at) VALUES (?, ?, ?, datetime('now'))",
            (slug, day_date, json.dumps(existing))
        )
        db.commit()
        return existing


# ─── Push Subscription endpoints ─────────────────────────────────────────────
@app.get("/api/push/vapid-public-key")
def get_vapid_public_key():
    return {"publicKey": vapid_public_key}


@app.post("/api/push/subscribe")
def subscribe_push(sub: PushSubscription):
    sub_json = json.dumps(sub.subscription, sort_keys=True)
    with get_db() as db:
        try:
            db.execute(
                "INSERT OR REPLACE INTO push_subscriptions (slug, subscription) VALUES (?, ?)",
                (sub.slug, sub_json)
            )
            db.commit()
        except Exception as e:
            raise HTTPException(500, f"Failed to save subscription: {e}")
    return {"status": "subscribed", "slug": sub.slug}


@app.delete("/api/push/subscribe/{slug}")
def unsubscribe_push(slug: str):
    with get_db() as db:
        db.execute("DELETE FROM push_subscriptions WHERE slug = ?", (slug,))
        db.commit()
    return {"status": "unsubscribed", "slug": slug}


# ─── Settings endpoints ─────────────────────────────────────────────────────
@app.get("/api/settings")
def get_settings():
    with get_db() as db:
        rows = db.execute("SELECT key, value FROM settings").fetchall()
        settings = {r["key"]: r["value"] for r in rows}
    return {
        "timezone": settings.get("reminder_timezone", "America/Chicago"),
        "morning_hour": int(settings.get("reminder_morning_hour", "9")),
        "afternoon_hour": int(settings.get("reminder_afternoon_hour", "15")),
        "evening_hour": int(settings.get("reminder_evening_hour", "20")),
        "skip_weekends": settings.get("reminder_skip_weekends", "false") == "true",
        "reminders_enabled": settings.get("reminders_enabled", "true") == "true",
    }


@app.put("/api/settings")
def update_settings(updates: SettingsUpdate):
    with get_db() as db:
        mapping = {
            "reminder_timezone": updates.reminder_timezone,
            "reminder_morning_hour": str(updates.reminder_morning_hour) if updates.reminder_morning_hour is not None else None,
            "reminder_afternoon_hour": str(updates.reminder_afternoon_hour) if updates.reminder_afternoon_hour is not None else None,
            "reminder_evening_hour": str(updates.reminder_evening_hour) if updates.reminder_evening_hour is not None else None,
            "reminder_skip_weekends": str(updates.reminder_skip_weekends).lower() if updates.reminder_skip_weekends is not None else None,
            "reminders_enabled": str(updates.reminders_enabled).lower() if updates.reminders_enabled is not None else None,
        }
        for k, v in mapping.items():
            if v is not None:
                db.execute(
                    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                    (k, v)
                )
        db.commit()
    return get_settings()


# ─── Reminder endpoints ─────────────────────────────────────────────────────
@app.get("/api/reminders/pending")
def reminders_pending():
    today_str = date.today().isoformat()
    with get_db() as db:
        members = db.execute("SELECT slug, name FROM team ORDER BY created_at").fetchall()
        pending = []
        for m in members:
            slug = m["slug"]
            row = db.execute(
                "SELECT data FROM days WHERE slug = ? AND date = ?",
                (slug, today_str)
            ).fetchone()
            
            if not row:
                pending.append({
                    "slug": slug, "name": m["name"],
                    "reason": "not_committed",
                    "message": f"{m['name']} hasn't committed their list for today.",
                })
                continue
            
            day_data = json.loads(row["data"])
            if not day_data.get("locked"):
                pending.append({
                    "slug": slug, "name": m["name"],
                    "reason": "not_committed",
                    "message": f"{m['name']} hasn't committed their list for today.",
                })
                continue
            
            items = day_data.get("items", [])
            total = len([i for i in items if i.get("text")])
            done = len([i for i in items if i.get("text") and i.get("done")])
            worked = len([i for i in items if i.get("text") and i.get("worked")])
            
            if total > 0 and done < total:
                pending.append({
                    "slug": slug, "name": m["name"],
                    "reason": "incomplete",
                    "done": done, "worked": worked, "total": total,
                    "message": f"{m['name']} has {done}/{total} complete ({worked} worked on).",
                    "remaining": [i.get("text") for i in items if i.get("text") and not i.get("done")],
                })
            elif total > 0 and done == total and not day_data.get("reflection"):
                pending.append({
                    "slug": slug, "name": m["name"],
                    "reason": "no_reflection",
                    "message": f"{m['name']} finished all tasks but hasn't reflected.",
                })
        
        return {
            "date": today_str,
            "pending": pending,
            "all_clear": len(pending) == 0,
        }


# ─── Reflections endpoint ────────────────────────────────────────────────────
@app.get("/api/reflections/{slug}")
def get_reflections(slug: str, period: Optional[str] = None, start: Optional[str] = None, end: Optional[str] = None):
    """
    Return reflections for a team member.
    
    Query params:
      period: week | month | quarter | year (relative to today)
      start/end: YYYY-MM-DD custom date range
    
    Returns dated reflections with task context (what was planned, what got done).
    Designed for weekly/monthly/yearly review synthesis.
    """
    today_str = date.today().isoformat()
    
    # Determine date range
    if start and end:
        date_from = start
        date_to = end
    elif period == "week":
        date_from = shiftDate(today_str, -7)
        date_to = today_str
    elif period == "month":
        date_from = shiftDate(today_str, -30)
        date_to = today_str
    elif period == "quarter":
        date_from = shiftDate(today_str, -90)
        date_to = today_str
    elif period == "year":
        date_from = shiftDate(today_str, -365)
        date_to = today_str
    else:
        # Default: last 30 days
        date_from = shiftDate(today_str, -30)
        date_to = today_str
    
    with get_db() as db:
        # Verify member exists
        member = db.execute("SELECT name FROM team WHERE slug = ?", (slug,)).fetchone()
        if not member:
            raise HTTPException(404, f"Member '{slug}' not found")
        
        rows = db.execute(
            "SELECT date, data FROM days WHERE slug = ? AND date >= ? AND date <= ? ORDER BY date DESC",
            (slug, date_from, date_to)
        ).fetchall()
        
        reflections = []
        for r in rows:
            day_data = json.loads(r["data"])
            reflection_text = day_data.get("reflection", "").strip()
            if not reflection_text:
                continue
            
            items = day_data.get("items", [])
            total = len([i for i in items if i.get("text")])
            done = len([i for i in items if i.get("text") and i.get("done")])
            
            worked = len([i for i in items if i.get("text") and i.get("worked")])
            reflections.append({
                "date": r["date"],
                "reflection": reflection_text,
                "tasks_planned": [i.get("text") for i in items if i.get("text")],
                "tasks_completed": [i.get("text") for i in items if i.get("text") and i.get("done")],
                "tasks_worked": [i.get("text") for i in items if i.get("text") and i.get("worked")],
                "tasks_incomplete": [i.get("text") for i in items if i.get("text") and not i.get("done") and not i.get("worked")],
                "completion": f"{done}/{total}" if total > 0 else "0/0",
                "worked_count": worked,
            })
        
        return {
            "slug": slug,
            "name": member["name"],
            "period": period or "custom",
            "from": date_from,
            "to": date_to,
            "count": len(reflections),
            "reflections": reflections,
        }


def shiftDate(iso: str, days: int) -> str:
    """Shift an ISO date string by N days."""
    d = date.fromisoformat(iso) + timedelta(days=days)
    return d.isoformat()


@app.post("/api/reminders/send")
def send_reminders_endpoint():
    """Manual trigger for sending reminders."""
    return _send_push_reminders()


# ─── Push sending logic ─────────────────────────────────────────────────────
def _send_push_for_member(slug, payload_dict, db):
    """Send push notification to all subscriptions for a member. Returns sent count."""
    from pywebpush import webpush, WebPushException
    
    subs = db.execute(
        "SELECT id, subscription FROM push_subscriptions WHERE slug = ?",
        (slug,)
    ).fetchall()
    
    if not subs:
        return 0
    
    payload = json.dumps(payload_dict)
    sent = 0
    stale = []
    
    for sub_row in subs:
        sub_data = json.loads(sub_row["subscription"])
        try:
            webpush(
                subscription_info=sub_data,
                data=payload,
                vapid_private_key=vapid_private_key,
                vapid_claims={"sub": VAPID_CLAIMS_EMAIL},
            )
            sent += 1
        except WebPushException as e:
            if "410" in str(e) or "404" in str(e):
                stale.append(sub_row["id"])
            else:
                print(f"Push error for {slug}: {e}")
        except Exception as e:
            print(f"Push error for {slug}: {e}")
    
    for sid in stale:
        db.execute("DELETE FROM push_subscriptions WHERE id = ?", (sid,))
    if stale:
        db.commit()
    
    return sent


def _send_push_reminders(checkpoint=None):
    """Check conditions and send appropriate push notifications."""
    today_str = date.today().isoformat()
    sent_count = 0
    
    with get_db() as db:
        members = db.execute("SELECT slug, name FROM team ORDER BY created_at").fetchall()
        
        for m in members:
            slug = m["slug"]
            name = m["name"]
            
            # Check what state this member is in
            row = db.execute(
                "SELECT data FROM days WHERE slug = ? AND date = ?",
                (slug, today_str)
            ).fetchone()
            
            day_data = json.loads(row["data"]) if row else None
            committed = day_data.get("locked", False) if day_data else False
            items = day_data.get("items", []) if day_data else []
            total = len([i for i in items if i.get("text")])
            done = len([i for i in items if i.get("text") and i.get("done")])
            worked_on = len([i for i in items if i.get("text") and i.get("worked")])
            has_reflection = bool(day_data.get("reflection")) if day_data else False
            
            # Determine which checkpoint applies
            if checkpoint == "morning" and not committed:
                tag = "morning"
                payload = {
                    "title": "📋 Commit your six",
                    "body": "What matters most today? Write your six tasks and lock them in.",
                    "url": f"/list/{slug}",
                    "tag": f"ten31-{today_str}-morning",
                }
            elif checkpoint == "afternoon" and committed and total > 0 and done < total:
                remaining = [i.get("text") for i in items if i.get("text") and not i.get("done")]
                top = remaining[0] if remaining else "your tasks"
                payload = {
                    "title": f"⏳ {done}/{total} done — keep going",
                    "body": f"Next up: {top}",
                    "url": f"/list/{slug}",
                    "tag": f"ten31-{today_str}-afternoon",
                }
                tag = "afternoon"
            elif checkpoint == "evening" and committed and total > 0 and done == total and not has_reflection:
                payload = {
                    "title": "📝 Reflect on your day",
                    "body": "All tasks done — how'd today go? Write a quick reflection.",
                    "url": f"/list/{slug}",
                    "tag": f"ten31-{today_str}-evening",
                }
                tag = "evening"
            elif checkpoint is None:
                # Manual send — pick the most relevant
                if not committed:
                    payload = {
                        "title": "📋 Commit your six",
                        "body": "What matters most today?",
                        "url": f"/list/{slug}",
                        "tag": f"ten31-{today_str}",
                    }
                    tag = "manual"
                elif total > 0 and done < total:
                    remaining = [i.get("text") for i in items if i.get("text") and not i.get("done")]
                    top = remaining[0] if remaining else "your tasks"
                    payload = {
                        "title": f"⏳ {done}/{total} done",
                        "body": f"Next up: {top}",
                        "url": f"/list/{slug}",
                        "tag": f"ten31-{today_str}",
                    }
                    tag = "manual"
                else:
                    continue  # Nothing to nudge
            else:
                continue  # Condition not met for this checkpoint
            
            # Check if already sent this checkpoint today
            if checkpoint:
                already = db.execute(
                    "SELECT 1 FROM reminder_log WHERE slug = ? AND date = ? AND checkpoint = ?",
                    (slug, today_str, tag)
                ).fetchone()
                if already:
                    continue
            
            # Send it
            count = _send_push_for_member(slug, payload, db)
            if count > 0:
                sent_count += count
                if checkpoint:
                    db.execute(
                        "INSERT OR IGNORE INTO reminder_log (slug, date, checkpoint) VALUES (?, ?, ?)",
                        (slug, today_str, tag)
                    )
                    db.commit()
    
    return {"sent": sent_count, "checkpoint": checkpoint or "manual"}


# ─── Built-in Reminder Scheduler ────────────────────────────────────────────
def start_reminder_scheduler():
    """Background thread that checks every 5 minutes if a reminder window has been crossed."""
    
    def scheduler_loop():
        print("Reminder scheduler started")
        last_checks = {}  # {checkpoint: last_date_checked}
        
        while True:
            try:
                time.sleep(300)  # Check every 5 minutes
                
                # Load settings
                settings = get_settings()
                if not settings.get("reminders_enabled"):
                    continue
                
                tz_name = settings.get("timezone", "America/Chicago")
                
                # Get current time in configured timezone
                try:
                    import zoneinfo
                    tz = zoneinfo.ZoneInfo(tz_name)
                except Exception:
                    # Fallback: try UTC offset for common US timezones
                    tz_offsets = {
                        "America/Chicago": -6, "America/New_York": -5,
                        "America/Denver": -7, "America/Los_Angeles": -8,
                        "US/Central": -6, "US/Eastern": -5,
                        "US/Mountain": -7, "US/Pacific": -8,
                    }
                    offset_hours = tz_offsets.get(tz_name, -6)
                    now_utc = datetime.utcnow()
                    now_local = now_utc + timedelta(hours=offset_hours)
                    tz = None
                
                if tz:
                    now_local = datetime.now(tz)
                
                current_hour = now_local.hour
                current_day = now_local.strftime("%A")
                today_str = now_local.strftime("%Y-%m-%d")
                
                # Skip weekends if configured
                if settings.get("skip_weekends") and current_day in ("Saturday", "Sunday"):
                    continue
                
                # Check each checkpoint
                checkpoints = [
                    ("morning", settings.get("morning_hour", 9)),
                    ("afternoon", settings.get("afternoon_hour", 15)),
                    ("evening", settings.get("evening_hour", 20)),
                ]
                
                for cp_name, cp_hour in checkpoints:
                    check_key = f"{cp_name}:{today_str}"
                    
                    # Fire if we're in the right hour and haven't checked this window today
                    if current_hour == cp_hour and last_checks.get(check_key) != True:
                        last_checks[check_key] = True
                        try:
                            result = _send_push_reminders(checkpoint=cp_name)
                            if result["sent"] > 0:
                                print(f"Reminder [{cp_name}]: sent {result['sent']} notifications")
                        except Exception as e:
                            print(f"Reminder [{cp_name}] error: {e}")
                
                # Clean old keys (keep only today)
                stale_keys = [k for k in last_checks if not k.endswith(today_str)]
                for k in stale_keys:
                    del last_checks[k]
                    
            except Exception as e:
                print(f"Scheduler error: {e}")
                traceback.print_exc()
    
    t = threading.Thread(target=scheduler_loop, daemon=True)
    t.start()


# ─── Bulk endpoint for team board ────────────────────────────────────────────
@app.get("/api/team/today")
def team_today():
    today_str = date.today().isoformat()
    with get_db() as db:
        members = db.execute("SELECT slug, name FROM team ORDER BY created_at").fetchall()
        result = []
        for m in members:
            slug = m["slug"]
            rows = db.execute(
                "SELECT date, data FROM days WHERE slug = ? ORDER BY date DESC LIMIT 30",
                (slug,)
            ).fetchall()
            days_map = {r["date"]: json.loads(r["data"]) for r in rows}

            result.append({
                "slug": slug,
                "name": m["name"],
                "days": days_map,
            })
        return result
