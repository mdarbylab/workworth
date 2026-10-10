import { describe, expect, it } from "vitest";
import { deriveInvoiceLines, formatInvoiceNumber } from "./invoices";
import type { Statement, StatementJob, StatementLine } from "./statement";

function line(overrides: Partial<StatementLine> = {}): StatementLine {
  return { id: "line-1", dayKey: "2026-10-01", seconds: 3_600, notes: null, invoicedInvoiceId: null, ...overrides };
}

function job(overrides: Partial<StatementJob> = {}): StatementJob {
  return {
    id: "job-1",
    name: "Kitchen Remodel",
    billingType: "hourly",
    hourlyRateCents: 7_500,
    fixedPriceCents: null,
    lines: [line()],
    seconds: 3_600,
    billableSeconds: 3_600,
    amountCents: 7_500,
    ...overrides,
  };
}

function statement(jobs: StatementJob[]): Statement {
  return {
    organization: {} as Statement["organization"],
    client: { id: "client-1", name: "Rivera Electric", email: null, phone: null },
    period: { key: "month", label: "October 2026", from: new Date(), to: new Date(), fromKey: "2026-10-01", toKey: "2026-10-31" },
    jobs,
    totalSeconds: jobs.reduce((s, j) => s + j.seconds, 0),
    totalAmountCents: jobs.reduce((s, j) => s + (j.amountCents ?? 0), 0),
    hasUnpricedWork: jobs.some((j) => j.amountCents === null),
  };
}

describe("deriveInvoiceLines", () => {
  it("bills an hourly job's full tracked time when nothing is already invoiced", () => {
    const result = deriveInvoiceLines(statement([job()]));
    expect(result.lines).toEqual([
      { jobId: "job-1", description: "Kitchen Remodel", quantity: 1, unitCents: 7_500, totalCents: 7_500 },
    ]);
    expect(result.includedEntryIds).toEqual(["line-1"]);
    expect(result.excludedAlreadyInvoicedEntryIds).toEqual([]);
  });

  it("bills only the not-yet-invoiced hours on an hourly job", () => {
    const j = job({
      lines: [
        line({ id: "a", seconds: 3_600, invoicedInvoiceId: "inv-old" }),
        line({ id: "b", seconds: 1_800 }),
      ],
      seconds: 5_400,
    });
    const result = deriveInvoiceLines(statement([j]));
    expect(result.lines).toEqual([
      { jobId: "job-1", description: "Kitchen Remodel", quantity: 0.5, unitCents: 7_500, totalCents: 3_750 },
    ]);
    expect(result.includedEntryIds).toEqual(["b"]);
    expect(result.excludedAlreadyInvoicedEntryIds).toEqual(["a"]);
  });

  it("skips an hourly job entirely once every entry is already invoiced", () => {
    const j = job({ lines: [line({ invoicedInvoiceId: "inv-old" })] });
    const result = deriveInvoiceLines(statement([j]));
    expect(result.lines).toEqual([]);
    expect(result.excludedAlreadyInvoicedEntryIds).toEqual(["line-1"]);
  });

  it("bills a fixed-price job once, regardless of hours", () => {
    const j = job({
      billingType: "fixed",
      hourlyRateCents: null,
      fixedPriceCents: 120_000,
      lines: [line({ id: "a", seconds: 1_000 }), line({ id: "b", seconds: 2_000 })],
      amountCents: 120_000,
    });
    const result = deriveInvoiceLines(statement([j]));
    expect(result.lines).toEqual([
      { jobId: "job-1", description: "Kitchen Remodel (fixed price)", quantity: 1, unitCents: 120_000, totalCents: 120_000 },
    ]);
    expect(result.includedEntryIds).toEqual(["a", "b"]);
  });

  it("skips a fixed-price job entirely if any of its hours were already invoiced", () => {
    const j = job({
      billingType: "fixed",
      hourlyRateCents: null,
      fixedPriceCents: 120_000,
      lines: [line({ id: "a", invoicedInvoiceId: "inv-old" }), line({ id: "b" })],
      amountCents: 120_000,
    });
    const result = deriveInvoiceLines(statement([j]));
    expect(result.lines).toEqual([]);
    expect(result.includedEntryIds).toEqual([]);
    expect(result.excludedAlreadyInvoicedEntryIds).toEqual(["a"]);
  });

  it("skips an unpriced job without crashing, and surfaces hasUnpricedWork", () => {
    const j = job({ hourlyRateCents: null, amountCents: null });
    const result = deriveInvoiceLines(statement([j]));
    expect(result.lines).toEqual([]);
    expect(result.hasUnpricedWork).toBe(true);
  });

  it("produces one line per job across multiple jobs", () => {
    const a = job({ id: "job-a", name: "Job A", lines: [line({ id: "a1" })] });
    const b = job({ id: "job-b", name: "Job B", lines: [line({ id: "b1", seconds: 7_200 })], seconds: 7_200, amountCents: 15_000 });
    const result = deriveInvoiceLines(statement([a, b]));
    expect(result.lines.map((l) => l.description)).toEqual(["Job A", "Job B"]);
  });
});

describe("formatInvoiceNumber", () => {
  it("pads to four digits", () => {
    expect(formatInvoiceNumber(1)).toBe("INV-0001");
    expect(formatInvoiceNumber(42)).toBe("INV-0042");
  });

  it("doesn't truncate once past four digits", () => {
    expect(formatInvoiceNumber(12_345)).toBe("INV-12345");
  });
});
