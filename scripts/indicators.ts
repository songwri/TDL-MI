/**
 * 공개 경제 지표(FRED) 받기:  npm run indicators
 * GitHub Actions 가 기사 수집 뒤에 실행한다. 일부 지표가 실패해도 나머지는 저장한다.
 */
import { refreshIndicators } from "@/lib/indicators";

refreshIndicators()
  .then((r) => {
    console.table(r);
    if (r.every((x) => !x.ok)) {
      console.error("모든 지표를 받지 못했습니다.");
      process.exit(1);
    }
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
