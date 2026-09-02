import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function loadDeletionModule() {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read("lib/account-deletion.ts"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { exports });
  return exports;
}

class D1Statement {
  constructor(database, sql, values = []) { this.database = database; this.sql = sql; this.values = values; }
  bind(...values) { return new D1Statement(this.database, this.sql, values); }
  execute() {
    const statement = this.database.prepare(this.sql);
    statement.run(...this.values);
    return { results: [], success: true, meta: { changes: Number(this.database.changes ?? 0) } };
  }
  async run() { return this.execute(); }
  async first() { return this.database.prepare(this.sql).get(...this.values) ?? null; }
  async all() { return { results: this.database.prepare(this.sql).all(...this.values), success: true, meta: { changes: 0 } }; }
}

class D1Adapter {
  constructor(database) { this.database = database; }
  prepare(sql) { return new D1Statement(this.database, sql); }
  async batch(statements) {
    this.database.exec("BEGIN");
    try {
      const results = statements.map(statement => statement.execute());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

function migratedDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys=ON");
  for (const file of readdirSync(new URL("../drizzle", import.meta.url)).filter(name => name.endsWith(".sql")).sort()) {
    database.exec(read(`drizzle/${file}`).replaceAll("--> statement-breakpoint", ""));
  }
  return database;
}

function seed(database) {
  const now = "2026-09-03T00:00:00.000Z";
  database.exec(`
    INSERT INTO users (id,email,nickname,city,created_at,updated_at) VALUES
      ('user-a','a@example.com','A','成都','${now}','${now}'),
      ('user-b','b@example.com','B','成都','${now}','${now}');
    INSERT INTO relationships (id,status,created_at) VALUES ('rel-1','active','${now}');
    INSERT INTO relationship_members (relationship_id,user_id,role,joined_at) VALUES
      ('rel-1','user-a','inviter','${now}'),('rel-1','user-b','partner','${now}');
    INSERT INTO relationship_invites (id,code,inviter_user_id,relationship_id,status,expires_at,created_at)
      VALUES ('invite-1','ABCDEFGH','user-a','rel-1','pending','2026-09-10T00:00:00.000Z','${now}');
    INSERT INTO schedules (id,relationship_id,created_by_user_id,accepted_by_user_id,visibility,title,event_date,event_time,city,status,source,facts_json,version,created_at,updated_at)
      VALUES
      ('personal-a',NULL,'user-a',NULL,'personal','个人计划','2026-09-04','18:00','成都','active','manual','{}',1,'${now}','${now}'),
      ('shared-a','rel-1','user-a','user-b','shared','共同安排 A','2026-09-05','18:00','成都','confirmed','manual','{}',1,'${now}','${now}'),
      ('shared-b','rel-1','user-b','user-a','shared','共同安排 B','2026-09-06','18:00','成都','confirmed','manual','{}',1,'${now}','${now}');
    INSERT INTO memories (id,schedule_id,owner_user_id,relationship_id,title,event_date,city,note,created_at,updated_at)
      VALUES
      ('memory-a','shared-a','user-a','rel-1','A 的回忆','2026-09-05','成都','A 的文字','${now}','${now}'),
      ('memory-b','shared-a','user-b','rel-1','B 的回忆','2026-09-05','成都','B 的文字','${now}','${now}');
    INSERT INTO important_days (id,relationship_id,created_by_user_id,accepted_by_user_id,visibility,title,event_date,status,created_at,updated_at)
      VALUES
      ('important-personal',NULL,'user-a',NULL,'personal','A 的生日','1990-01-01','active','${now}','${now}'),
      ('important-shared','rel-1','user-a','user-b','shared','纪念日','2026-02-02','confirmed','${now}','${now}');
    INSERT INTO relationship_tasks (id,relationship_id,created_by_user_id,accepted_by_user_id,title,status,created_at,updated_at)
      VALUES ('task-1','rel-1','user-a','user-b','一起散步','active','${now}','${now}');
    INSERT INTO user_media (id,owner_user_id,relationship_id,object_key,content_type,size_bytes,visibility,status,created_at)
      VALUES ('media-a','user-a','rel-1','users/user-a/media-a','image/jpeg',100,'shared','active','${now}');
    INSERT INTO schedule_share_links (id,schedule_id,created_by_user_id,token_hash,expires_at,created_at)
      VALUES ('link-a','shared-a','user-a','hash-a','2026-09-10T00:00:00.000Z','${now}');
    INSERT INTO user_preferences (user_id,updated_at) VALUES ('user-a','${now}');
    INSERT INTO feedback_entries (id,user_id,category,message,created_at) VALUES ('feedback-a','user-a','产品建议','反馈','${now}');
    INSERT INTO recommendation_feedback (id,user_id,sentiment,created_at) VALUES ('recommendation-a','user-a','suitable','${now}');
    INSERT INTO ai_usage_limits (key_hash,user_id,bucket,window_started_at,request_count,updated_at)
      VALUES ('usage-a','user-a','daily',0,1,'${now}');
    INSERT INTO service_runs (id,service,source,duration_ms,outcome,created_at)
      VALUES ('run-1','ai','primary',100,'success','${now}');
  `);
}

test("account deletion removes personal data and preserves the partner's shared facts", async () => {
  const database = migratedDatabase();
  seed(database);
  const deletedObjects = [];
  const { deleteAccountData } = loadDeletionModule();
  await deleteAccountData(new D1Adapter(database), { delete: async key => deletedObjects.push(key) }, "user-a", "2026-09-03T12:00:00.000Z");

  assert.deepEqual(deletedObjects, ["users/user-a/media-a"]);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM users WHERE id='user-a'").get().count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM users WHERE id='user-b'").get().count, 1);
  assert.equal(database.prepare("SELECT status FROM relationships WHERE id='rel-1'").get().status, "ended");
  assert.ok(database.prepare("SELECT left_at FROM relationship_members WHERE user_id='user-b'").get().left_at);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM relationship_members WHERE user_id='user-a'").get().count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM schedules WHERE id='personal-a'").get().count, 0);
  assert.equal(database.prepare("SELECT created_by_user_id FROM schedules WHERE id='shared-a'").get().created_by_user_id, "user-b");
  assert.equal(database.prepare("SELECT accepted_by_user_id FROM schedules WHERE id='shared-b'").get().accepted_by_user_id, null);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM memories WHERE id='memory-a'").get().count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM memories WHERE id='memory-b'").get().count, 1);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM important_days WHERE id='important-personal'").get().count, 0);
  assert.equal(database.prepare("SELECT created_by_user_id FROM important_days WHERE id='important-shared'").get().created_by_user_id, "user-b");
  assert.equal(database.prepare("SELECT created_by_user_id FROM relationship_tasks WHERE id='task-1'").get().created_by_user_id, "user-b");
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM user_media").get().count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM feedback_entries").get().count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM recommendation_feedback").get().count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM service_runs").get().count, 1);
});

