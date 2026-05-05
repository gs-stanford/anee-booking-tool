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
    <div className="plain-form-stack">
      <input name="hazardsJson" type="hidden" value={hazardsJson} />

      <div className="table-wrap">
        <table className="risk-hazard-table">
          <thead>
            <tr>
              <th className="risk-row-number-head">#</th>
              <th>Hazard</th>
              <th>Effect</th>
              <th>Control measures</th>
              <th>Residual risk</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td className="risk-row-number-cell">{index + 1}</td>
                <td>
                  <textarea
                    aria-label="Hazard"
                    className="risk-table-textarea"
                    placeholder="What can go wrong?"
                    onChange={(event) => updateRow(row.id, "hazard", event.target.value)}
                    value={row.hazard}
                  />
                </td>
                <td>
                  <textarea
                    aria-label="Effect"
                    className="risk-table-textarea"
                    placeholder="Possible injury or consequence"
                    onChange={(event) => updateRow(row.id, "effect", event.target.value)}
                    value={row.effect}
                  />
                </td>
                <td>
                  <textarea
                    aria-label="Control measures"
                    className="risk-table-textarea"
                    placeholder="PPE, engineering controls, procedure steps"
                    onChange={(event) => updateRow(row.id, "controlMeasures", event.target.value)}
                    value={row.controlMeasures}
                  />
                </td>
                <td>
                  <textarea
                    aria-label="Residual risk"
                    className="risk-table-textarea"
                    placeholder="Low / medium / high after controls"
                    onChange={(event) => updateRow(row.id, "residualRisk", event.target.value)}
                    value={row.residualRisk}
                  />
                </td>
                <td className="risk-table-actions">
                  <button className="risk-row-remove" onClick={() => removeRow(row.id)} type="button">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <button className="button button-ghost" onClick={addRow} type="button">
          Add hazard row
        </button>
      </div>
    </div>
  );
}
