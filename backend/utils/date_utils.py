"""Date and timezone utilities"""
from datetime import datetime
from zoneinfo import ZoneInfo

# IST Timezone
IST = ZoneInfo("Asia/Kolkata")

def get_ist_now():
    """Get current datetime in IST timezone"""
    return datetime.now(IST)

def get_ist_now_iso():
    """Get current datetime in IST as ISO string"""
    return datetime.now(IST).isoformat()
