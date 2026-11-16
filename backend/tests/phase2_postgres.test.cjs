// Executes Alembic's PostgreSQL SQL in an isolated, in-memory PGlite database.
// No DATABASE_URL is opened and no Supabase account or production data is used.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');
const toolRoot = process.env.VOICEED_PGLITE_ROOT || path.join(os.tmpdir(), 'voiceed-phase2-pglite');
const { PGlite } = createRequire(path.join(toolRoot, 'package.json'))('@electric-sql/pglite');
const backend = path.resolve(__dirname, '..');
const python = process.env.VOICEED_TEST_PYTHON || path.join(backend, '.venv', 'Scripts', 'python.exe');
const sql = JSON.parse(execFileSync(python, ['-B', 'tests/migration_sql.py'], {
  cwd: backend, env: { ...process.env, DEBUG: 'false' }, encoding: 'utf8', maxBuffer: 2 ** 22,
  stdio: ['ignore', 'pipe', 'pipe'],
}));
const alice = '10000000-0000-4000-8000-000000000001';
const bob = '10000000-0000-4000-8000-000000000002';
const admin = '10000000-0000-4000-8000-000000000003';
const body = script => script.replace(/^\s*(?:BEGIN|COMMIT);\s*$/gm, '');

test('Phase 2 PostgreSQL migrations, integrity, RLS and guarded rollback', async t => {
  const db = new PGlite();
  const rows = async query => (await db.query(query)).rows;
  const runRevision = async name => {
    // Extended query protocol accepts one statement, as asyncpg.prepare requires.
    await db.exec('BEGIN');
    try {
      for (const statement of sql.statements[name]) await db.query(statement);
      const revisions = { optimization: 'eb8031649cd5', downOptimization: 'da7f20538bc4', accounts: 'da7f20538bc4', downAccounts: 'c96e1f427ab3', userContent: 'c96e1f427ab3', downUsercontent: 'b85d0e316fa2', shareSearch: 'b85d0e316fa2', downSharesearch: 'a74c9d205ef1', content: 'a74c9d205ef1', downContent: 'f63a8e014bc2', roles: 'f63a8e014bc2', downRoles: 'e52f7d903ab1', core: '8c6f2a1d4e90', wellness: 'b72d5e4a9031', social: 'c9e31b6f2048', sessions: 'd4a82e901c73', reporting: 'e52f7d903ab1', downReporting: 'd4a82e901c73', downSessions: 'c9e31b6f2048', downSocial: 'b72d5e4a9031', downWellness: '8c6f2a1d4e90', downCore: '129e9b18f7ce' };
      await db.query('UPDATE alembic_version SET version_num=$1', [revisions[name]]);
      await db.exec('COMMIT');
    } catch (error) { await db.exec('ROLLBACK'); throw error; }
  };
  const scalar = async query => Object.values((await rows(query))[0])[0];
  const transaction = async fn => {
    await db.exec('BEGIN');
    try { await fn(); } finally { await db.exec('ROLLBACK'); }
  };
  const rejectSQL = async (query, pattern) => {
    await db.exec('SAVEPOINT invalid_case');
    try { await assert.rejects(db.exec(query), pattern); }
    finally { await db.exec('ROLLBACK TO SAVEPOINT invalid_case; RELEASE SAVEPOINT invalid_case'); }
  };
  const asUser = async (id, fn) => transaction(async () => {
    await db.exec('SET LOCAL ROLE authenticated');
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [id]);
    await fn();
  });
  try {
    await db.exec(`
      CREATE SCHEMA auth;
      CREATE TABLE auth.users (id uuid PRIMARY KEY);
      CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE anon NOLOGIN;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
    `);
    await t.test('prepared execution rejects multiple commands like asyncpg', async () => {
      await assert.rejects(db.query('SELECT 1; SELECT 2'), /multiple commands.*prepared statement/i);
    });
    await db.exec(sql.base);
    await db.exec(`
      INSERT INTO auth.users VALUES ('${alice}'), ('${bob}'), ('${admin}');
      INSERT INTO profiles(id,username,email,role,is_active) VALUES
        ('${alice}','alice','alice@example.test','STUDENT',true),
        ('${bob}','bob','bob@example.test','STUDENT',true),
        ('${admin}','admin','admin@example.test','SUPER_ADMIN',true);
      INSERT INTO journal_entries(title,content,mood,user_id,created_at)
        VALUES ('Original title','Original private content','calm','${alice}','2020-01-02 23:30:00+00');
      INSERT INTO inspire_stories(title,content,user_id,is_anonymous) VALUES ('Original story','Original story content','${alice}',true);
      INSERT INTO inspire_quotes(quote,author) VALUES ('Existing quote','Existing attribution');
      INSERT INTO reports(tracking_code,title,description,category,status,is_anonymous) VALUES
        ('VED-BASE-0001','Report one','First report','OTHER','SUBMITTED',true),
        ('VED-BASE-0002','Report two','Second report','OTHER','SUBMITTED',true);
      INSERT INTO report_timeline(report_id,status,remarks) VALUES (1,'SUBMITTED','Original remarks');
      INSERT INTO report_attachments(report_id,filename,stored_filename,file_path,file_size,mime_type,extension)
        VALUES (1,'one.pdf','one.pdf','reports/one.pdf',10,'application/pdf','.pdf'),
               (2,'two.pdf','two.pdf','reports/two.pdf',10,'application/pdf','.pdf');
    `);
    // Match the audited deployment: existing tables have RLS, but no policies.
    for (const { tablename } of await rows("SELECT tablename FROM pg_tables WHERE schemaname='public'")) {
      await db.exec(`ALTER TABLE public.${tablename} ENABLE ROW LEVEL SECURITY`);
    }

    await t.test('preflight refuses duplicate tracking codes without changing existing data', () => transaction(async () => {
      await db.exec("INSERT INTO reports(tracking_code,title,description,category,status,is_anonymous) VALUES ('VED-BASE-0001','Duplicate','Test','OTHER','SUBMITTED',true)");
      await rejectSQL(body(sql.core), /Duplicate report tracking codes/);
      assert.equal(await scalar("SELECT count(*) FROM reports"), 3);
      assert.equal(await scalar("SELECT count(*) FROM information_schema.columns WHERE table_name='profiles' AND column_name='theme'"), 0);
    }));
    await t.test('preflight refuses orphan Auth identities rather than deleting profiles', () => transaction(async () => {
      await db.exec("INSERT INTO profiles(id,username,email,role,is_active) VALUES ('10000000-0000-4000-8000-000000000099','orphan','orphan@example.test','STUDENT',true)");
      await rejectSQL(body(sql.core), /Orphan profiles/);
      assert.equal(await scalar('SELECT count(*) FROM profiles'), 4);
    }));
    await t.test('preflight refuses historical cross-report attachment links', () => transaction(async () => {
      await db.exec('INSERT INTO report_timeline_attachments(timeline_id,attachment_id) VALUES (1,2)');
      await rejectSQL(body(sql.core), /Cross-report timeline attachments/);
    }));
    await t.test('all prepared revisions upgrade the previous head', async () => {
      for (const name of ['core', 'wellness', 'social', 'sessions', 'reporting', 'roles', 'content', 'shareSearch', 'userContent', 'accounts', 'optimization']) await runRevision(name);
      assert.equal(await scalar('SELECT version_num FROM alembic_version'), 'eb8031649cd5');
    });
    await t.test('ShareED prefix search executes the real SQLAlchemy query and excludes removed rows', () => transaction(async () => {
      await db.exec(`INSERT INTO shared_materials(title,subject,description,file_url,file_type,user_id,is_anonymous,download_count) VALUES
        ('Database Foundations','CS101','Relational joins','https://example.test/one.pdf','application/pdf','${alice}',false,0),
        ('Database Diagram','CS101','Diagram','https://example.test/two.png','image/png','${alice}',false,0),
        ('Calculus','MATH','Review','https://example.test/three.pdf','application/pdf','${alice}',false,0)`);
      const found=await rows(sql.shareQueries.filtered);
      assert.deepEqual(found.map(row=>row.title),['Database Foundations']);
      await db.exec("UPDATE shared_materials SET removed_at=now() WHERE title='Database Foundations'");
      assert.deepEqual(await rows(sql.shareQueries.filtered),[]);
    }));
    await t.test('ShareED GIN expression and visibility predicate support indexed search', () => transaction(async () => {
      const [index]=await rows("SELECT indexdef FROM pg_indexes WHERE indexname='ix_shared_materials_search'");
      assert.match(index.indexdef,/USING gin/);assert.match(index.indexdef,/removed_at IS NULL/);
      await db.exec(`INSERT INTO shared_materials(title,subject,description,file_url,file_type,user_id,is_anonymous,download_count)
        SELECT 'Unrelated topic '||n,'OTHER','Other study material','https://example.test/file.pdf','application/pdf','${alice}',false,0 FROM generate_series(1,2000) n`);
      await db.exec('ANALYZE shared_materials');
      await db.exec('SET LOCAL enable_seqscan=off');
      const plan=await rows('EXPLAIN '+sql.shareQueries.prefix);
      assert.match(JSON.stringify(plan),/ix_shared_materials_search/);
    }));
    await t.test('existing content and timestamps are preserved', async () => {
      const [entry] = await rows('SELECT title,content,mood,created_at::text,entry_date::text FROM journal_entries');
      assert.deepEqual(entry, { title: 'Original title', content: 'Original private content', mood: 'calm', created_at: '2020-01-02 23:30:00+00', entry_date: '2020-01-02' });
      assert.equal(await scalar('SELECT post_type FROM inspire_stories'), 'story');
      assert.equal(await scalar('SELECT user_id FROM inspire_quotes'), null);
      assert.equal(await scalar('SELECT count(*) FROM reports'), 2);
    });
    await t.test('ORM columns, indexes, checks, unique constraints and FKs match PostgreSQL', async () => {
      for (const [table, definition] of Object.entries(sql.tables)) {
        const columns = await rows(`SELECT a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,NOT a.attnotnull AS nullable FROM pg_attribute a WHERE a.attrelid='public.${table}'::regclass AND a.attnum>0 AND NOT a.attisdropped`);
        const actual = Object.fromEntries(columns.map(({ name, type, nullable }) => [name, { type: type.replace('character varying', 'varchar'), nullable }]));
        assert.deepEqual(actual, definition.columns, `${table} columns`);
        const indexes = await rows(`SELECT c.relname AS name,i.indisunique AS unique,array_agg(a.attname ORDER BY k.ordinality) AS columns FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum,ordinality) JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum WHERE i.indrelid='public.${table}'::regclass GROUP BY c.relname,i.indisunique`);
        for (const [name, expected] of Object.entries(definition.indexes)) {
          if (!expected.columns.length) continue; // Expression indexes are checked separately.
          const found = indexes.find(index => index.name === name);
          assert.ok(found, name);
          assert.deepEqual({ columns: found.columns, unique: found.unique }, expected, name);
        }
        const checks = (await rows(`SELECT conname FROM pg_constraint WHERE conrelid='public.${table}'::regclass AND contype='c'`)).map(row => row.conname).sort();
        assert.deepEqual(checks, definition.checks, `${table} checks`);
        const unique = await rows(`SELECT array(SELECT a.attname FROM unnest(c.conkey) WITH ORDINALITY k(attnum,n) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum ORDER BY k.n) AS columns FROM pg_constraint c WHERE c.conrelid='public.${table}'::regclass AND c.contype='u'`);
        assert.deepEqual(unique.map(row => row.columns.sort().join(',')).sort(), definition.unique.map(columns => columns.sort().join(',')).sort(), `${table} unique constraints`);
        const foreignKeys = await rows(`SELECT
          array(SELECT a.attname FROM unnest(c.conkey) WITH ORDINALITY k(attnum,n) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum ORDER BY k.n) AS columns,
          n.nspname||'.'||r.relname AS target,
          array(SELECT a.attname FROM unnest(c.confkey) WITH ORDINALITY k(attnum,n) JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.attnum ORDER BY k.n) AS target_columns,
          CASE c.confdeltype WHEN 'c' THEN 'CASCADE' WHEN 'r' THEN 'RESTRICT' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' ELSE 'NO ACTION' END AS ondelete
          FROM pg_constraint c JOIN pg_class r ON r.oid=c.confrelid JOIN pg_namespace n ON n.oid=r.relnamespace
          WHERE c.conrelid='public.${table}'::regclass AND c.contype='f'`);
        const normalize = values => values.map(value => JSON.stringify(value)).sort();
        assert.deepEqual(normalize(foreignKeys), normalize(definition.foreign_keys), `${table} foreign keys`);
      }
    });
    await t.test('listing indexes support ordered bounded reads without a sort', () => transaction(async () => {
      // Force eligibility on tiny fixtures; this is not a production cost estimate.
      await db.exec('SET LOCAL enable_seqscan=off; SET LOCAL enable_bitmapscan=off');
      for (const [query, index] of [
        ['SELECT id FROM profiles ORDER BY created_at DESC,id DESC LIMIT 20','ix_profiles_created_id'],
        ['SELECT id FROM profiles ORDER BY lower(username),id LIMIT 20','ix_profiles_username_id'],
        ['SELECT id FROM reports ORDER BY created_at DESC,id DESC LIMIT 20','ix_reports_created_id'],
        ["SELECT id FROM reports WHERE status='SUBMITTED' ORDER BY created_at DESC,id DESC LIMIT 20",'ix_reports_status_created_id'],
        ['SELECT id FROM inspire_stories WHERE removed_at IS NULL ORDER BY created_at DESC,id DESC LIMIT 20','ix_inspire_stories_visible_created'],
        ['SELECT id FROM inspire_quotes WHERE removed_at IS NULL ORDER BY created_at DESC,id DESC LIMIT 20','ix_inspire_quotes_visible_created'],
      ]) {
        const plan = JSON.stringify(await rows('EXPLAIN (FORMAT JSON) '+query));
        assert.ok(plan.includes(index), plan);
        assert.ok(!plan.includes('"Node Type":"Sort"'), plan);
      }
    }));
    await t.test('preferences, Auth FK and tracking uniqueness are enforced', () => transaction(async () => {
      await rejectSQL("UPDATE profiles SET theme='invalid' WHERE username='alice'", /ck_profiles_theme/);
      await rejectSQL("INSERT INTO profiles(id,username,email,role,is_active) VALUES ('10000000-0000-4000-8000-000000000099','orphan','orphan@example.test','STUDENT',true)", /fk_profiles_auth_user/);
      await rejectSQL("UPDATE reports SET tracking_code='VED-BASE-0001' WHERE id=2", /ix_reports_tracking_code/);
    }));
    await t.test('250-word remarks limit and same-report links are enforced', () => transaction(async () => {
      const remarks = Array(251).fill('word').join(' ');
      await rejectSQL(`UPDATE report_timeline SET remarks='${remarks}' WHERE id=1`, /ck_report_timeline_remarks_words/);
      await db.exec(`UPDATE report_timeline SET remarks='${Array(250).fill('word').join(' ')}' WHERE id=1`);
      await rejectSQL('INSERT INTO report_timeline_attachments(timeline_id,attachment_id) VALUES (1,2)', /same report/);
      await db.exec('INSERT INTO report_timeline_attachments(timeline_id,attachment_id) VALUES (1,1)');
      await rejectSQL('UPDATE report_attachments SET report_id=2 WHERE id=1', /Cannot move/);
      await rejectSQL('UPDATE report_timeline SET report_id=2 WHERE id=1', /Cannot move/);
    }));

    // Only test fixtures grant table privileges. Migration policies still scope
    // an authenticated role to the JWT subject; no administrator exception.
    await db.exec('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated');
    await db.exec(`INSERT INTO mood_records(user_id,mood) VALUES ('${alice}','calm'); INSERT INTO wellness_goals(user_id,text,preset_key) VALUES ('${alice}','Drink water','water')`);
    const goalId = await scalar('SELECT id FROM wellness_goals LIMIT 1');
    await t.test('private wellness records are visible only to their owner', async () => {
      await asUser(alice, async () => {
        assert.equal(await scalar('SELECT count(*) FROM mood_records'), 1);
        assert.equal(await scalar('SELECT count(*) FROM journal_entries'), 1);
        await rejectSQL(`INSERT INTO mood_records(user_id,mood) VALUES ('${bob}','happy')`, /row-level security/);
        await rejectSQL(`UPDATE mood_records SET user_id='${bob}'`, /row-level security/);
      });
      for (const user of [bob, admin]) await asUser(user, async () => {
        assert.equal(await scalar('SELECT count(*) FROM mood_records'), 0);
        assert.equal(await scalar('SELECT count(*) FROM journal_entries'), 0);
        assert.equal((await rows('DELETE FROM journal_entries RETURNING id')).length, 0);
      });
    });
    await t.test('goal ownership, daily uniqueness and completion metadata are enforced', () => transaction(async () => {
      await rejectSQL(`INSERT INTO wellness_goal_progress(goal_id,user_id,day) VALUES (${goalId},'${bob}','2026-11-06')`, /fk_wellness_progress_goal_owner/);
      await rejectSQL(`INSERT INTO wellness_goal_progress(goal_id,user_id,day,completed) VALUES (${goalId},'${alice}','2026-11-06',true)`, /ck_wellness_progress_completed/);
      await db.exec(`INSERT INTO wellness_goal_progress(goal_id,user_id,day,completed,completed_at) VALUES (${goalId},'${alice}','2026-11-06',true,now())`);
      await rejectSQL(`INSERT INTO wellness_goal_progress(goal_id,user_id,day) VALUES (${goalId},'${alice}','2026-11-06')`, /uq_wellness_goal_progress_day/);
      await db.exec(`UPDATE wellness_goals SET archived_at=now() WHERE id=${goalId}`);
      assert.equal(await scalar('SELECT count(*) FROM wellness_goal_progress'), 1);
    }));
    await t.test('social targets and one reaction per user are enforced', () => transaction(async () => {
      await rejectSQL(`INSERT INTO inspire_reactions(user_id) VALUES ('${alice}')`, /ck_inspire_reactions_target/);
      await rejectSQL(`INSERT INTO inspire_reactions(user_id,story_id,quote_id) VALUES ('${alice}',1,1)`, /ck_inspire_reactions_target/);
      await db.exec(`INSERT INTO inspire_reactions(user_id,story_id) VALUES ('${alice}',1)`);
      await rejectSQL(`INSERT INTO inspire_reactions(user_id,story_id) VALUES ('${alice}',1)`, /uq_inspire_reactions_story_user/);
      await db.exec(`INSERT INTO inspire_reactions(user_id,quote_id) VALUES ('${alice}',1)`);
      await rejectSQL(`INSERT INTO inspire_comments(user_id,story_id,content) VALUES ('${alice}',1,'   ')`, /ck_inspire_comments_content/);
    }));
    await t.test('direct social table access does not reveal another anonymous author', async () => {
      await asUser(bob, async () => assert.equal(await scalar('SELECT count(*) FROM inspire_stories'), 0));
      await asUser(alice, async () => assert.equal(await scalar('SELECT count(*) FROM inspire_stories'), 1));
    });
    await db.exec(`INSERT INTO contact_messages(sender_id,recipient_id,name,email,subject,message) VALUES ('${alice}','${bob}','Alice','alice@example.test','Question','Private message'); INSERT INTO user_activity(user_id,action) VALUES ('${alice}','login')`);
    await t.test('contact inbox access is restricted to sender and recipient', async () => {
      await asUser(alice, async () => {
        assert.equal(await scalar('SELECT count(*) FROM contact_messages'), 1);
        assert.equal((await rows('DELETE FROM contact_messages RETURNING id')).length, 0);
      });
      await asUser(bob, async () => assert.equal((await rows('DELETE FROM contact_messages RETURNING id')).length, 1));
      await asUser(admin, async () => assert.equal(await scalar('SELECT count(*) FROM contact_messages'), 0));
    });
    await t.test('activity is readable only by its owner and cannot be forged by a client', async () => {
      await asUser(alice, async () => {
        assert.equal(await scalar('SELECT count(*) FROM user_activity'), 1);
        await rejectSQL(`INSERT INTO user_activity(user_id,action) VALUES ('${alice}','login')`, /row-level security/);
      });
      await asUser(bob, async () => assert.equal(await scalar('SELECT count(*) FROM user_activity'), 0));
    });
    await t.test('downgrades refuse to discard newly persisted history', () => transaction(async () => {
      await rejectSQL(body(sql.downSocial), /Downgrade would discard social/);
      await rejectSQL(body(sql.downWellness), /Downgrade would discard wellness/);
      await db.exec("UPDATE profiles SET theme='pink' WHERE username='alice'");
      await rejectSQL(body(sql.downCore), /Downgrade would discard preferences/);
    }));
    await t.test('DOCX and PPTX MIME types fit after the migration', () => transaction(async () => {
      for (const type of ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']) {
        await db.query('INSERT INTO shared_materials(title,subject,file_url,file_type,user_id,is_anonymous,download_count) VALUES ($1,$2,$3,$4,$5,false,0)', ['Notes','CS101','https://example.test/file',type,alice]);
      }
      await rejectSQL(body(sql.downCore), /Downgrade would discard preferences/);
    }));
    await t.test('API session secrets are inaccessible to browser roles and active downgrade is refused', async () => {
      await transaction(async () => {
        await db.exec(`INSERT INTO api_sessions(id,user_id,refresh_hash,expires_at) VALUES ('20000000-0000-4000-8000-000000000001','${alice}',repeat('a',64),now()+interval '1 day')`);
        await rejectSQL(body(sql.downSessions), /Revoke active API sessions/);
      });
      await asUser(alice, async () => {
        assert.equal(await scalar('SELECT count(*) FROM api_sessions'), 0);
        await rejectSQL(`INSERT INTO api_sessions(id,user_id,refresh_hash,expires_at) VALUES ('20000000-0000-4000-8000-000000000001','${alice}',repeat('a',64),now()+interval '1 day')`, /row-level security/);
      });
    });

    await t.test('report receipts enforce anonymous privacy, unique retries and guarded downgrade', async () => {
      await transaction(async () => {
        await rejectSQL(`UPDATE reports SET reporter_details='{"full_name":"Private"}'::jsonb WHERE id=1`, /ck_reports_anonymous_identity/);
        await db.exec(`UPDATE reports SET is_anonymous=false,reporter_details='{"full_name":"Private"}'::jsonb,submission_key=repeat('a',64),submission_fingerprint=repeat('b',64),tracking_access_hash=repeat('c',64),notification_status='pending' WHERE id=1`);
        await rejectSQL(`UPDATE reports SET submission_key=repeat('a',64) WHERE id=2`, /uq_reports_submission_key/);
        await rejectSQL(`UPDATE reports SET notification_status='delivered' WHERE id=2`, /ck_reports_notification_status/);
        await rejectSQL(body(sql.downReporting), /Downgrade would discard report/);
      });
      await asUser(alice, async () => {
        assert.equal(await scalar('SELECT count(*) FROM tracking_rate_limits'),0);
        await rejectSQL(`INSERT INTO tracking_rate_limits(bucket,hits,expires_at) VALUES (repeat('a',64),1,now()+interval '1 minute')`, /row-level security/);
        for(const table of ['reports','report_attachments','report_timeline','report_timeline_attachments'])assert.equal(await scalar(`SELECT count(*) FROM ${table}`),0);
      });
      await transaction(async()=>{
        // Even an accidentally broad old policy cannot bypass the restrictive rule.
        await db.exec('CREATE POLICY old_public_report_read ON reports FOR SELECT TO authenticated USING (true)');
        await db.exec('SET LOCAL ROLE authenticated');
        assert.equal(await scalar('SELECT count(*) FROM reports'),0);
      });
    });

    await t.test('moderators become admins and cannot be assigned the removed role again', async () => {
      await transaction(async()=>{
        await db.exec(body(sql.downRoles));
        await db.exec(`UPDATE profiles SET role='MODERATOR' WHERE id='${alice}'`);
        await db.exec(body(sql.roles));
        assert.equal(await scalar(`SELECT role::text FROM profiles WHERE id='${alice}'`),'ADMIN');
        await rejectSQL(`UPDATE profiles SET role='MODERATOR' WHERE id='${alice}'`,/ck_profiles_supported_role/);
      });
    });
    await t.test('legacy posts backfill literal text and malformed structured roots are rejected', () => transaction(async () => {
      assert.equal(await scalar("SELECT body->'blocks'->0->'children'->0->>'text' FROM inspire_stories WHERE id=1"), await scalar('SELECT content FROM inspire_stories WHERE id=1'));
      for (const bodyValue of ['[]', '{"version":2,"blocks":[]}', '{"version":1}', '{"version":1,"blocks":null}']) {
        await rejectSQL(`UPDATE inspire_stories SET body='${bodyValue}'::jsonb WHERE id=1`, /ck_inspire_stories_body/);
      }
      await db.exec(`UPDATE inspire_stories SET body='{"version":1,"blocks":[{"type":"paragraph","children":[{"text":"Hello 😀","marks":["bold"]}]}]}'::jsonb WHERE id=1`);
      await rejectSQL(body(sql.downContent), /Downgrade would discard structured post/);
    }));
    await t.test('student verification defaults false, preserves roles and requires audit metadata', () => transaction(async () => {
      assert.equal(await scalar('SELECT count(*) FROM profiles WHERE is_verified'), 0);
      await rejectSQL(`UPDATE profiles SET is_verified=true WHERE id='${alice}'`, /ck_profiles_verification/);
      await db.exec(`UPDATE profiles SET is_verified=true,verified_by='${admin}',verified_at=now() WHERE id='${alice}'`);
      assert.equal(await scalar(`SELECT role::text FROM profiles WHERE id='${alice}'`), 'STUDENT');
      await rejectSQL(body(sql.downContent), /Downgrade would discard content or verification/);
    }));
    await t.test('browser roles cannot set verification or access private audit tables', async () => {
      // Exercise the trigger even if a deployment has a broad profile policy.
      await db.exec('CREATE POLICY test_profile_access ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true)');
      try {
      await asUser(alice, async () => {
        await rejectSQL(`UPDATE profiles SET is_verified=true,verified_at=now(),verified_by='${admin}' WHERE id='${alice}'`, /administrative API/);
        for (const table of ['inspire_attachments','moderation_actions','verification_actions']) {
          assert.equal(await scalar(`SELECT count(*) FROM ${table}`), 0);
        }
        await rejectSQL(`INSERT INTO verification_actions(user_id,administrator_id,status) VALUES ('${alice}','${admin}','verified')`, /row-level security/);
      });
      } finally { await db.exec('DROP POLICY test_profile_access ON profiles'); }
    });
    await t.test('attachments enforce expiry, size, MIME, ownership and storage uniqueness', () => transaction(async () => {
      const insert = (extra, values) => `INSERT INTO inspire_attachments(user_id,storage_bucket,storage_path,filename,mime_type,file_size${extra}) VALUES ('${alice}','private-posts','one.pdf','one.pdf','application/pdf',10${values})`;
      await rejectSQL(insert('', ''), /ck_inspire_attachments_expiry/);
      await rejectSQL(insert(',story_id', ',99999'), /same owner/);
      await rejectSQL(insert(',story_id,quote_id', ',1,1'), /ck_inspire_attachments_target/);
      await rejectSQL(insert(',story_id', ',1').replace(`'${alice}'`, `'${bob}'`), /same owner/);
      await db.exec(insert(',story_id', ',1'));
      await rejectSQL(insert(',story_id', ',1'), /uq_inspire_attachments_object/);
      await rejectSQL('UPDATE inspire_attachments SET file_size=26214401', /ck_inspire_attachments_size/);
      await rejectSQL("UPDATE inspire_attachments SET mime_type='text/html'", /ck_inspire_attachments_type/);
      await rejectSQL(`UPDATE inspire_stories SET user_id='${bob}' WHERE id=1`, /Cannot change the owner/);
      await rejectSQL(body(sql.downContent), /Downgrade would discard content or verification/);
      await db.exec(insert(',expires_at', ",now()+interval '1 hour'").replace("'one.pdf','one.pdf'", "'pending.pdf','pending.pdf'"));
    }));
    await t.test('moderation requires reasons and preserves history when inbox messages are cleared', () => transaction(async () => {
      const insert = reason => `INSERT INTO moderation_actions(content_type,content_id,content_title,administrator_id,author_id,reason) VALUES ('story',1,'Original story','${admin}','${alice}','${reason}')`;
      await rejectSQL(insert('   '), /ck_moderation_actions_reason/);
      await db.exec(`INSERT INTO contact_messages(recipient_id,name,email,subject,message) VALUES ('${alice}','VoiceED','support@example.test','Removed story','Reason for removal')`);
      await db.exec(insert('Policy violation'));
      await db.exec('UPDATE moderation_actions SET notification_id=(SELECT max(id) FROM contact_messages)');
      await db.exec('DELETE FROM contact_messages');
      assert.equal(await scalar('SELECT count(*) FROM moderation_actions'), 1);
      assert.equal(await scalar('SELECT notification_id FROM moderation_actions'), null);
      await rejectSQL(body(sql.downContent), /Downgrade would discard content or verification/);
    }));
    await t.test('last active superadministrator cannot be demoted, suspended or deleted', () => transaction(async () => {
      await rejectSQL(`UPDATE profiles SET role='STUDENT' WHERE id='${admin}'`, /last active superadministrator/);
      await rejectSQL(`UPDATE profiles SET is_active=false WHERE id='${admin}'`, /last active superadministrator/);
      await rejectSQL(`DELETE FROM profiles WHERE id='${admin}'`, /last active superadministrator/);
      await db.exec(`UPDATE profiles SET role='SUPER_ADMIN' WHERE id='${bob}'`);
      await db.exec(`UPDATE profiles SET role='STUDENT' WHERE id='${admin}'`);
      await rejectSQL(`UPDATE profiles SET is_active=false WHERE id='${bob}'`, /last active superadministrator/);
    }));
    await t.test('browser roles cannot escalate authority even under a broad profile policy', async () => {
      await db.exec('CREATE POLICY test_profile_authority ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true)');
      try { await asUser(alice, async () => {
        await rejectSQL(`UPDATE profiles SET role='SUPER_ADMIN' WHERE id='${alice}'`, /administrative API/);
        await rejectSQL(`UPDATE profiles SET is_active=false WHERE id='${alice}'`, /administrative API/);
        await rejectSQL(`INSERT INTO account_actions(id,actor_id,action,status,payload) VALUES ('30000000-0000-4000-8000-000000000001','${alice}','verify','applied','{}')`, /permission denied|row-level security/);
      }); } finally { await db.exec('DROP POLICY test_profile_authority ON profiles'); }
    });
    await t.test('account audit history prevents destructive downgrade', () => transaction(async () => {
      await db.exec(`INSERT INTO account_actions(id,actor_id,action,status,payload) VALUES ('30000000-0000-4000-8000-000000000001','${admin}','update','applied','{}')`);
      await rejectSQL(body(sql.downAccounts), /Downgrade would discard account/);
    }));
    await t.test('empty additive tables can safely downgrade and upgrade again', async () => {
      await db.exec('DELETE FROM contact_messages; DELETE FROM user_activity; DELETE FROM mood_records; DELETE FROM wellness_goals');
      for (const name of ['downOptimization', 'downAccounts', 'downUsercontent', 'downSharesearch', 'downContent', 'downRoles', 'downReporting', 'downSessions', 'downSocial', 'downWellness', 'downCore']) await runRevision(name);
      assert.equal(await scalar('SELECT version_num FROM alembic_version'), '129e9b18f7ce');
      assert.equal(await scalar('SELECT content FROM journal_entries'), 'Original private content');
      assert.equal(await scalar('SELECT count(*) FROM reports'), 2);
      for (const name of ['core', 'wellness', 'social', 'sessions', 'reporting', 'roles', 'content', 'shareSearch', 'userContent', 'accounts', 'optimization']) await runRevision(name);
      assert.equal(await scalar('SELECT version_num FROM alembic_version'), 'eb8031649cd5');
    });
  } finally { await db.close(); }
});
