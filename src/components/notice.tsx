import { cn } from "@/lib/utils";

type NoticeProps = {
  type: string;
  message: string;
};

export function Notice({ type, message }: NoticeProps) {
  return <div className={cn("notice", type === "error" ? "notice-error" : "notice-success")}>{message}</div>;
}
