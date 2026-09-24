import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/session";
import { resolvePeriod } from "@/lib/periods";
import { buildStatement } from "@/lib/statement";
import { formatCents, formatDuration } from "@/lib/calc";
import { formatDocDate, formatDocShortDate } from "@/lib/dates";
import { StatementControls } from "./statement-controls";
import { TrackOnMount } from "@/components/analytics";

export const metadata: Metadata = { title: "Client report" };

const hours = (seconds: number) => (seconds / 3600).toFixed(2);

/**
 * The in-app period labels ("This week", "Sep 1 – Sep 30") lean on the reader
 * knowing when they looked. A document that leaves the business cannot, so it
 * spells the dates out in full.
 */
const periodLine = (fromKey: string, toKey: string, tz: string) =>
  fromKey === toKey
    ? formatDocDate(fromKey, tz)
    : `${formatDocDate(fromKey, tz)} – ${formatDocDate(toKey, tz)}`;

export default async function StatementPage({
  searchParams,
}: PageProps<"/reports/statement">) {
  const params = await searchParams;
  const ctx = await getSessionContext();
  if (!ctx?.organization) redirect("/onboarding");

  const clientId = typeof params.client === "string" ? params.client : "";
  if (!clientId) redirect("/reports");

  const period = resolvePeriod(params, ctx.organization.timezone);
  const statement = await buildStatement(clientId, period);
  if (!statement) redirect("/reports");

  // Money is on unless explicitly switched off, so the common case is one click.
  const showMoney = params.money !== "0";
  const { organization: org, client } = statement;
  const title = showMoney ? "Work summary" : "Timesheet";

  return (
    <div className="statement">
      <TrackOnMount
        event="client_report_viewed"
        props={{ period: period.key, money: showMoney }}
      />
      <Suspense>
        <StatementControls showMoney={showMoney} />
      </Suspense>

      <article className="sheet">
        <header className="sheet-head">
          <div>
            <p className="biz-name">{org.name}</p>
            {org.address && <p className="biz-line">{org.address}</p>}
            {(org.contact_phone || org.contact_email) && (
              <p className="biz-line">
                {[org.contact_phone, org.contact_email]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          <div className="sheet-meta">
            <p className="doc-title">{title}</p>
            <p className="biz-line">
              {periodLine(period.fromKey, period.toKey, org.timezone)}
            </p>
          </div>
        </header>

        <div className="sheet-for">
          <p className="label-sm">Prepared for</p>
          <p className="client-name">{client.name}</p>
          {(client.email || client.phone) && (
            <p className="biz-line">
              {[client.phone, client.email].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {statement.jobs.length === 0 ? (
          <p className="empty">
            No time was tracked for {client.name} in this period. Pick a
            different period on the <Link href="/reports">Reports</Link> screen.
          </p>
        ) : (
          <>
            {statement.jobs.map((job) => (
              <section key={job.id} className="job">
                <div className="job-head">
                  <h2>{job.name}</h2>
                  {showMoney && (
                    <span className="job-rate">
                      {job.billingType === "hourly"
                        ? job.hourlyRateCents !== null
                          ? `${formatCents(job.hourlyRateCents)} per hour`
                          : "Rate not set"
                        : job.fixedPriceCents !== null
                          ? "Fixed price"
                          : "Price not set"}
                    </span>
                  )}
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th className="c-date">Date</th>
                        <th className="c-work">Work done</th>
                        <th className="c-num">Hours</th>
                        {showMoney && job.billingType === "hourly" && (
                          <th className="c-num">Amount</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {job.lines.map((line) => (
                        <tr key={line.id}>
                          <td className="c-date">
                            {formatDocShortDate(line.dayKey, org.timezone)}
                          </td>
                          <td className="c-work">{line.notes || "—"}</td>
                          <td className="c-num">{hours(line.seconds)}</td>
                          {showMoney && job.billingType === "hourly" && (
                            <td className="c-num">
                              {job.hourlyRateCents !== null
                                ? formatCents(
                                    Math.round(
                                      (line.seconds / 3600) *
                                        job.hourlyRateCents,
                                    ),
                                  )
                                : "—"}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="c-date">Subtotal</td>
                        <td className="c-work">
                          {formatDuration(job.seconds)}
                        </td>
                        <td className="c-num">{hours(job.seconds)}</td>
                        {showMoney && job.billingType === "hourly" && (
                          <td className="c-num">
                            {job.amountCents !== null
                              ? formatCents(job.amountCents)
                              : "—"}
                          </td>
                        )}
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {showMoney && job.billingType === "fixed" && (
                  <p className="fixed-note">
                    Agreed fixed price:{" "}
                    <strong>
                      {job.fixedPriceCents !== null
                        ? formatCents(job.fixedPriceCents)
                        : "not set"}
                    </strong>
                    . Hours are shown for your records and do not change the
                    price.
                  </p>
                )}
              </section>
            ))}

            <section className="totals">
              <div className="total-row">
                <span>Total hours</span>
                <span className="num">{hours(statement.totalSeconds)}</span>
              </div>
              {showMoney && (
                <div className="total-row grand">
                  <span>Total</span>
                  <span className="num">
                    {statement.totalAmountCents !== null
                      ? formatCents(statement.totalAmountCents)
                      : "—"}
                  </span>
                </div>
              )}
            </section>

            {showMoney && statement.hasUnpricedWork && (
              <p className="warn no-print">
                Some work above has no rate or price set, so it is missing from
                the total. Set it on the job before sending this.
              </p>
            )}

            <section className="sign">
              <div>
                <div className="rule" />
                <p className="label-sm">Approved by</p>
              </div>
              <div>
                <div className="rule" />
                <p className="label-sm">Date</p>
              </div>
            </section>
          </>
        )}

        <footer className="sheet-foot">
          <p>
            Hours recorded with WorkWorth. Times shown in{" "}
            {org.timezone.replace(/_/g, " ")}.
            {showMoney &&
              " Amounts are for the work listed and exclude any tax."}
          </p>
        </footer>
      </article>
    </div>
  );
}
