"use client";

import { useId, useState } from "react";
import { InstrumentStatus } from "@prisma/client";

type InstrumentStatusFieldsProps = {
  statusName?: string;
  noteName?: string;
  unavailableUntilName?: string;
  statusLabel?: string;
  noteLabel?: string;
  unavailableUntilLabel?: string;
  defaultStatus?: InstrumentStatus;
  defaultNote?: string;
  defaultUnavailableUntil?: string;
};

export function InstrumentStatusFields({
  statusName = "status",
  noteName = "statusNote",
  unavailableUntilName = "unavailableUntil",
  statusLabel = "Status",
  noteLabel = "Unavailable note",
  unavailableUntilLabel = "Unavailable until",
  defaultStatus = InstrumentStatus.AVAILABLE,
  defaultNote = "",
  defaultUnavailableUntil = ""
}: InstrumentStatusFieldsProps) {
  const [status, setStatus] = useState<InstrumentStatus>(defaultStatus);
  const statusId = useId();
  const noteId = useId();
  const unavailableUntilId = useId();
  const showNote = status === InstrumentStatus.UNAVAILABLE;

  return (
    <>
      <div className="field">
        <label htmlFor={statusId}>{statusLabel}</label>
        <select
          defaultValue={defaultStatus}
          id={statusId}
          name={statusName}
          onChange={(event) => setStatus(event.target.value as InstrumentStatus)}
        >
          <option value={InstrumentStatus.AVAILABLE}>Available</option>
          <option value={InstrumentStatus.UNAVAILABLE}>Unavailable</option>
        </select>
      </div>

      {showNote ? (
        <>
          <div className="field">
            <label htmlFor={noteId}>{noteLabel}</label>
            <input
              defaultValue={defaultNote}
              id={noteId}
              name={noteName}
              placeholder="Out for service, on campaign, loaned out, broken, etc."
              required
            />
          </div>

          <div className="field">
            <label htmlFor={unavailableUntilId}>{unavailableUntilLabel}</label>
            <input
              defaultValue={defaultUnavailableUntil}
              id={unavailableUntilId}
              name={unavailableUntilName}
              type="date"
            />
            <p className="field-hint">Optional. We will remind the owner to review availability on this date.</p>
          </div>
        </>
      ) : (
        <>
          <input name={noteName} type="hidden" value="" />
          <input name={unavailableUntilName} type="hidden" value="" />
        </>
      )}
    </>
  );
}
