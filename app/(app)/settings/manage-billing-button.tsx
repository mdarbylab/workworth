import { createPortalSession } from "./billing-actions";

export function ManageBillingButton() {
  return (
    <form action={createPortalSession}>
      <button type="submit" className="btn-secondary">Manage billing</button>
    </form>
  );
}
