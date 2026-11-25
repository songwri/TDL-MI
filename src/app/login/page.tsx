import { LoginForm } from "./LoginForm";

export const metadata = { title: "로그인 · TDL Trend" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginForm next={next} />;
}
