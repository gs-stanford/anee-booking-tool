import Link from "next/link";

import { cn } from "@/lib/utils";
import { safetySdsFolderUrl } from "@/lib/safety-links";

type SafetyNavProps = {
  current: "home" | "risk-assessment" | "chemical-disposals";
};

export function SafetyNav({ current }: SafetyNavProps) {
  return (
    <div className="safety-subnav">
      <Link className={cn("button button-small", current === "home" ? "button-secondary" : "button-ghost")} href="/safety">
        Safety Home
      </Link>
      <Link
        className={cn("button button-small", current === "risk-assessment" ? "button-secondary" : "button-ghost")}
        href="/safety/risk-assessment"
      >
        Risk Assessment
      </Link>
      <Link
        className={cn("button button-small", current === "chemical-disposals" ? "button-secondary" : "button-ghost")}
        href="/safety/chemical-disposals"
      >
        EH&amp;S Disposal
      </Link>
      <a className="button button-small button-ghost" href={safetySdsFolderUrl} rel="noreferrer" target="_blank">
        SDS
      </a>
    </div>
  );
}
