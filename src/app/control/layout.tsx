import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = { title: "Control room" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell area="control">{children}</AppShell>;
}
