import Link from "next/link";
import QRCode from "qrcode";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PrintButton } from "@/components/print-button";

export default async function InstrumentLabelsPage({ searchParams }: { searchParams?: Promise<{ instrumentId?: string }> }) {
  const query = await searchParams;
  const instrumentId = typeof query?.instrumentId === "string" ? query.instrumentId : undefined;
  const user = await requireUser(`/instruments/labels${instrumentId ? `?instrumentId=${encodeURIComponent(instrumentId)}` : ""}`);
  if (user.role === Role.TEMP) redirect("/instruments");
  const instruments = await db.instrument.findMany({ where: instrumentId ? { id: instrumentId } : undefined, orderBy: { name: "asc" } });
  const labels = await Promise.all(instruments.map(async instrument => {
    const url = `https://lab.amboies.com/instruments/${encodeURIComponent(instrument.id)}`;
    return { ...instrument, url, qr: await QRCode.toDataURL(url, { width: 480, margin: 4, errorCorrectionLevel: "M" }) };
  }));
  return <div className="labels-page">
    <section className="panel print-controls">
      <div className="section-head"><div><span className="eyebrow">Equipment access</span><h1>Instrument QR labels</h1><p className="muted">Scan to open the instrument’s details, operating guides and booking calendar. Lab login is required.</p></div><PrintButton /></div>
      <p>Print at 100% scale on Letter paper, with browser headers and footers off. Each cut-out label is 3.5 × 2 inches. Select “Save as PDF” to export.</p>
      <div className="inline-actions"><Link href="/instruments">← Instruments</Link>{instrumentId && <Link href="/instruments/labels">Show all labels</Link>}</div>
    </section>
    <div className="qr-label-grid">
      {labels.map(instrument => <article className="qr-label" key={instrument.id}>
        {/* QR data is generated locally; no instrument links are sent to an external QR service. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={instrument.qr} width={144} height={144} alt={`QR code for ${instrument.name}`} />
        <div><span className="label-brand">THE BOIES GROUP</span><h2>{instrument.name}</h2><p>{instrument.location}</p><strong>Details · Guides · Calendar</strong><small>Scan to open · Lab login required</small><a href={instrument.url}>lab.amboies.com</a></div>
      </article>)}
    </div>
    {!labels.length && <p className="panel">No instruments found.</p>}
  </div>;
}
