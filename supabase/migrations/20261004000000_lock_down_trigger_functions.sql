-- A trigger function can only ever run as a trigger — Postgres refuses to
-- call one any other way ("trigger functions can only be called as
-- triggers"), regardless of grants. But Postgres grants EXECUTE to PUBLIC by
-- default on function creation, so PostgREST still listed five of them on
-- the public RPC surface (/rest/v1/rpc/<name>), where calling any of them
-- just 400s. Not an exploitable hole — confirmed directly against this
-- project's guard_membership_update before writing this — but unnecessary
-- surface area the gap list called out.
--
-- write_audit_event already has no anon/authenticated/public grant and has
-- been working correctly in production since it was added; this brings its
-- four siblings in line with it. Revoking EXECUTE doesn't affect the
-- triggers themselves — a trigger fires under the privileges of the DML
-- that caused it, not the invoking role's EXECUTE grant on the function.

revoke execute on function public.guard_membership_update() from public, anon, authenticated;
revoke execute on function public.enforce_invite_limit() from public, anon, authenticated;
revoke execute on function public.enforce_seat_limit() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.time_entries_set_duration() from public, anon, authenticated;
