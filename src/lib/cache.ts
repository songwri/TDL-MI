/**
 * 서버 메모리 캐시 (같은 값을 매번 구글 시트에서 다시 읽지 않도록).
 *
 *   soft 시간 안이면 저장된 값을 그대로 돌려준다.
 *   soft 를 넘었지만 hard 안이면 일단 저장된 값을 돌려주고, 뒤에서 새로 읽어 둔다(사용자는 기다리지 않음).
 *   hard 를 넘었거나 값이 없으면 새로 읽을 때까지 기다린다.
 *   같은 키를 동시에 여러 번 읽으려 하면 한 번만 읽는다.
 */
interface Entry {
  at: number;
  value: unknown;
}
const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export interface CacheOpts {
  soft: number;
  hard?: number;
  /** true 면 캐시를 건너뛰고 새로 읽는다 (사용자가 새로고침을 눌렀을 때) */
  fresh?: boolean;
}

export async function cached<T>(key: string, opts: CacheOpts, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  const age = hit ? Date.now() - hit.at : Infinity;
  const reload = () => {
    let p = inflight.get(key) as Promise<T> | undefined;
    if (!p) {
      p = load()
        .then((value) => {
          store.set(key, { at: Date.now(), value });
          return value;
        })
        .finally(() => inflight.delete(key));
      inflight.set(key, p);
    }
    return p;
  };
  if (hit && !opts.fresh && age < opts.soft) return hit.value as T;
  if (hit && !opts.fresh && age < (opts.hard ?? opts.soft * 20)) {
    reload().catch(() => {}); // 뒤에서 새로 읽기. 실패하면 기존 값을 계속 쓴다
    return hit.value as T;
  }
  return reload();
}

/** 저장된 값을 버린다 (prefix 로 시작하는 키 모두, 없으면 전부) */
export function invalidate(prefix = "") {
  for (const k of [...store.keys()]) if (k.startsWith(prefix)) store.delete(k);
}
