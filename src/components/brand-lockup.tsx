import Image from "next/image";
import Link from "next/link";

type BrandLockupProps = {
  href?: string;
  labName: string;
};

export function BrandLockup({ href = "/", labName }: BrandLockupProps) {
  return (
    <div className="brand-lockup">
      <Link href={href} className="anee-mark" aria-label={`${labName} home`}>
        <span className="anee-mark-rule" />
        <span className="anee-mark-word">ANEE</span>
        <span className="anee-mark-subtitle">Aerosol and Nanotechnology for Energy and the Environment</span>
      </Link>

      <div className="brand-meta">
        <p className="brand-copy">{labName}</p>
        <Image
          alt="Stanford Mechanical Engineering reference mark"
          className="brand-partner-mark"
          height={58}
          priority
          src="/stanford-meche.png"
          width={248}
        />
      </div>
    </div>
  );
}
