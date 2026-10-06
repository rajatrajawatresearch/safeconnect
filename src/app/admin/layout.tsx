import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = { title: "Administration" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell area="admin">{children}</AppShell>;
}
