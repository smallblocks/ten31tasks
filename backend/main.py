"""
Ten31 Tasks — Backend API
FastAPI + SQLite + Web Push. Every mutation writes immediately. No save button.
"""
import json
import os
import sqlite3
import traceback
from contextlib import contextmanager
from datetime import date, datetime
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
    priv_path = Path(VAPID_KEY_PATH) / "private_key.pem"
    pub_path = Path(VAPID_KEY_PATH) / "public_key.txt"
    
    if priv_path.exists() and pub_path.exists():
        vapid_private_key = priv_path.read_text().strip()
        vapid_public_key = pub_path.read_text().strip()
        print(f"VAPID keys loaded from {VAPID_KEY_PATH}")
        return
    
    # Generate new keys
    from py_vapid import Vapid
    v = Vapid()
    v.generate_keys()
    
    Path(VAPID_KEY_PATH).mkdir(parents=True, exist_ok=True)
    
    # Save private key PEM
    priv_pem = v.private_pem()
    if isinstance(priv_pem, bytes):
        priv_pem = priv_pem.decode('utf-8')
    priv_path.write_text(priv_pem)
    
    # Save public key as base64url (applicationServerKey for the browser)
    import base64
    raw = v.public_key.public_bytes(
        encoding=__import__('cryptography').hazmat.primitives.serialization.Encoding.X962,
        format=__import__('cryptography').hazmat.primitives.serialization.PublicFormat.UncompressedPoint,
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


# ─── Models ──────────────────────────────────────────────────────────────────
class TeamMember(BaseModel):
    name: str
    slug: str


class DayItem(BaseModel):
    text: str = ""
    done: bool = False


class DayData(BaseModel):
    items: list[DayItem] = []
    locked: bool = False
    lockedAt: Optional[str] = None
    reflection: str = ""


class DayUpdate(BaseModel):
    """Partial update — only send the fields that changed."""
    items: Optional[list[DayItem]] = None
    locked: Optional[bool] = None
    lockedAt: Optional[str] = None
    reflection: Optional[str] = None


class PushSubscription(BaseModel):
    slug: str
    subscription: dict


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
        db.commit()
    return {"deleted": slug}


# ─── Day endpoints ───────────────────────────────────────────────────────────
@app.get("/api/days/{slug}")
def get_user_days(slug: str):
    """Return all days for a user as {date: DayData}."""
    with get_db() as db:
        rows = db.execute("SELECT date, data FROM days WHERE slug = ?", (slug,)).fetchall()
        result = {}
        for r in rows:
            result[r["date"]] = json.loads(r["data"])
        return result


@app.get("/api/days/{slug}/{day_date}")
def get_day(slug: str, day_date: str):
    """Return a single day."""
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
    """
    Merge update into existing day data. Called on every keystroke / check / lock.
    Uses INSERT OR REPLACE for atomic upsert.
    """
    with get_db() as db:
        # Get existing
        row = db.execute("SELECT data FROM days WHERE slug = ? AND date = ?", (slug, day_date)).fetchone()
        if row:
            existing = json.loads(row["data"])
        else:
            existing = {
                "items": [{"text": "", "done": False} for _ in range(6)],
                "locked": False, "lockedAt": None, "reflection": ""
            }

        # Merge
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
    """Return the VAPID public key for the browser to subscribe."""
    return {"publicKey": vapid_public_key}


@app.post("/api/push/subscribe")
def subscribe_push(sub: PushSubscription):
    """Register a push subscription for a team member."""
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
    """Remove all push subscriptions for a member."""
    with get_db() as db:
        db.execute("DELETE FROM push_subscriptions WHERE slug = ?", (slug,))
        db.commit()
    return {"status": "unsubscribed", "slug": slug}


# ─── Reminder endpoints ─────────────────────────────────────────────────────
@app.get("/api/reminders/pending")
def reminders_pending():
    """
    Returns team members who need a nudge today.
    
    For each member, checks:
    - not_committed: has not locked in their list for today
    - incomplete: committed but has unfinished tasks
    
    External services (cron jobs, bots) can poll this endpoint
    and send notifications accordingly.
    """
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
                    "slug": slug,
                    "name": m["name"],
                    "reason": "not_committed",
                    "message": f"{m['name']} hasn't committed their list for today.",
                })
                continue
            
            day_data = json.loads(row["data"])
            if not day_data.get("locked"):
                pending.append({
                    "slug": slug,
                    "name": m["name"],
                    "reason": "not_committed",
                    "message": f"{m['name']} hasn't committed their list for today.",
                })
                continue
            
            items = day_data.get("items", [])
            total = len([i for i in items if i.get("text")])
            done = len([i for i in items if i.get("text") and i.get("done")])
            if total > 0 and done < total:
                pending.append({
                    "slug": slug,
                    "name": m["name"],
                    "reason": "incomplete",
                    "done": done,
                    "total": total,
                    "message": f"{m['name']} has {done}/{total} tasks done.",
                    "remaining": [
                        i.get("text") for i in items
                        if i.get("text") and not i.get("done")
                    ],
                })
        
        return {
            "date": today_str,
            "pending": pending,
            "all_clear": len(pending) == 0,
        }


