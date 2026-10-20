import { IssueDetail } from "@/components/IssueDetail";

export default async function IssuePage({ params }: { params: Promise<{ issueNo: string }> }) {
  return <IssueDetail issueNo={Number((await params).issueNo)} />;
}
