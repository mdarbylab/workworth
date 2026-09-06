"use client";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  label: string;
  message: string;
};

/** A delete form that asks for confirmation before submitting. */
export function ConfirmDelete({ action, id, label, message }: Props) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="w-full py-2 text-sm text-red-700 hover:underline">
        {label}
      </button>
    </form>
  );
}
