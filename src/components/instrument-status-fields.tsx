"use client";

import { useId, useState } from "react";
import { InstrumentStatus } from "@prisma/client";

type InstrumentStatusFieldsProps = {
  statusName?: string;
  noteName?: string;
  statusLabel?: string;
  noteLabel?: string;
  defaultStatus?: InstrumentStatus;
  defaultNote?: string;
};

export function InstrumentStatusFields({
  statusName = "status",
  noteName = "statusNote",
  statusLabel = "Status",
  noteLabel = "Unavailable note",
  defaultStatus = InstrumentStatus.AVAILABLE,
  defaultNote = ""
}: InstrumentStatusFieldsProps) {
  const [status, setStatus] = useState<InstrumentStatus>(defaultStatus);
  const statusId = useId();
  const noteId = useId();
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
      ) : null}
    </>
  );
}
