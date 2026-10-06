/** Number formatting shared by charts, tables and exports in the analytics views. */

const COUNT = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const ONE_DECIMAL = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const LOOSE = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

/** 1840 → "1,840". Indian digit grouping, no decimals. */
export const formatCount = (n: number) => COUNT.format(n);

/** 7.8 → "7.8". Always one decimal, for minutes and rates. */
export const formatDecimal = (n: number) => ONE_DECIMAL.format(n);

/** Whole numbers stay whole, fractions keep one decimal. Used for axis ticks and table cells. */
export const formatNumber = (n: number) => LOOSE.format(n);

export const formatPct = (n: number) => `${LOOSE.format(n)}%`;

export const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export const mean = (values: number[]) =>
  values.length ? sum(values) / values.length : 0;

/** Share of `part` in `whole` as a percentage, or 0 when there is nothing to divide by. */
export const share = (part: number, whole: number) =>
  whole > 0 ? (part / whole) * 100 : 0;
