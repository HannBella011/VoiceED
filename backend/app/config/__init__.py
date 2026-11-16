# VoiceED Backend - App Config Package
# Configuration modules

"""
Configuration package for VoiceED backend.

This package contains:
- Main settings (app/settings.py)
- Database configuration (database/)
- Firebase configuration
- Email configuration
- Storage configuration
"""

from app.settings import settings

__all__ = ["settings"]
