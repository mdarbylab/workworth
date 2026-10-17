// Tax estimates (SPEC §14, SL-02 onward; ADR 0006). A cash-flow planning
// estimate, not a filing tool. Rates come from the `tax_years` table, never
// from this file; rates are basis points and amounts are integer cents.

/** Bump when the disclaimer wording changes; everyone agrees again (REQ-048). */
export const TAX_DISCLAIMER_VERSION = 1;

export type TaxYearRates = {
  tax_year: number;
  se_earnings_factor_bp: number;
  social_security_rate_bp: number;
  social_security_wage_base_cents: number;
  medicare_rate_bp: number;
  additional_medicare_rate_bp: number;
  additional_medicare_threshold_single_cents: number;
  additional_medicare_threshold_joint_cents: number;
  additional_medicare_threshold_separate_cents: number;
  standard_deduction_single_cents: number;
  standard_deduction_joint_cents: number;
  standard_deduction_separate_cents: number;
  standard_deduction_head_cents: number;
};

/** The columns to select from `tax_years` to get a TaxYearRates. */
export const TAX_YEAR_COLUMNS =
  "tax_year, se_earnings_factor_bp, social_security_rate_bp, social_security_wage_base_cents, medicare_rate_bp, additional_medicare_rate_bp, additional_medicare_threshold_single_cents, additional_medicare_threshold_joint_cents, additional_medicare_threshold_separate_cents, standard_deduction_single_cents, standard_deduction_joint_cents, standard_deduction_separate_cents, standard_deduction_head_cents";

/** Per account (`tax_profiles`); single until the account picks one (ADR 0007). */
export type FilingStatus = "single" | "joint" | "separate" | "head";

export const FILING_STATUSES: Array<{ value: FilingStatus; label: string }> = [
  { value: "single", label: "Single" },
  { value: "joint", label: "Married filing jointly" },
  { value: "separate", label: "Married filing separately" },
  { value: "head", label: "Head of household" },
];

export function isFilingStatus(v: unknown): v is FilingStatus {
  return FILING_STATUSES.some((s) => s.value === v);
}

/** One row of `tax_brackets`: the rate on income above `lower_cents`, up to the next row's lower bound. */
export type TaxBracket = {
  filing_status: FilingStatus;
  lower_cents: number;
  rate_bp: number;
};

export type SelfEmploymentTax = {
  earningsCents: number;
  socialSecurityCents: number;
  medicareCents: number;
  additionalMedicareCents: number;
  totalCents: number;
};

/** IRS: no self-employment tax when net earnings are under $400. */
const SE_MINIMUM_EARNINGS_CENTS = 40_000;

const bp = (cents: number, rate: number) => Math.round((cents * rate) / 10_000);

/** Schedule SE on a year's net profit: 92.35% of profit, Social Security up to the wage base, Medicare on all of it, plus additional Medicare above the filing-status threshold. */
export function selfEmploymentTax(
  profitCents: number,
  rates: TaxYearRates,
  status: FilingStatus = "single",
): SelfEmploymentTax {
  const earnings = Math.max(0, bp(profitCents, rates.se_earnings_factor_bp));
  if (earnings < SE_MINIMUM_EARNINGS_CENTS) {
    return {
      earningsCents: earnings,
      socialSecurityCents: 0,
      medicareCents: 0,
      additionalMedicareCents: 0,
      totalCents: 0,
    };
  }
  // Head of household uses the single threshold, as the IRS does.
  const threshold = {
    single: rates.additional_medicare_threshold_single_cents,
    joint: rates.additional_medicare_threshold_joint_cents,
    separate: rates.additional_medicare_threshold_separate_cents,
    head: rates.additional_medicare_threshold_single_cents,
  }[status];
  const ss = bp(
    Math.min(earnings, rates.social_security_wage_base_cents),
    rates.social_security_rate_bp,
  );
  const medicare = bp(earnings, rates.medicare_rate_bp);
  const additional = bp(
    Math.max(0, earnings - threshold),
    rates.additional_medicare_rate_bp,
  );
  return {
    earningsCents: earnings,
    socialSecurityCents: ss,
    medicareCents: medicare,
    additionalMedicareCents: additional,
    totalCents: ss + medicare + additional,
  };
}

/** Tax on `taxableCents` through one filing status's brackets. */
export function bracketTax(
  taxableCents: number,
  brackets: TaxBracket[],
): number {
  const sorted = [...brackets].sort((a, b) => a.lower_cents - b.lower_cents);
  let tax = 0;
  sorted.forEach((b, i) => {
    const upper = sorted[i + 1]?.lower_cents ?? Infinity;
    const slice = Math.min(taxableCents, upper) - b.lower_cents;
    if (slice > 0) tax += (slice * b.rate_bp) / 10_000;
  });
  return Math.round(tax);
}

export type FederalIncomeTax = {
  seDeductionCents: number;
  standardDeductionCents: number;
  taxableCents: number;
  taxCents: number;
};

/**
 * A year's federal income tax on the business's profit, assuming it is the
 * person's only income: profit less half the self-employment tax and the
 * standard deduction, through the brackets. No qualified business income
 * deduction (ADR 0007), so it leans toward setting aside too much.
 */