@app.post("/api/reminders/send")
def send_reminders():
    """
    Check who's behind and send push notifications to their devices.
    Called by external cron or manually.
    """
    from pywebpush import webpush, WebPushException
    
    today_str = date.today().isoformat()
    pending_data = reminders_pending()
    
    if pending_data["all_clear"]:
        return {"sent": 0, "message": "All clear — everyone is on track!"}
    
    sent_count = 0
    errors = []
    
    with get_db() as db:
        for member in pending_data["pending"]:
            slug = member["slug"]
            
            # Get push subscriptions for this member
            subs = db.execute(
                "SELECT id, subscription FROM push_subscriptions WHERE slug = ?",
                (slug,)
            ).fetchall()
            
            if not subs:
                continue
            
            # Build notification payload
            if member["reason"] == "not_committed":
                payload = json.dumps({
                    "title": "📋 Commit your six",
                    "body": "You haven't locked in your tasks for today. What's most important?",
                    "url": f"/list/{slug}",
                    "tag": f"ten31-tasks-{today_str}",
                })
            else:
                remaining = member.get("remaining", [])
                done = member.get("done", 0)
                total = member.get("total", 0)
                top_remaining = remaining[0] if remaining else "your tasks"
                payload = json.dumps({
                    "title": f"⏳ {done}/{total} done — keep going",
                    "body": f"Next up: {top_remaining}",
                    "url": f"/list/{slug}",
                    "tag": f"ten31-tasks-{today_str}",
                })
            
            stale_sub_ids = []
            for sub_row in subs:
                sub_data = json.loads(sub_row["subscription"])
                try:
                    webpush(
                        subscription_info=sub_data,
                        data=payload,
                        vapid_private_key=vapid_private_key,
                        vapid_claims={"sub": VAPID_CLAIMS_EMAIL},
                    )
                    sent_count += 1
                except WebPushException as e:
                    if "410" in str(e) or "404" in str(e):
                        # Subscription expired or invalid — clean up
                        stale_sub_ids.append(sub_row["id"])
                    else:
                        errors.append(f"{slug}: {str(e)[:100]}")
                except Exception as e:
                    errors.append(f"{slug}: {str(e)[:100]}")
            
            # Remove stale subscriptions
            for sid in stale_sub_ids:
                db.execute("DELETE FROM push_subscriptions WHERE id = ?", (sid,))
            if stale_sub_ids:
                db.commit()
    
    result = {
        "sent": sent_count,
        "pending_members": len(pending_data["pending"]),
    }
    if errors:
        result["errors"] = errors
    
    return result


# ─── Bulk endpoint for team board ────────────────────────────────────────────
@app.get("/api/team/today")
def team_today():
    """Return today's data + recent stats for all team members."""
    today_str = date.today().isoformat()
    with get_db() as db:
        members = db.execute("SELECT slug, name FROM team ORDER BY created_at").fetchall()
        result = []
        for m in members:
            slug = m["slug"]
            # Get all days for streak + 7d calc
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