function createAccountRoute({ anonymous = false, storageFailure = false } = {}) {
  const batches = [];
  const DB = {
    prepare: sql => ({
      sql, values: [], bind(...values) { this.values = values; return this; },
      async first() { return sql.startsWith("SELECT id FROM users") ? { id: "user-a" } : null; },
      async all() { return { results: sql.startsWith("SELECT object_key") ? [{ object_key: "users/user-a/photo" }] : [] }; },
    }),
    async batch(statements) { batches.push(statements); return []; },
  };
  const MEDIA = { async delete() { if (storageFailure) throw new Error("R2 unavailable"); } };
  const deletionModule = loadDeletionModule();
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read("app/api/account/route.ts"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports, Request, Response,
    require: name => name === "cloudflare:workers" ? { env: { DB, MEDIA } } : name.includes("chatgpt-auth") ? { getChatGPTUser: async () => anonymous ? null : { userId: "user-a", email: "a@example.com" } } : deletionModule,
  });
  return { ...exports, batches };
}

const deletionRequest = confirmation => new Request("http://local.test/api/account", {
  method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmation }),
});

test("account deletion API requires identity and an exact confirmation phrase", async () => {
  assert.equal((await createAccountRoute({ anonymous: true }).DELETE(deletionRequest("注销账号"))).status, 401);
  assert.equal((await createAccountRoute().DELETE(deletionRequest("删除账号"))).status, 400);
  const route = createAccountRoute();
  assert.equal((await route.DELETE(deletionRequest("注销账号"))).status, 200);
  assert.equal(route.batches.length, 1);
});

test("account deletion keeps the database intact when object deletion fails", async () => {
  const route = createAccountRoute({ storageFailure: true });
  const response = await route.DELETE(deletionRequest("注销账号"));
  assert.equal(response.status, 503);
  assert.equal(route.batches.length, 0);
});
