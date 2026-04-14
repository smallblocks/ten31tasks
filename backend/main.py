"""
Ten31 Tasks — Backend API
FastAPI + SQLite. Every mutation writes immediately. No save button.
"""
import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─── Config ──────────────────────────────────────────────────────────────────
DB_PATH = os.environ.get("DB_PATH", "/data/ten31-tasks.db")

app = FastAPI(title="Ten31 Tasks", docs_url=None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


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


# ─── Reminder endpoints ──────────────────────────────────────────────────────
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
