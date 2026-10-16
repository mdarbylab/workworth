import { describe, expect, it } from "vitest";
import {
  MAX_RECEIPT_BYTES,
  checkReceipt,
  receiptFromForm,
  receiptPath,
} from "./receipts";

describe("checkReceipt", () => {
  it("accepts photos and PDFs up to the limit", () => {
    expect(checkReceipt({ type: "image/jpeg", size: 1000 })).toEqual({
      ok: true,
      extension: "jpg",
    });
    expect(checkReceipt({ type: "image/heic", size: 1000 })).toEqual({
      ok: true,
      extension: "heic",
    });
    expect(
      checkReceipt({ type: "application/pdf", size: MAX_RECEIPT_BYTES }),
    ).toEqual({ ok: true, extension: "pdf" });
  });

  it("refuses anything over 4 MB", () => {
    expect(
      checkReceipt({ type: "image/png", size: MAX_RECEIPT_BYTES + 1 }).ok,
    ).toBe(false);
  });

  it("refuses other file types, including ones a browser could render", () => {
    expect(checkReceipt({ type: "text/html", size: 10 }).ok).toBe(false);
    expect(checkReceipt({ type: "image/svg+xml", size: 10 }).ok).toBe(false);
    expect(checkReceipt({ type: "", size: 10 }).ok).toBe(false);
  });
});

describe("receiptPath", () => {
  it("puts the org first and the expense second, which the storage policies key on", () => {
    expect(receiptPath("org-1", "exp-1", "pdf", "abcd1234")).toBe(
      "org-1/exp-1/receipt-abcd1234.pdf",
    );
  });
});

describe("receiptFromForm", () => {
  it("ignores an empty file input", () => {
    const fd = new FormData();
    fd.set("receipt", new File([], ""));
    expect(receiptFromForm(fd)).toBeNull();
    expect(receiptFromForm(new FormData())).toBeNull();
  });

  it("returns a picked file", () => {
    const fd = new FormData();
    fd.set("receipt", new File(["x"], "r.jpg", { type: "image/jpeg" }));
    expect(receiptFromForm(fd)?.name).toBe("r.jpg");
  });
});
