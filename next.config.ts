import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 인포그래픽 PNG 변환기(네이티브 모듈)는 번들하지 않고 그대로 불러온다
  serverExternalPackages: ["@resvg/resvg-js"],
  // 서버리스 배포 시 한글 폰트 파일을 함께 올린다
  outputFileTracingIncludes: {
    "/api/charts/[issueNo]/[chart]": ["./node_modules/pretendard/dist/public/static/Pretendard-{Regular,SemiBold,Bold}.otf"],
  },
};

export default nextConfig;
