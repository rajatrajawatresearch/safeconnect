import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = { title: "Command centre" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell area="command">{children}</AppShell>;
}
