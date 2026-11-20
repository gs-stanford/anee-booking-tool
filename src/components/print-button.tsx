"use client";
export function PrintButton() {
  return <button className="button button-primary" onClick={() => window.print()}>Print labels / Save as PDF</button>;
}
