"""Read-only schema and optional test-account readiness; no credentials printed."""

import asyncio
import json
import os
import sys
from pathlib import Path

os.environ["DEBUG"] = "false"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text, select, func
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool
from app.settings import settings
from app.models import Base, Profile

EXPECTED_REVISION = "eb8031649cd5"


async def main():
    engine = create_async_engine(
        settings.DATABASE_URL,
        poolclass=NullPool,
        hide_parameters=True,
        connect_args={"timeout": 10, "command_timeout": 10},
    )
    try:
        async with asyncio.timeout(25):
            async with engine.connect() as conn:
                await conn.execute(text("SET TRANSACTION READ ONLY"))
                versions = (
                    (
                        await conn.execute(
                            text("SELECT version_num FROM alembic_version")
                        )
                    )
                    .scalars()
                    .all()
                )
                actual = (
                    await conn.execute(
                        text(
                            "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'"
                        )
                    )
                ).all()
                columns = {}
                for table, column in actual:
                    columns.setdefault(table, set()).add(column)
                missing = {
                    table.name: sorted(
                        set(table.columns.keys()) - columns.get(table.name, set())
                    )
                    for table in Base.metadata.tables.values()
                    if set(table.columns.keys()) - columns.get(table.name, set())
                }
                result = {
                    "read_only": True,
                    "expected_revision": EXPECTED_REVISION,
                    "live_revisions": versions,
                    "missing_columns": missing,
                }
                result["ready"] = versions == [EXPECTED_REVISION] and not missing
                accounts = {}
                for label in ("STUDENT", "ADMIN", "SUPER"):
                    email = os.getenv(f"VOICEED_TEST_{label}_EMAIL")
                    if email:
                        row = (
                            await conn.execute(
                                select(Profile.role, Profile.is_active).where(
                                    func.lower(Profile.email) == email.strip().lower()
                                )
                            )
                        ).first()
                        accounts[label.lower()] = {
                            "profile_found": row is not None,
                            "role": row.role.value if row else None,
                            "active": row.is_active if row else None,
                            "auth_identity_found": bool(
                                await conn.scalar(
                                    text(
                                        "SELECT EXISTS(SELECT 1 FROM auth.users WHERE lower(email)=:email)"
                                    ),
                                    {"email": email.strip().lower()},
                                )
                            ),
                        }
                if accounts:
                    result["test_accounts"] = accounts
                if os.getenv("VOICEED_CHECK_STORAGE") == "1":
                    from app.services import supabase_service

                    try:
                        bucket = await asyncio.to_thread(
                            supabase_service.client.storage.get_bucket,
                            settings.INSPIRE_STORAGE_BUCKET,
                        )
                        result["inspire_storage"] = {
                            "found": True,
                            "private": bucket.public is False,
                        }
                    except Exception as exc:
                        result["inspire_storage"] = {
                            "found": False,
                            "error_type": type(exc).__name__,
                            "status": getattr(exc, "status", None),
                        }
                print(json.dumps(result, indent=2))
                return 0 if result["ready"] else 2
    except Exception as exc:
        # Raw exceptions may contain credentials, hostnames or SQL parameters.
        print(
            json.dumps(
                {"read_only": True, "ready": False, "error_type": type(exc).__name__}
            )
        )
        return 1
    finally:
        await engine.dispose()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
