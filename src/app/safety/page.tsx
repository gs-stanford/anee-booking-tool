import Image from "next/image";
import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { safetySdsFolderUrl } from "@/lib/safety-links";

const corePractices = [
  "Review the SDS before using any new chemical, gas, solvent, or reactive material.",
  "Submit a risk assessment before a new experiment, a modified procedure, or work with elevated hazards.",
  "Use the PPE and engineering controls specified by the SOP, risk assessment, and supervisor.",
  "Do not improvise waste handling. Use Stanford EH&S disposal guidance and WasteTag when chemical waste is generated.",
  "Stop work and update the assessment if controls change, new hazards appear, or the experiment drifts from the original plan."
];

export default async function SafetyLandingPage() {
  await requireUser();

  return (
    <div className="page-stack safety-page">
      <section className="panel safety-landing-panel">
        <div className="safety-hero">
          <div className="safety-hero-copy">
            <h1>Safety hub</h1>

            <div className="hero-actions">
              <Link className="button button-primary" href="/safety/risk-assessment">
                Fill Risk Assessment
              </Link>
              <a className="button button-secondary" href={safetySdsFolderUrl} rel="noreferrer" target="_blank">
                Open SDS
              </a>
              <Link className="button button-ghost" href="/safety/chemical-disposals">
                EH&amp;S Disposal
              </Link>
            </div>
          </div>

          <figure className="safety-hero-visual">
            <Image
              alt="Lab safety practices"
              className="safety-banner-image"
              height={480}
              priority
              src="/labsafety.png"
              width={1600}
            />
          </figure>
        </div>
      </section>

      <section className="panel safety-practices-section">
        <h2>Basic lab safety practices</h2>
        <p className="muted">
          This is the quick shared baseline. The real rule is still: follow the experiment-specific assessment, SOP,
          supervisor direction, and Stanford EH&amp;S whenever they are stricter.
        </p>
        <ul className="safety-principles-list">
          {corePractices.map((practice) => (
            <li key={practice}>{practice}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
