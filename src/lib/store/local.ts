import fs from "node:fs/promises";
import path from "node:path";
import { config } from "@/lib/config";
import type { Article, NewsletterIssue } from "@/lib/types";

/** 로컬 JSON 캐시. 구글 시트가 원장(source of truth)이고, 이 파일은 빠른 조회/본문 보관용이다. */
interface Db {
  articles: Article[];
  issues: NewsletterIssue[];
  meta: { lastRefreshAt?: string; lastSheetsSyncAt?: string };
}

const dbPath = () => path.join(config.dataDir, "db.json");
let lock: Promise<unknown> = Promise.resolve();

async function readDb(): Promise<Db> {
  try {
    const raw = await fs.readFile(dbPath(), "utf8");
    const db = JSON.parse(raw) as Partial<Db>;
    return { articles: db.articles ?? [], issues: db.issues ?? [], meta: db.meta ?? {} };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { articles: [], issues: [], meta: {} };
    throw e;
  }
}

async function writeDb(db: Db) {
  await fs.mkdir(config.dataDir, { recursive: true });
  const tmp = dbPath() + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, dbPath());
}

export async function read<T>(fn: (db: Db) => T): Promise<T> {
  await lock;
  return fn(await readDb());
}

/** 직렬화된 read-modify-write */
export function mutate<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  const run = lock.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
  lock = run.catch(() => undefined);
  return run;
}
