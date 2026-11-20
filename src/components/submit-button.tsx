"use client";
import { useFormStatus } from "react-dom";
export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="button button-secondary button-small" disabled={pending}>{pending ? "Saving…" : label}</button>;
}
