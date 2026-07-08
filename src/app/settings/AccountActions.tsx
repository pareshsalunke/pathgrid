"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export function AccountActions() {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function del() {
    setDeleting(true);
    await fetch("/api/account", { method: "DELETE" });
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-link text-[16px]">Sign out</span>
          <span className="font-body-sm text-ink/70 text-[14px]">
            End your session on this browser. Your progress stays saved.
          </span>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="border-hairline bg-canvas font-link text-ink hover:bg-surface-soft shrink-0 rounded-full border px-[18px] py-2 text-[15px]"
        >
          Sign out
        </button>
      </div>

      <span className="bg-hairline h-px" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-[430px] flex-col gap-0.5">
          <span className="font-link text-[16px]">Delete account</span>
          <span className="font-body-sm text-ink/70 text-[14px] leading-[1.5]">
            Permanently removes your account, synced progress and generated
            library. Progress saved on this device is kept. This can&apos;t be
            undone.
          </span>
        </div>
        {confirming ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="border-hairline bg-canvas font-link text-ink hover:bg-surface-soft rounded-full border px-[18px] py-2 text-[15px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={del}
              disabled={deleting}
              className="bg-block-coral font-link text-ink rounded-full px-[18px] py-2 text-[15px] disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="bg-block-coral font-link text-ink shrink-0 rounded-full px-[18px] py-2 text-[15px]"
          >
            Delete account
          </button>
        )}
      </div>
    </div>
  );
}
