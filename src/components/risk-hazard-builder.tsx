"use client";

import { useMemo, useState } from "react";

type HazardRow = {
  id: string;
  hazard: string;
  effect: string;
  controlMeasures: string;
  residualRisk: string;
};

function createHazardRow(): HazardRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    hazard: "",
    effect: "",
    controlMeasures: "",
    residualRisk: ""
  };
}

export function RiskHazardBuilder() {
  const [rows, setRows] = useState<HazardRow[]>(() => [createHazardRow()]);

  const hazardsJson = useMemo(
    () =>
      JSON.stringify(
        rows.map(({ hazard, effect, controlMeasures, residualRisk }) => ({
          hazard,
          effect,
          controlMeasures,
          residualRisk
        }))
      ),
    [rows]
  );

  function updateRow(id: string, field: keyof Omit<HazardRow, "id">, value: string) {
    setRows((currentRows) =>
      currentRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  function addRow() {
    setRows((currentRows) => [...currentRows, createHazardRow()]);
  }

  function removeRow(id: string) {
    setRows((currentRows) => {
      if (currentRows.length === 1) {
        return [createHazardRow()];
      }

      return currentRows.filter((row) => row.id !== id);
    });
  }

  return (
    <div className="risk-hazard-builder">
      <input name="hazardsJson" type="hidden" value={hazardsJson} />

      <div className="risk-hazard-stack">
        {rows.map((row, index) => (
          <section className="risk-hazard-card" key={row.id}>
            <div className="section-head risk-hazard-head">
              <div>
                <h3>Hazard {index + 1}</h3>
                <p className="muted">Capture the hazard, likely effect, controls, and remaining residual risk.</p>
              </div>
              <button className="button button-small button-ghost" onClick={() => removeRow(row.id)} type="button">
                Remove
              </button>
            </div>

            <div className="form-grid two-up">
              <div className="field">
                <label htmlFor={`hazard-${row.id}`}>Hazard</label>
                <textarea
                  id={`hazard-${row.id}`}
                  onChange={(event) => updateRow(row.id, "hazard", event.target.value)}
                  placeholder="Flammable solvent vapors, hot surfaces, nanoparticle inhalation risk..."
                  value={row.hazard}
                />
              </div>

              <div className="field">
                <label htmlFor={`effect-${row.id}`}>Effect</label>
                <textarea
                  id={`effect-${row.id}`}
                  onChange={(event) => updateRow(row.id, "effect", event.target.value)}
                  placeholder="Fire, skin irritation, respiratory exposure, equipment damage..."
                  value={row.effect}
                />
              </div>
            </div>

            <div className="form-grid two-up">
              <div className="field">
                <label htmlFor={`controls-${row.id}`}>Control measures</label>
                <textarea
                  id={`controls-${row.id}`}
                  onChange={(event) => updateRow(row.id, "controlMeasures", event.target.value)}
                  placeholder="Fume hood use, shielding, SOP, training, buddy system, ventilation..."
                  value={row.controlMeasures}
                />
              </div>

              <div className="field">
                <label htmlFor={`residual-${row.id}`}>Residual risk</label>
                <textarea
                  id={`residual-${row.id}`}
                  onChange={(event) => updateRow(row.id, "residualRisk", event.target.value)}
                  placeholder="Low after controls, medium during setup, high until interlock is verified..."
                  value={row.residualRisk}
                />
              </div>
            </div>
          </section>
        ))}
      </div>

      <button className="button button-secondary" onClick={addRow} type="button">
        Add hazard row
      </button>
    </div>
  );
}
