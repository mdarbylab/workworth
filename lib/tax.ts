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
};

/** The columns to select from `tax_years` to get a TaxYearRates. */
export const TAX_YEAR_COLUMNS =
  "tax_year, se_earnings_factor_bp, social_security_rate_bp, social_security_wage_base_cents, medicare_rate_bp, additional_medicare_rate_bp, additional_medicare_threshold_single_cents, additional_medicare_threshold_joint_cents, additional_medicare_threshold_separate_cents";

/** Filing status arrives with federal income tax (SL-03); until then, single. */
export type FilingStatus = "single" | "joint" | "separate";

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
  const threshold = {
    single: rates.additional_medicare_threshold_single_cents,
    joint: rates.additional_medicare_threshold_joint_cents,
    separate: rates.additional_medicare_threshold_separate_cents,
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
  let setAside = 0;
  return ytdProfitCents.map((profit) => {
    if (profit === null) return null;
    const ytdTax = selfEmploymentTax(profit, rates, status).totalCents;
    const due = Math.max(0, ytdTax - setAside);
    setAside += due;
    return { ytdTaxCents: ytdTax, setAsideCents: due };
  });
}

export function hasAgreedToTaxDisclaimer(
  consents: Array<{ disclaimer_version: number }>,
): boolean {
  return consents.some((c) => c.disclaimer_version === TAX_DISCLAIMER_VERSION);
}
