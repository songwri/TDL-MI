/**
 * CLI 수집기 (cron/작업 스케줄러용):  npm run collect -- [days]
 * 웹의 '기사 최신화' 버튼과 동일한 파이프라인을 실행한다.
 */
import { refreshArticles } from "@/lib/collector";

const days = Number(process.argv[2] ?? "") || undefined;
refreshArticles({ days })
  .then((r) => {
    console.table(r.perSource);
    console.log(`신규 ${r.added} · 중복 ${r.duplicates} · 제외 ${r.filtered}`);
    if (r.warning) console.warn(r.warning);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
