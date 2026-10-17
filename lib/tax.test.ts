import { describe, expect, it } from "vitest";
import {
  TAX_DISCLAIMER_VERSION,
  bracketTax,
  estimatedTaxQuarters,
  federalIncomeTax,
  incomeTaxToDate,
  spreadSetAside,
  yearFraction,
  type TaxBracket,
  hasAgreedToTaxDisclaimer,
  selfEmploymentTax,
  setAsideByQuarter,
  type TaxYearRates,
} from "./tax";

// 2026 figures, as seeded by supabase/migrations/20261017000000_tax_estimates.sql.
const RATES_2026: TaxYearRates = {
  tax_year: 2026,
  se_earnings_factor_bp: 9235,
  social_security_rate_bp: 1240,
  social_security_wage_base_cents: 18_450_000,
  medicare_rate_bp: 290,
  additional_medicare_rate_bp: 90,
  additional_medicare_threshold_single_cents: 20_000_000,
  additional_medicare_threshold_joint_cents: 25_000_000,
  additional_medicare_threshold_separate_cents: 12_500_000,
  standard_deduction_single_cents: 1_610_000,
  standard_deduction_joint_cents: 3_220_000,
  standard_deduction_separate_cents: 1_610_000,
  standard_deduction_head_cents: 2_415_000,
};

// 2026 brackets, as seeded by supabase/migrations/20261017010000_federal_income_tax.sql.
const ladder = (
  filing_status: TaxBracket["filing_status"],
  tops: number[],
): TaxBracket[] =>
  [0, ...tops].map((lower, i) => ({
    filing_status,
    lower_cents: lower * 100,
    rate_bp: [1000, 1200, 2200, 2400, 3200, 3500, 3700][i],
  }));
const BRACKETS_2026: TaxBracket[] = [
  ...ladder("single", [12_400, 50_400, 105_700, 201_775, 256_225, 640_600]),
  ...ladder("joint", [24_800, 100_800, 211_400, 403_550, 512_450, 768_700]),
  ...ladder("separate", [12_400, 50_400, 105_700, 201_775, 256_225, 384_350]),
  ...ladder("head", [17_700, 67_450, 105_700, 201_750, 256_200, 640_600]),
];

describe("selfEmploymentTax", () => {
  it("is 15.3% of 92.35% of profit below the wage base", () => {
    expect(selfEmploymentTax(5_000_000, RATES_2026)).toEqual({
      earningsCents: 4_617_500,
      socialSecurityCents: 572_570,
      medicareCents: 133_908,
      additionalMedicareCents: 0,
      totalCents: 706_478,
    });
  });

  it("caps Social Security at the wage base and adds 0.9% Medicare above the threshold", () => {
    expect(selfEmploymentTax(30_000_000, RATES_2026)).toEqual({
      earningsCents: 27_705_000,
      socialSecurityCents: 2_287_800,
      medicareCents: 803_445,
      additionalMedicareCents: 69_345,
      totalCents: 3_160_590,
    });
  });

  it("uses the threshold for the filing status asked for", () => {
    const joint = selfEmploymentTax(30_000_000, RATES_2026, "joint");
    expect(joint.additionalMedicareCents).toBe(24_345);
    const separate = selfEmploymentTax(30_000_000, RATES_2026, "separate");
    expect(separate.additionalMedicareCents).toBe(136_845);
  });

  it("owes nothing under $400 of net earnings, or on a loss", () => {
    expect(selfEmploymentTax(43_000, RATES_2026).totalCents).toBe(0);
    expect(selfEmploymentTax(-100_000, RATES_2026).totalCents).toBe(0);
    expect(selfEmploymentTax(44_000, RATES_2026).totalCents).toBeGreaterThan(0);
  });
});

describe("estimatedTaxQuarters", () => {
  it("covers the year in the IRS's uneven periods, due Apr 15, Jun 15, Sep 15 and Jan 15", () => {
    expect(estimatedTaxQuarters(2026)).toEqual([
      {
        quarter: 1,
        fromKey: "2026-01-01",
        toKey: "2026-03-31",
        dueKey: "2026-04-15",
      },
      {
        quarter: 2,
        fromKey: "2026-04-01",
        toKey: "2026-05-31",
        dueKey: "2026-06-15",
      },
      {
        quarter: 3,
        fromKey: "2026-06-01",
        toKey: "2026-08-31",
        dueKey: "2026-09-15",
      },
      {
        quarter: 4,
        fromKey: "2026-09-01",
        toKey: "2026-12-31",
        dueKey: "2027-01-15",
      },
    ]);
  });

  it("moves a due date off a weekend or a federal holiday", () => {
    // Apr 15, 2022 was Emancipation Day observed (a Friday).
    expect(estimatedTaxQuarters(2022)[0].dueKey).toBe("2022-04-18");
    // Apr 15, 2023 was a Saturday and Monday Apr 17 was Emancipation Day observed.
    expect(estimatedTaxQuarters(2023)[0].dueKey).toBe("2023-04-18");
    // Jan 15, 2024 was Martin Luther King Jr. Day.
    expect(estimatedTaxQuarters(2023)[3].dueKey).toBe("2024-01-16");
    // Jun 15, 2025 was a Sunday.
    expect(estimatedTaxQuarters(2025)[1].dueKey).toBe("2025-06-16");
  });
});

