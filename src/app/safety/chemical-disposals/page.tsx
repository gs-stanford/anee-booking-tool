import { requireUser } from "@/lib/auth";
import { SafetyNav } from "@/components/safety-nav";
import {
  stanfordRecognizingWasteUrl,
  stanfordWasteDisposalUrl,
  stanfordWasteHandlingUrl,
  stanfordWasteTagUrl
} from "@/lib/safety-links";

export default async function ChemicalDisposalsPage() {
  await requireUser();

  return (
    <div className="page-stack">
      <section className="panel">
        <SafetyNav current="chemical-disposals" />

        <div className="section-head">
          <div>
            <h1>Chemical Disposals</h1>
            <p className="muted">
              This page condenses the Stanford EH&amp;S workflow for hazardous and chemical waste. When there is any
              doubt, stop and follow EH&amp;S directly.
            </p>
          </div>
          <a className="button button-primary" href={stanfordWasteDisposalUrl} rel="noreferrer" target="_blank">
            Open Stanford EH&amp;S
          </a>
        </div>
      </section>

      <div className="detail-grid">
        <section className="panel">
          <h2>Before disposal</h2>
          <ul className="safety-bullet-list">
            <li>Treat unknown lab chemicals as hazardous waste until Stanford EH&amp;S says otherwise.</li>
            <li>Do not use sinks, evaporative disposal, or regular trash unless EH&amp;S explicitly permits it.</li>
            <li>Identify whether the waste is hazardous, universal waste, mixed waste, sharps, or another regulated stream.</li>
            <li>Separate incompatible wastes from the start instead of fixing mixed containers later.</li>
          </ul>
          <a className="button button-secondary" href={stanfordRecognizingWasteUrl} rel="noreferrer" target="_blank">
            How Stanford classifies waste
          </a>
        </section>

        <section className="panel">
          <h2>Containers and storage</h2>
          <ul className="safety-bullet-list">
            <li>Label waste as soon as the first material goes into the container.</li>
            <li>Use full chemical names and percentages; avoid abbreviations-only labels.</li>
            <li>Keep waste containers closed except during active filling.</li>
            <li>Use compatible containers with secondary containment and store them near the generating process.</li>
            <li>EH&amp;S notes the standard lab accumulation limit of 55 gallons, or 1 quart for acute hazardous waste.</li>
          </ul>
          <a className="button button-secondary" href={stanfordWasteHandlingUrl} rel="noreferrer" target="_blank">
            Handling and storage details
          </a>
        </section>
      </div>

      <section className="panel">
        <h2>Pickup workflow</h2>
        <ol className="safety-bullet-list">
          <li>Confirm the waste type and package it correctly.</li>
          <li>Create or update the waste record in Stanford&apos;s WasteTag system.</li>
          <li>Request pickup before waste accumulates beyond allowed limits.</li>
          <li>Keep the container accessible and ready for EH&amp;S pickup without repackaging.</li>
        </ol>

        <div className="hero-actions">
          <a className="button button-primary" href={stanfordWasteTagUrl} rel="noreferrer" target="_blank">
            Open WasteTag guidance
          </a>
          <a className="button button-ghost" href={stanfordWasteDisposalUrl} rel="noreferrer" target="_blank">
            Full EH&amp;S disposal page
          </a>
        </div>
      </section>
    </div>
  );
}
