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
  const inventoryLoginHref =
    "/login?returnTo=%2F&noticeType=success&notice=Log%20in%20to%20open%20inventory%20spreadsheets.";
  const purchaseRequestsLoginHref =
    "/login?returnTo=%2F&noticeType=success&notice=Log%20in%20to%20open%20purchase%20request%20spreadsheets.";
  const safetyLoginHref =
    "/login?returnTo=%2Fsafety&noticeType=success&notice=Log%20in%20to%20open%20the%20Safety%20hub.";
  const inventoryLinks = [
    {
      label: "Gas Cylinders",
      href: "https://office365stanford.sharepoint.com/:x:/r/sites/SU-Group-ME-Boies-ANEE-LabConcerns/_layouts/15/Doc2.aspx?action=edit&sourcedoc=%7B31cc01ba-ba6d-4a66-8a94-9be7f5514316%7D&wdExp=TEAMS-TREATMENT&web=1"
    },
    {
      label: "Chemicals",
      href: "https://office365stanford.sharepoint.com/:x:/r/sites/SU-Group-ME-Boies-ANEE-LabConcerns/_layouts/15/Doc2.aspx?action=edit&sourcedoc=%7B44c63b7b-a13a-4b70-8fcc-fef0dcdd573d%7D&wdExp=TEAMS-TREATMENT&web=1"
    },
    {
      label: "Consumables",
      href: "https://office365stanford.sharepoint.com/:x:/r/sites/SU-Group-ME-Boies-ANEE-LabConcerns/_layouts/15/Doc2.aspx?action=edit&sourcedoc=%7B51990952-4f01-4954-b8be-b1f671b87f63%7D&wdExp=TEAMS-TREATMENT&web=1"
    },
    {
      label: "Standard Parts",
      href: "https://office365stanford.sharepoint.com/:x:/r/sites/SU-Group-ME-Boies-ANEE-LabConcerns/_layouts/15/Doc2.aspx?action=edit&sourcedoc=%7Bad8b47ba-55e3-403f-bc90-74bbd7590f9e%7D&wdExp=TEAMS-TREATMENT&web=1"
    }
  ];
  const purchaseRequestLinks = [
    {
      label: "Consumables to Buy",
      href: "https://office365stanford.sharepoint.com/:x:/r/sites/SU-Group-ME-Boies-ANEE-LabConcerns/Shared%20Documents/3.%20Purchase%20Requests/Consumables%20to%20Buy.xlsx?d=w7fc12bd59fb446aaaef6f8dac4f69ca1&csf=1&web=1&e=CvYgcp"
    },
    {
      label: "Gas Cylinders",
      href: "https://office365stanford.sharepoint.com/:x:/r/sites/SU-Group-ME-Boies-ANEE-LabConcerns/Shared%20Documents/3.%20Purchase%20Requests/Gas%20Cylinders%20in%20Process.xlsx?d=w3480a571e6a84d35bba4cbe2b3cefe38&csf=1&web=1&e=0O6xo3"
    }
  ];

  return (
    <header className="site-header">
      <BrandLockup href={marketingUrl} labName={labName} />

      <nav className="header-nav">
        <div className="header-nav-links">
          <Link className="nav-link" href={appUrl}>
            Home
          </Link>
          <Link className="nav-link" href="/instruments">
            Instruments
          </Link>
          {user ? (
            <div className="nav-dropdown" tabIndex={0}>
              <span className="nav-link nav-dropdown-trigger">Inventory</span>
              <div className="nav-dropdown-menu">
                {inventoryLinks.map((item) => (
                  <a
                    className="nav-dropdown-item"
                    href={item.href}
                    key={item.label}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <Link className="nav-link" href={inventoryLoginHref}>
              Inventory
            </Link>
          )}
          {user ? (
            <div className="nav-dropdown" tabIndex={0}>
              <span className="nav-link nav-dropdown-trigger">Purchase Requests</span>
              <div className="nav-dropdown-menu">
                {purchaseRequestLinks.map((item) => (
                  <a
                    className="nav-dropdown-item"
                    href={item.href}
                    key={item.label}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <Link className="nav-link" href={purchaseRequestsLoginHref}>
              Purchase Requests
            </Link>
          )}
          <Link className="nav-link" href={user ? "/safety" : safetyLoginHref}>
            Safety
          </Link>
          {user ? (
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
