## Summary

<!-- What changed and why, in a few lines. -->

## Requirements

<!-- IDs from docs/requirements.md, e.g. REQ-019, REQ-021. If none apply, say why (and whether SPEC.md needs updating). -->

## Non-negotiables

<!-- Does this touch one in docs/non-negotiables.md? If so, which, and the test or check that still holds. Otherwise "None". -->

## Verification

<!-- Tests added or changed, commands run, results. Name the test that proves each requirement. Screens checked at 375px and desktop, if UI changed. -->

## Definition of done

- [ ] Traces to requirement IDs
- [ ] Tests written first and passing, including failure paths
- [ ] `npm run verify` green: secret scan, dependency audit, format, types, lint, tests, build
- [ ] UI changes exercised on the real screen (mock server) at 375px and desktop
- [ ] Database changes: migration applied to the live project and committed in this PR; RLS still isolates every org
- [ ] No real customer data, secrets or personal identifiers in the diff (the repository is public)
- [ ] ADR added or updated (or not needed because: ...)
- [ ] SPEC.md, docs and requirement statuses updated
