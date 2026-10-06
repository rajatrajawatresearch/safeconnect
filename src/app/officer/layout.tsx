import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = { title: "Officer app" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell area="officer">{children}</AppShell>;
}
