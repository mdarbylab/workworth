# ADR 0005: Prettier for formatting

- **Status:** Proposed (the owner accepts it by merging the PR that adds it; asked for on 2026-10-16)
- **Date:** 2026-10-16
- **Requirements:** none (process: handbook quality-gates.md, format check)

## Context

The handbook's gate list starts with a format check. WorkWorth had none, so ADR 0004 first listed it as a deviation; the owner then asked for it in the same PR. Adding a formatter is a new dependency and reformats most source files once.

## Options considered

1. **Prettier 3, default settings.** The de facto formatter for TypeScript, CSS, JSON and YAML; MIT licence; one dev dependency with no runtime footprint. Defaults already match the code's style (double quotes, semicolons, trailing commas), so the reformat is mostly line wrapping.
2. **Biome.** Faster, formats and lints, but overlaps ESLint, which `eslint-config-next` needs anyway.
3. **No formatter, rely on review.** Leaves the handbook gate unmet.

## Decision

Option 1. `prettier` pinned exactly at 3.9.9 as a dev dependency, with an empty `.prettierrc.json` (defaults). `.prettierignore` skips generated files (`lib/supabase/types.ts`, `next-env.d.ts`, the lockfile, `.next/`) and Markdown, whose tables and hand-wrapped prose stay as written. `npm run verify` runs `prettier --check .` after the dependency audit; `npm run format` fixes it. No Tailwind class-sorting plugin, to keep this to one dependency.

The one-time reformat is its own commit containing nothing else, listed in `.git-blame-ignore-revs` so `git blame` skips it.

## Consequences

- Style stops being a review topic; CI fails on unformatted code.
- The reformat touches most source files once, so open branches will conflict; the fix is to run `npm run format` after merging `main`.
- No behaviour change: the built CSS was byte-identical before and after the reformat, and the client bundles differed only in minifier-chosen names.
