"use client";
import { useId, useRef, type CSSProperties, type ReactNode } from "react";
export function CalendarDialog({ title, label, children, triggerClassName, triggerStyle, triggerTitle }: { title: string; label: ReactNode; children: ReactNode; triggerClassName?: string; triggerStyle?: CSSProperties; triggerTitle?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  return <>
    <button type="button" className={triggerClassName ?? "button button-secondary button-small"} style={triggerStyle} title={triggerTitle} onClick={() => ref.current?.showModal()}>{label}</button>
    <dialog onSubmit={() => ref.current?.close()} ref={ref} className="calendar-dialog" aria-labelledby={id} onClick={e => { if (e.target === e.currentTarget) ref.current?.close(); }}>
      <div className="dialog-body"><div className="section-head"><h2 id={id}>{title}</h2><button type="button" className="button button-ghost" aria-label="Close dialog" onClick={() => ref.current?.close()}>Close ×</button></div>{children}</div>
    </dialog>
  </>;
}
