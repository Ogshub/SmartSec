"""
SmartSec - Supabase Database Client
=====================================
This file creates and exports a single Supabase client instance.

Instead of SQLAlchemy + raw SQL, we use the Supabase Python SDK.
The SDK gives us a clean, chainable API to:
  - Insert rows: supabase.table("users").insert({...}).execute()
  - Query rows: supabase.table("users").select("*").eq("email", email).execute()
  - Update rows: supabase.table("users").update({...}).eq("id", id).execute()
  - Delete rows: supabase.table("users").delete().eq("id", id).execute()

Think of it like a smart remote control for your cloud database.
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# --- Read Supabase credentials from .env ---
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

# --- Validate that credentials are present ---
if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError(
        "❌ Supabase credentials missing! "
        "Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file.\n"
        "Get them from: Supabase Dashboard → Settings → API"
    )

# --- Create the Supabase client ---
# We use the SERVICE_KEY (not the anon key) for backend operations.
# The service key bypasses Row Level Security — safe for server-side code only.
# ⚠️ Never expose the service key in frontend code!
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_supabase() -> Client:
    """
    FastAPI dependency that provides the Supabase client.
    
    Usage in a route:
        from database import get_supabase
        from supabase import Client
        from fastapi import Depends

        @router.get("/example")
        def example(db: Client = Depends(get_supabase)):
            result = db.table("users").select("*").execute()
            return result.data
    """
    return supabase
