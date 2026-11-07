"""Render immutable Alembic revision ranges without opening a database connection."""

import importlib.util
import io
import json
import os
import sys
from pathlib import Path

os.environ["DEBUG"] = "false"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from alembic import command
from alembic.config import Config
from sqlalchemy import create_mock_engine
from sqlalchemy.dialects import postgresql
from alembic.migration import MigrationContext
from alembic.operations import Operations
from app.models import Base
from app.services.share_search import query_materials


def render(direction, revisions):
    output = io.StringIO()
    config = Config("alembic.ini", output_buffer=output)
    # alembic/env.py configures logging to stderr, keeping stdout machine-readable.
    getattr(command, direction)(config, revisions, sql=True)
    return output.getvalue()


def statements(filename, direction):
    """Capture online operation boundaries; batch SQL rendering hides driver errors."""
    captured = []
    def execute(statement, *args, **kwargs):
        captured.append(str(statement.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True})))
    connection = create_mock_engine("postgresql://", execute).connect()
    context = MigrationContext.configure(connection)
    path = Path("alembic/versions") / filename
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(context):
        getattr(module, direction)()
    return captured


if __name__ == "__main__":
    definitions = {
        "userContent": render("upgrade", "b85d0e316fa2:c96e1f427ab3"),
        "downUsercontent": render("downgrade", "c96e1f427ab3:b85d0e316fa2"),
        "shareSearch": render("upgrade", "a74c9d205ef1:b85d0e316fa2"),
        "downSharesearch": render("downgrade", "b85d0e316fa2:a74c9d205ef1"),
        "base": render("upgrade", "129e9b18f7ce"),
        "core": render("upgrade", "129e9b18f7ce:8c6f2a1d4e90"),
        "wellness": render("upgrade", "8c6f2a1d4e90:b72d5e4a9031"),
        "social": render("upgrade", "b72d5e4a9031:c9e31b6f2048"),
        "downSocial": render("downgrade", "c9e31b6f2048:b72d5e4a9031"),
        "downWellness": render("downgrade", "b72d5e4a9031:8c6f2a1d4e90"),
        "downCore": render("downgrade", "8c6f2a1d4e90:129e9b18f7ce"),
        "roles": render("upgrade", "e52f7d903ab1:f63a8e014bc2"),
        "content": render("upgrade", "f63a8e014bc2:a74c9d205ef1"),
        "downContent": render("downgrade", "a74c9d205ef1:f63a8e014bc2"),
        "downRoles": render("downgrade", "f63a8e014bc2:e52f7d903ab1"),
        "reporting": render("upgrade", "d4a82e901c73:e52f7d903ab1"),
        "downReporting": render("downgrade", "e52f7d903ab1:d4a82e901c73"),
        "sessions": render("upgrade", "c9e31b6f2048:d4a82e901c73"),
        "downSessions": render("downgrade", "d4a82e901c73:c9e31b6f2048"),
        "tables": {
            table.name: {
                "columns": {
                    column.name: {
                        "type": str(column.type.compile(dialect=postgresql.dialect())).lower(),
                        "nullable": column.nullable,
                    } for column in table.columns
                },
                "indexes": {index.name: {"columns": [column.name for column in index.columns], "unique": index.unique} for index in table.indexes},
                "checks": sorted(constraint.name for constraint in table.constraints if constraint.__class__.__name__ == "CheckConstraint"),
                "unique": sorted(sorted(column.name for column in constraint.columns) for constraint in table.constraints if constraint.__class__.__name__ == "UniqueConstraint"),
                "foreign_keys": sorted([{
                    "columns": [element.parent.name for element in constraint.elements],
                    "target": f"{constraint.elements[0].column.table.schema or 'public'}.{constraint.elements[0].column.table.name}",
                    "target_columns": [element.column.name for element in constraint.elements],
                    "ondelete": constraint.ondelete or "NO ACTION",
                } for constraint in table.foreign_key_constraints], key=lambda item: str(item)),
            } for table in Base.metadata.sorted_tables
        },
    }
    revisions = {
        "userContent": "c96e1f427ab3_owned_resources_index.py",
        "shareSearch": "b85d0e316fa2_share_search_indexes.py",
        "content": "a74c9d205ef1_content_and_verification.py",
        "core": "8c6f2a1d4e90_preferences_and_integrity.py",
        "wellness": "b72d5e4a9031_wellness_persistence.py",
        "social": "c9e31b6f2048_social_inbox_activity.py",
        "sessions": "d4a82e901c73_revocable_api_sessions.py",
        "roles": "f63a8e014bc2_merge_moderator_into_admin.py",
        "reporting": "e52f7d903ab1_report_submission_receipts.py",
    }
    definitions["statements"] = {}
    definitions['shareQueries'] = {
        'filtered': str(query_materials(subject='CS101', search='databas CS1', resource_type='document', file_format='pdf', postgres=True).limit(6).compile(dialect=postgresql.dialect(), compile_kwargs={'literal_binds': True})),
        'prefix': str(query_materials(search='databas', postgres=True).order_by(None).compile(dialect=postgresql.dialect(), compile_kwargs={'literal_binds': True})),
    }
    for name, filename in revisions.items():
        definitions["statements"][name] = statements(filename, "upgrade")
        definitions["statements"][f"down{name.capitalize()}"] = statements(filename, "downgrade")
    print(json.dumps(definitions))
