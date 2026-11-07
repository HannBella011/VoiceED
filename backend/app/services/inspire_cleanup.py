"""One bounded batch of expired upload cleanup; schedule regularly in deployment."""

import asyncio
from app.database import async_session_maker, engine
from app.services.inspire_storage import cleanup_expired


async def main():
    try:
        async with async_session_maker() as db:
            print(f"Removed {await cleanup_expired(db)} expired InspireED uploads")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
