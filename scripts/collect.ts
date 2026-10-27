/**
 * CLI 수집기 (GitHub Actions / 작업 스케줄러용):  npm run collect -- [days]
 * 웹의 '기사 최신화' 버튼과 동일한 파이프라인을 실행한다.
 * 모든 채널이 실패하면 종료 코드 1 (Actions 가 실패로 표시하고 알림을 보냄)
 */
import { refreshArticles } from "@/lib/collector";

const days = Number(process.argv[2] ?? "") || undefined;
refreshArticles({ days })
  .then((r) => {
    console.table(r.perSource);
    console.log(`신규 ${r.added} · 중복 ${r.duplicates} · 제외 ${r.filtered}`);
    if (r.warning) console.warn(r.warning);
    const failed = r.perSource.filter((s) => s.error);
    for (const f of failed) console.warn(`✘ ${f.source}: ${f.error}`);
    if (r.perSource.length > 0 && failed.length === r.perSource.length) {
      console.error("모든 채널 수집에 실패했습니다.");
      process.exit(1);
    }
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
