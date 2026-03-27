import Link from "next/link";
import { Role } from "@prisma/client";

import { logoutAction } from "@/app/actions";
import { BrandLockup } from "@/components/brand-lockup";

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
  return (
    <header className="site-header">
      <BrandLockup href={marketingUrl} labName={labName} />

      <nav className="header-nav">
        <Link href={appUrl}>Home</Link>
        <Link href="/instruments">Instruments</Link>
        {user ? <Link href="/account">Account</Link> : null}
        {user?.role === Role.ADMIN ? <Link href="/admin/users">Users</Link> : null}
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
