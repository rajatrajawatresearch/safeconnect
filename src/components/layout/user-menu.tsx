"use client";

import { useQuery } from "@tanstack/react-query";
import { KeyRound, Languages, LogOut, ShieldCheck, SunMoon, TimerReset } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/shared/page";
import { ToneChip } from "@/components/shared/status-chips";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAction } from "@/hooks/use-action";
import { useNow } from "@/hooks/use-now";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { useTheme, type ThemeChoice } from "@/hooks/use-theme";
import { LANGUAGES } from "@/lib/i18n";
import { formatDuration, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import { usePrefsStore } from "@/stores/prefs-store";
import type { LanguageCode } from "@/types";

export function PersonaAvatar({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground",
        className,
      )}
    >
      {initials}
    </span>
  );
}

/** Session security surface: device, expiry, and the second-factor step. All values are simulated. */
function SecurityDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const session = useSession();
  const now = useNow();
  const mfaVerifiedAt = usePrefsStore((s) => s.mfaVerifiedAt);
  const [code, setCode] = useState("");
  const { data, refetch } = useQuery({
    queryKey: ["session", session.persona.id],
    queryFn: () => services.auth.getSession(session.persona.id),
    enabled: open,
  });
  const verify = useAction(services.auth.verifyMfa, {
    onSuccess: (ok) => {
      if (ok) {
        toast.success("Second factor verified");
        setCode("");
      } else {
        toast.error("Enter the 6-digit code from your authenticator.");
      }
    },
  });
  const extend = useAction(services.auth.extendSession, {
    success: "Session extended by 30 minutes",
    onSuccess: () => void refetch(),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Session and security</DialogTitle>
          <DialogDescription>
            Staff access is tied to a device and a verified session. Every
            action in this session is written to the audit log.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-4">
          <Field label="Signed in as" className="col-span-2">
            {session.persona.name} · {session.persona.title}
          </Field>
          <Field label="Device" className="col-span-2">
            {data?.device ?? "—"}
          </Field>
          <Field label="Signed in">
            {data ? formatTime(data.startedAt) : "—"}
          </Field>
          <Field label="Session expires in">
            <span className="tnum font-mono">
              {data && now
                ? formatDuration((data.expiresAt - now) / 1000)
                : "—"}
            </span>
          </Field>
          <Field label="Last address">{data?.lastIp ?? "—"}</Field>
          <Field label="Second factor">
            <ToneChip tone={mfaVerifiedAt ? "resolved" : "medium"} dot>
              {mfaVerifiedAt ? "Verified" : "Not verified"}
            </ToneChip>
          </Field>
        </dl>
        {!mfaVerifiedAt && (
          <form
            className="rounded-xl border border-border bg-inset p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void verify.run(code);
            }}
          >
            <Label htmlFor="mfa-code">Authenticator code</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="6 digits"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="tnum h-9 font-mono tracking-[0.3em]"
              />
              <Button
                type="submit"
                size="lg"
                disabled={verify.pending || code.length !== 6}
              >
                <KeyRound aria-hidden /> Verify
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Demo placeholder: any six digits are accepted. Sensitive actions
              such as evidence export would require this step.
            </p>
          </form>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            size="lg"
            disabled={extend.pending}
            onClick={() => extend.run(session.persona.id)}
          >
            <TimerReset aria-hidden /> Extend session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SessionTimeoutDialog({
  open,
  onOpenChange,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignOut: () => void;
}) {
  const [left, setLeft] = useState(60);
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => {
      clearInterval(id);
      setLeft(60);
    };
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Your session is about to end</AlertDialogTitle>
          <AlertDialogDescription>
            For security, consoles sign out after a period without activity. You
            will be signed out in{" "}
            <span className="tnum font-mono font-medium text-foreground">
              {formatDuration(left)}
            </span>
            . Open incidents stay with the shift.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onSignOut}>Sign out</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => toast.success("Session extended by 30 minutes")}
          >
            Stay signed in
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function UserMenu({
  variant = "avatar",
  className,
}: {
  variant?: "avatar" | "card" | "compact";
  className?: string;
}) {
  const session = useSession();
  const router = useRouter();
  const [security, setSecurity] = useState(false);
  const [timeout, setTimeoutOpen] = useState(false);
  const staff = session.role !== "citizen";
  const signOut = () => router.push("/");
  const t = useT();
  const { theme, setTheme } = useTheme();
  const language = usePrefsStore((st) => st.language);
  const setLanguage = usePrefsStore((st) => st.setLanguage);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Account: ${session.persona.name}`}
          className={cn(
            "flex items-center gap-2.5 rounded-lg text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40",
            variant === "avatar" && "rounded-full",
            variant === "card" && "w-full p-2",
            variant === "compact" && "justify-center p-1.5",
            className,
          )}
        >
          <PersonaAvatar initials={session.persona.initials} />
          {variant === "card" && (
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-medium">
                {session.persona.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {session.persona.title}
              </span>
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side={variant === "avatar" ? "bottom" : "top"}
          className="w-64"
        >
          <DropdownMenuLabel className="leading-tight">
            <span className="block text-sm font-medium text-foreground">
              {session.persona.name}
            </span>
            <span className="block text-xs font-normal text-muted-foreground">
              {session.persona.title}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {staff && (
            <>
              <DropdownMenuItem onSelect={() => setSecurity(true)}>
                <ShieldCheck aria-hidden /> Session and security
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setTimeoutOpen(true)}>
                <TimerReset aria-hidden /> Preview session timeout
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Languages aria-hidden /> {t("language.label")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={language} onValueChange={(v) => setLanguage(v as LanguageCode)}>
                {LANGUAGES.map((l) => (
                  <DropdownMenuRadioItem key={l.code} value={l.code} lang={l.htmlLang}>
                    {l.native}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <SunMoon aria-hidden /> {t("theme.label")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemeChoice)}>
                <DropdownMenuRadioItem value="light">{t("theme.light")}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">{t("theme.dark")}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">{t("theme.system")}</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={signOut}>
            <LogOut aria-hidden /> Sign out of the demo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {staff && <SecurityDialog open={security} onOpenChange={setSecurity} />}
      {staff && (
        <SessionTimeoutDialog
          open={timeout}
          onOpenChange={setTimeoutOpen}
          onSignOut={signOut}
        />
      )}
    </>
  );
}
