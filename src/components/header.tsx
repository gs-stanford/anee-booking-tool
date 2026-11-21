import Link from "next/link";
import { Role } from "@prisma/client";

import { logoutAction } from "@/app/actions";
import { BrandLockup } from "@/components/brand-lockup";
import { safetySdsFolderUrl } from "@/lib/safety-links";

type HeaderProps = {
  user: {
    name: string;
    role: Role;
  } | null;
  labName: string;
  appUrl: string;
  marketingUrl: string;
};

export function Header({ user, labName, appUrl, marketingUrl }: HeaderProps) {
  const isTempUser = user?.role === Role.TEMP;
  const safetyLoginHref =
    "/login?returnTo=%2Fsafety&noticeType=success&notice=Log%20in%20to%20open%20the%20Safety%20tools.";
  const safetyLinks = [
    {
      label: "Safety Home",
      href: "/safety"
    },
    {
      label: "Risk Assessment",
      href: "/safety/risk-assessment"
    },
    {
      label: "EH&S Disposal",
      href: "/safety/chemical-disposals"
    },
    {
      label: "SDS",
      href: safetySdsFolderUrl,
      external: true
    }
  ];

  return (
    <header className="site-header">
      <BrandLockup href={marketingUrl} labName={labName} />

      <nav className="header-nav">
        <div className="header-nav-links">
          {!isTempUser ? (
            <Link className="nav-link" href={appUrl}>
              Home
            </Link>
          ) : null}
          <Link className="nav-link" href="/instruments">
            {isTempUser ? "Calendar" : "Instruments"}
          </Link>
          {user ? (
            <div className="nav-dropdown" tabIndex={0}>
              <Link className="nav-link nav-dropdown-trigger" href="/safety">
                Safety
              </Link>
              <div className="nav-dropdown-menu">
                {safetyLinks.map((item) => (
                  item.external ? (
                    <a className="nav-dropdown-item" href={item.href} key={item.label} rel="noreferrer" target="_blank">
                      {item.label}
                    </a>
                  ) : (
                    <Link className="nav-dropdown-item" href={item.href} key={item.label}>
                      {item.label}
                    </Link>
                  )
                ))}
              </div>
            </div>
          ) : (
            <Link className="nav-link" href={safetyLoginHref}>
              Safety
            </Link>
          )}
          {user && !isTempUser ? (
            <Link className="nav-link" href="/account">
              Account
            </Link>
          ) : null}
          {user?.role === Role.ADMIN ? (
            <Link className="nav-link" href="/admin/users">
              Users
            </Link>
          ) : null}
        </div>

        {user ? (
          <form action={logoutAction}>
            <button type="submit" className="button button-ghost">
              Sign out {user.name}
            </button>
          </form>
        ) : (
          <Link className="button button-primary" href="/login">
            Log in
          </Link>
        )}
      </nav>
    </header>
  );
}
