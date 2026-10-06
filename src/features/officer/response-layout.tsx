import type { ReactNode } from "react";

/**
 * Frame for the response screen.
 *
 * Phones: one scrolling column with the action bar pinned above the bottom navigation.
 * Tablet and up: two panes that scroll on their own — actions on the left, map and incident
 * intelligence on the right — so the next action never scrolls out of reach.
 */
export function ResponseLayout({
  left,
  right,
  bar,
}: {
  left: ReactNode;
  right: ReactNode;
  /** Phone-only sticky actions. */
  bar?: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col md:h-full md:min-h-0 md:flex-row">
      <div className="scroll-thin md:w-[21.5rem] md:shrink-0 md:overflow-y-auto md:border-r md:border-border lg:w-[23rem] xl:w-[27rem]">
        <div className="space-y-4 px-4 pt-5 pb-4 sm:px-6 md:p-5">{left}</div>
      </div>
      <div className="scroll-thin min-w-0 md:flex-1 md:overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-6 sm:px-6 md:p-5">
          {right}
        </div>
      </div>
      {bar}
    </div>
  );
}