export function federalIncomeTax(
  profitCents: number,
  rates: TaxYearRates,
  brackets: TaxBracket[],
  status: FilingStatus,
): FederalIncomeTax {
  const seDeduction = Math.round(
    selfEmploymentTax(profitCents, rates, status).totalCents / 2,
  );
  const standard = {
    single: rates.standard_deduction_single_cents,
    joint: rates.standard_deduction_joint_cents,
    separate: rates.standard_deduction_separate_cents,
    head: rates.standard_deduction_head_cents,
  }[status];
  const taxable = Math.max(0, profitCents - seDeduction - standard);
  return {
    seDeductionCents: seDeduction,
    standardDeductionCents: standard,
    taxableCents: taxable,
    taxCents: bracketTax(
      taxable,
      brackets.filter((b) => b.filing_status === status),
    ),
  };
}

/** Share of `endKey`'s year elapsed by the end of that day, from 1/365 (or 1/366) to 1. */
export function yearFraction(endKey: string): number {
  const year = Number(endKey.slice(0, 4));
  const day =
    (Date.parse(`${endKey}T00:00:00Z`) - Date.UTC(year, 0, 1)) / 86_400_000 + 1;
  const days = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86_400_000;
  return day / days;
}

/**
 * Income tax owed by a point in the year: the tax on year-to-date profit
 * annualized over the share of the year gone, times that share (ADR 0007).
 * Progressive brackets make this more than taxing the profit so far as if
 * it were the whole year, so early quarters don't come up short.
 */
export function incomeTaxToDate(
  ytdProfitCents: number,
  fraction: number,
  rates: TaxYearRates,
  brackets: TaxBracket[],
  status: FilingStatus,
): number {
  if (fraction <= 0) return 0;
  const annual = federalIncomeTax(
    Math.round(ytdProfitCents / fraction),
    rates,
    brackets,
    status,
  ).taxCents;
  return Math.round(annual * fraction);
}

/** Tax owed to date at each period end → what each period sets aside: the increase on earlier periods, never below zero. Null for a period not started. */
export function spreadSetAside(
  owedToDate: Array<number | null>,
): Array<number | null> {
  let setAside = 0;
  return owedToDate.map((owed) => {
    if (owed === null) return null;
    const due = Math.max(0, owed - setAside);
    setAside += due;
    return due;
  });
}

export type TaxQuarter = {
  quarter: 1 | 2 | 3 | 4;
  /** Inclusive "YYYY-MM-DD" bounds of the IRS payment period. */
  fromKey: string;
  toKey: string;
  /** The due date, moved past weekends and federal holidays. */
  dueKey: string;
};

const key = (d: Date) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d));

/** Holidays that can land on a due date: Martin Luther King Jr. Day (third Monday of January) and DC Emancipation Day (Apr 16, observed on the nearest weekday). */
function holidays(year: number): Set<string> {
  const jan1 = utc(year, 1, 1).getUTCDay();
  const mlk = utc(year, 1, 1 + ((8 - jan1) % 7) + 14);
  const apr16 = utc(year, 4, 16);
  const dow = apr16.getUTCDay();
  const emancipation = utc(year, 4, dow === 6 ? 15 : dow === 0 ? 17 : 16);
  return new Set([key(mlk), key(emancipation)]);
}

function nextBusinessDay(y: number, m: number, d: number): string {
  const off = holidays(y);
  const date = utc(y, m, d);
  while (
    date.getUTCDay() === 0 ||
    date.getUTCDay() === 6 ||
    off.has(key(date))
  ) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return key(date);
}

/** The four estimated-tax periods of a year. They are not calendar quarters: 3, 2, 3 and 4 months. */
export function estimatedTaxQuarters(year: number): TaxQuarter[] {
  return [
    {
      quarter: 1,
      fromKey: `${year}-01-01`,
      toKey: `${year}-03-31`,
      dueKey: nextBusinessDay(year, 4, 15),
    },
    {
      quarter: 2,
      fromKey: `${year}-04-01`,
      toKey: `${year}-05-31`,
      dueKey: nextBusinessDay(year, 6, 15),
    },
    {
      quarter: 3,
      fromKey: `${year}-06-01`,
      toKey: `${year}-08-31`,
      dueKey: nextBusinessDay(year, 9, 15),
    },
    {
      quarter: 4,
      fromKey: `${year}-09-01`,
      toKey: `${year}-12-31`,
      dueKey: nextBusinessDay(year + 1, 1, 15),
    },
  ];
}

export type QuarterSetAside = { ytdTaxCents: number; setAsideCents: number };

/**
 * Each quarter sets aside the tax on year-to-date profit through its end,
 * less what earlier quarters already set aside, never below zero. Working
 * from year-to-date totals keeps the wage base, the additional-Medicare
 * threshold and fixed-price jobs right across quarters. `ytdProfitCents[i]`
 * is null for a quarter that hasn't started.
 */
export function setAsideByQuarter(
  ytdProfitCents: Array<number | null>,
  rates: TaxYearRates,
  status: FilingStatus = "single",
): Array<QuarterSetAside | null> {
  const owed = ytdProfitCents.map((profit) =>
    profit === null
      ? null
      : selfEmploymentTax(profit, rates, status).totalCents,
  );
  const due = spreadSetAside(owed);
  return owed.map((ytdTax, i) =>
    ytdTax === null
      ? null
      : { ytdTaxCents: ytdTax, setAsideCents: due[i] ?? 0 },
  );
}

export function hasAgreedToTaxDisclaimer(
  consents: Array<{ disclaimer_version: number }>,
): boolean {
  return consents.some((c) => c.disclaimer_version === TAX_DISCLAIMER_VERSION);
}
