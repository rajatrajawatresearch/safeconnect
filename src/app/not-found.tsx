import Link from "next/link";
import { Wordmark } from "@/components/shared/emblem";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid flex-1 place-items-center p-6">
      <div className="w-full max-w-md text-center">
        <Wordmark className="mx-auto mb-8 w-fit text-left" />
        <h1 className="text-2xl font-semibold tracking-tight">This page does not exist</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The link may be out of date, or the address was typed incorrectly. Nothing was lost.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button size="lg" asChild>
            <Link href="/">Go to the start page</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/citizen">Open the citizen app</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
