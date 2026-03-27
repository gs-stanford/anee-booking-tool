import Link from "next/link";

type BrandLockupProps = {
  href?: string;
  labName: string;
};

export function BrandLockup({ href = "/", labName }: BrandLockupProps) {
  return (
    <Link href={href} className="brand-lockup anee-mark" aria-label={`${labName} home`}>
      <span className="anee-mark-rule" />
      <span className="anee-mark-word">ANEE</span>
      <span className="anee-mark-subtitle">Aerosol and Nanotechnology for Energy and the Environment</span>
    </Link>
  );
}
