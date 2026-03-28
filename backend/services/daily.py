"""
Replaced Daily.co with Jitsi Meet — free, no account, no billing required.
Room URLs are just https://meet.jit.si/<unique-room-name>
"""


def create_room_url(meeting_id: str) -> str:
    """Generate a Jitsi Meet room URL from the meeting ID."""
    room_name = f"einstein-{meeting_id[:12]}"
    return f"https://meet.jit.si/{room_name}"
