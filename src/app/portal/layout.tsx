"use client";

import type { ReactNode } from "react";

/** Navigation is rendered by PatientShell on authenticated patient pages. */
export default function PatientPortalLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
