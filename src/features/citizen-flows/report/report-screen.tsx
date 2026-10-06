"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageContainer } from "@/components/shared/page";
import { RestrictedState } from "@/components/shared/states";
import { useCategories } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { scrollMainToTop } from "../ui";
import { KindChooser } from "./kind-chooser";
import { kindFromParam, type ReportKind } from "./model";
import { ReportDone } from "./report-done";
import { ReportWizard } from "./report-wizard";
import type { SubmitResult } from "./submit";

/**
 * Guided reporting: choose the kind, answer eight short steps, then a confirmation.
 * `?type=emergency|report|tip` skips the chooser and `?category=<categoryId>` pre-selects what happened.
 */
export function ReportScreen() {
  const params = useSearchParams();
  const type = params.get("type");
  const category = params.get("category");
  // A shortcut tapped while this screen is open starts a fresh flow with the new prefill.
  return (
    <ReportFlow
      key={`${type ?? ""}|${category ?? ""}`}
      typeParam={type}
      categoryParam={category}
    />
  );
}

function ReportFlow({
  typeParam,
  categoryParam,
}: {
  typeParam: string | null;
  categoryParam: string | null;
}) {
  const { citizen } = useSession();
  const categories = useCategories();
  const [kind, setKind] = useState<ReportKind | null>(() =>
    kindFromParam(typeParam),
  );
  const [result, setResult] = useState<SubmitResult | null>(null);

  const category = categories.find(
    (c) => c.id === categoryParam && c.enabled && c.citizenVisible,
  );

  if (!citizen)
    return (
      <PageContainer width="narrow">
        <RestrictedState />
      </PageContainer>
    );

  if (result)
    return (
      <ReportDone
        result={result}
        onAnother={() => {
          setResult(null);
          setKind(null);
          scrollMainToTop();
        }}
      />
    );

  if (!kind)
    return (
      <KindChooser
        category={category}
        onSelect={(next) => {
          setKind(next);
          scrollMainToTop();
        }}
      />
    );

  return (
    <ReportWizard
      kind={kind}
      onKindChange={setKind}
      initialCategoryId={category?.id ?? ""}
      citizen={citizen}
      onExit={() => {
        setKind(null);
        scrollMainToTop();
      }}
      onDone={(done) => {
        setResult(done);
        scrollMainToTop();
      }}
    />
  );
}