describe("setAsideByQuarter", () => {
  it("sets aside each quarter's share of the year-to-date tax", () => {
    const q = setAsideByQuarter([2_000_000, 3_500_000, null, null], RATES_2026);
    expect(q[0]).toEqual({ ytdTaxCents: 282_591, setAsideCents: 282_591 });
    expect(q[1]).toEqual({ ytdTaxCents: 494_534, setAsideCents: 211_943 });
    expect(q[2]).toBeNull();
    expect(q[3]).toBeNull();
  });

  it("never asks for a negative amount after a losing quarter, and catches up later", () => {
    const q = setAsideByQuarter(
      [2_000_000, 1_000_000, 2_500_000, null],
      RATES_2026,
    );
    expect(q[1]?.setAsideCents).toBe(0);
    // Q3 owes only what the year-to-date tax exceeds Q1's set-aside by.
    expect(q[2]?.setAsideCents).toBe(353_239 - 282_591);
  });

  it("totals the year's tax across the quarters, wage base included", () => {
    const q = setAsideByQuarter(
      [8_000_000, 15_000_000, 22_000_000, 30_000_000],
      RATES_2026,
    );
    const total = q.reduce((s, x) => s + (x?.setAsideCents ?? 0), 0);
    expect(total).toBe(selfEmploymentTax(30_000_000, RATES_2026).totalCents);
  });
});

describe("hasAgreedToTaxDisclaimer", () => {
  it("is true only for an agreement to the current wording", () => {
    expect(hasAgreedToTaxDisclaimer([])).toBe(false);
    expect(
      hasAgreedToTaxDisclaimer([
        { disclaimer_version: TAX_DISCLAIMER_VERSION - 1 },
      ]),
    ).toBe(false);
    expect(
      hasAgreedToTaxDisclaimer([
        { disclaimer_version: TAX_DISCLAIMER_VERSION },
      ]),
    ).toBe(true);
  });
});

describe("bracketTax", () => {
  it("taxes each slice of income at its own rate", () => {
    const single = BRACKETS_2026.filter((b) => b.filing_status === "single");
    expect(bracketTax(0, single)).toBe(0);
    expect(bracketTax(1_000_000, single)).toBe(100_000);
    // 10% of 12,400 + 12% of 38,000 + 22% of 7,848.18
    expect(bracketTax(5_824_818, single)).toBe(752_660);
    // Every slice up to the top rate.
    expect(bracketTax(100_000_000, single)).toBe(32_595_725);
  });
});

describe("federalIncomeTax", () => {
  it("taxes profit less half the self-employment tax and the standard deduction", () => {
    expect(
      federalIncomeTax(8_000_000, RATES_2026, BRACKETS_2026, "single"),
    ).toEqual({
      seDeductionCents: 565_182,
      standardDeductionCents: 1_610_000,
      taxableCents: 5_824_818,
      taxCents: 752_660,
    });
  });

  it("uses the filing status's brackets and deduction", () => {
    expect(
      federalIncomeTax(8_000_000, RATES_2026, BRACKETS_2026, "joint").taxCents,
    ).toBe(456_178);
    expect(
      federalIncomeTax(8_000_000, RATES_2026, BRACKETS_2026, "head").taxCents,
    ).toBe(566_978);
  });

  it("owes nothing when the deductions cover the profit, or on a loss", () => {
    expect(
      federalIncomeTax(1_000_000, RATES_2026, BRACKETS_2026, "single"),
    ).toMatchObject({ taxableCents: 0, taxCents: 0 });
    expect(
      federalIncomeTax(-500_000, RATES_2026, BRACKETS_2026, "single").taxCents,
    ).toBe(0);
  });
});

describe("yearFraction", () => {
  it("is the share of the year through the end of the given day", () => {
    expect(yearFraction("2026-03-31")).toBeCloseTo(90 / 365);
    expect(yearFraction("2026-12-31")).toBe(1);
    expect(yearFraction("2028-12-31")).toBe(1); // leap year
    expect(yearFraction("2028-01-01")).toBeCloseTo(1 / 366);
  });
});

describe("incomeTaxToDate", () => {
  it("is the year's tax at this pace, times the share of the year gone", () => {
    const f = 90 / 365;
    const annual = federalIncomeTax(
      Math.round(2_000_000 / f),
      RATES_2026,
      BRACKETS_2026,
      "single",
    ).taxCents;
    expect(
      incomeTaxToDate(2_000_000, f, RATES_2026, BRACKETS_2026, "single"),
    ).toBe(Math.round(annual * f));
  });

  it("is the full year's tax once the year is over", () => {
    expect(
      incomeTaxToDate(8_000_000, 1, RATES_2026, BRACKETS_2026, "single"),
    ).toBe(752_660);
  });

  it("asks for more early on than taxing the profit so far as if it were the whole year", () => {
    const f = 90 / 365;
    expect(
      incomeTaxToDate(2_000_000, f, RATES_2026, BRACKETS_2026, "single"),
    ).toBeGreaterThan(
      federalIncomeTax(2_000_000, RATES_2026, BRACKETS_2026, "single").taxCents,
    );
  });
});

describe("spreadSetAside", () => {
  it("turns tax owed to date into per-period amounts, never negative", () => {
    expect(spreadSetAside([100, 250, 200, null])).toEqual([100, 150, 0, null]);
    expect(spreadSetAside([100, 80, 300, 300])).toEqual([100, 0, 200, 0]);
  });
});
