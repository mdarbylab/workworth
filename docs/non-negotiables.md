# Non-negotiables

The features and attributes that define WorkWorth. If a change would break one, we do not build the change. Only the owner adds, changes or removes one, and it takes an ADR that supersedes the entry. A violation that reaches `main` is a Major audit finding.

**Status: none binding yet.** The candidates below were drawn from SPEC.md on 2026-10-16 (ADR 0004) for the owner to approve, change or drop. Until the owner moves one into the binding table, treat it as the spec treats it, not as a non-negotiable.

| ID | Non-negotiable | Why it defines the product | Requirements | Verified by |
|---|---|---|---|---|

## Candidates (not binding yet)

| ID | Candidate | Why it would define the product | Requirements | Verified by |
|---|---|---|---|---|
| NN-01 | **No business can see another business's data.** | The product holds people's earnings; one leak ends it. | REQ-023, REQ-038, REQ-039 | Inspection (ADR 0002); cross-tenant test suite **(planned)** with SL-06 |
| NN-02 | **Nothing is silently overwritten.** Edits to time and expenses keep the original visible; a sent invoice is never changed, only voided and replaced. | SPEC §8.4 calls this "the trust feature". | REQ-020, REQ-035 | Inspection |
| NN-03 | **The numbers are right.** Money in integer cents; revenue, profit and effective rate match a hand calculation; stored time is never rounded. | The promise is "what you actually made". | REQ-028, REQ-031, REQ-033, REQ-034 | `lib/calc.test.ts` |
| NN-04 | **What leaves the business shows only the client's numbers.** The client report and invoices never show expenses, profit or effective rate. | A business must be able to hand the document over without thinking. | REQ-018 | Inspection |
| NN-05 | **Free forever for two people.** No trial, no time limit. | It is the locked offer in SPEC §1. | REQ-001 | Inspection |
| NN-06 | **WorkWorth records and estimates; it never acts for the business.** It takes no payments from a business's clients and files nothing; tax figures are labelled estimates behind a consent gate. | Trust in a tool that touches earnings and taxes. | REQ-020, REQ-048 | Inspection |
| NN-07 | **Minimal personal data, and people are shown by name, never by email.** | SPEC §11: no selling or sharing of user data. | REQ-027, REQ-041 | Inspection |

## Deliberately negotiable

Prices, the seat cap on Pro, which features sit behind Pro, the analytics provider, and the visual design (within the brand rules in `CLAUDE.md`).
