"use client";

import { useState } from "react";

export function IssueCredentialForm({
  apiClientId,
}: {
  apiClientId: string;
}) {
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function issueCredential(formData: FormData) {
    setPending(true);
    setError(null);
    setPlaintext(null);

    try {
      const response = await fetch(
        `/api/settings/api/clients/${apiClientId}/credentials`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: String(formData.get("name") ?? ""),
            expiresAt: String(formData.get("expiresAt") ?? "") || null,
          }),
        },
      );

      const result = (await response.json()) as {
        plaintext?: string;
        error?: string;
      };

      if (!response.ok || !result.plaintext) {
        throw new Error(result.error ?? "Unable to issue API key.");
      }

      setPlaintext(result.plaintext);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to issue API key.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-5">
      <form
        action={issueCredential}
        className="grid gap-3 md:grid-cols-3"
      >
        <input
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"
          name="name"
          placeholder="Credential name"
          required
        />
        <input
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"
          name="expiresAt"
          type="datetime-local"
        />
        <button
          className="rounded-xl bg-blue-700 px-4 py-2.5 font-black text-white disabled:opacity-60"
          disabled={pending}
        >
          {pending ? "Issuing…" : "Issue API key"}
        </button>
      </form>

      {plaintext ? (
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-black text-amber-900">
            Copy this key now. It cannot be displayed again.
          </p>
          <code className="mt-3 block overflow-x-auto rounded-xl bg-white p-3 text-sm">
            {plaintext}
          </code>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
