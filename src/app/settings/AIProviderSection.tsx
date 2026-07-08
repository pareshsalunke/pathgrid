"use client";

import { useState, type ReactNode } from "react";
import { PROVIDERS, PROVIDER_CATALOG, type ProviderId } from "@/lib/ai/catalog";
import { aiRequestHeaders } from "@/lib/ai/headers";
import {
  currentAiConfig,
  modelsFor,
  useAIProvider,
} from "@/lib/stores/ai-provider";
import { useMounted } from "@/lib/hooks/use-mounted";

/**
 * Settings → AI provider (Phase 3, docs/05 §4). BYOK key + model selection, stored
 * only in the browser (localStorage via useAIProvider). "Test key" round-trips through
 * /api/ai/test-key, which forwards the key to the provider and never stores it.
 * Layout follows docs/design/screens/Settings.dc.html.
 */

type Status = "idle" | "checking" | "valid" | "invalid";

export function AIProviderSection() {
  const mounted = useMounted();

  const provider = useAIProvider((s) => s.provider);
  const keys = useAIProvider((s) => s.keys);
  const models = useAIProvider((s) => s.models);
  const setProvider = useAIProvider((s) => s.setProvider);
  const setKey = useAIProvider((s) => s.setKey);
  const setModel = useAIProvider((s) => s.setModel);
  const clearKey = useAIProvider((s) => s.clearKey);

  const [reveal, setReveal] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const meta = PROVIDER_CATALOG[provider];
  const key = keys[provider] ?? "";
  const picks = modelsFor({ models }, provider);

  function resetStatus() {
    setStatus("idle");
    setMessage("");
  }

  function chooseProvider(id: ProviderId) {
    if (id === provider) return;
    setProvider(id);
    setReveal(false);
    resetStatus();
  }

  async function testKey() {
    const config = currentAiConfig(useAIProvider.getState());
    if (!config) {
      setStatus("invalid");
      setMessage("Add your API key first.");
      return;
    }
    setStatus("checking");
    setMessage("");
    try {
      const res = await fetch("/api/ai/test-key", {
        method: "POST",
        headers: aiRequestHeaders(config),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (res.ok && data.ok) {
        setStatus("valid");
        setMessage("");
        return;
      }
      setStatus("invalid");
      if (data.error === "no_provider_key")
        setMessage("Add your API key first.");
      else if (data.error === "ai_disabled")
        setMessage("AI is turned off on this instance.");
      else if (res.status === 401)
        setMessage("Sign in again to test your key.");
      else
        setMessage(
          data.message ?? "Couldn’t verify — check the key and try again.",
        );
    } catch {
      setStatus("invalid");
      setMessage("Couldn’t reach the server. Try again.");
    }
  }

  if (!mounted) {
    return (
      <div className="border-hairline rounded-lg border p-[22px]">
        <span className="font-body-sm text-ink/50 text-[14px]">Loading…</span>
      </div>
    );
  }

  return (
    <div className="border-hairline flex flex-col gap-[22px] rounded-lg border p-6">
      <Field label="Provider">
        <div className="flex flex-wrap gap-2">
          {PROVIDERS.map((id) => {
            const active = id === provider;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => chooseProvider(id)}
                className={
                  active
                    ? "bg-primary text-on-primary font-link rounded-full px-[18px] py-2 text-[15px]"
                    : "border-hairline bg-canvas text-ink hover:bg-surface-soft font-link rounded-full border px-[17px] py-2 text-[15px]"
                }
              >
                {PROVIDER_CATALOG[id].label}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label={`${meta.label} API key`}>
        <div className="flex flex-wrap gap-2">
          <div className="border-hairline bg-canvas focus-within:border-ink focus-within:ring-ink flex min-w-[240px] flex-1 items-center gap-2 rounded-md border pr-3 pl-[14px] focus-within:ring-1">
            <input
              type={reveal ? "text" : "password"}
              value={key}
              placeholder={meta.keyPlaceholder}
              autoComplete="off"
              spellCheck={false}
              aria-label={`${meta.label} API key`}
              onChange={(e) => {
                setKey(provider, e.target.value);
                resetStatus();
              }}
              className="text-ink min-w-0 flex-1 border-0 bg-transparent py-[13px] font-mono text-[14px] tracking-[0.3px] outline-none"
            />
            <button
              type="button"
              title="Show or hide key"
              onClick={() => setReveal((r) => !r)}
              className="text-ink/60 font-mono text-[10px] tracking-[0.4px] uppercase"
            >
              {reveal ? "Hide" : "Show"}
            </button>
          </div>
          <button
            type="button"
            onClick={testKey}
            disabled={status === "checking"}
            className="bg-primary text-on-primary font-link shrink-0 rounded-full px-5 py-3 text-[15px] disabled:opacity-60"
          >
            Test key
          </button>
        </div>
        <StatusRow
          status={status}
          message={message}
          providerLabel={meta.label}
        />
      </Field>

      <div className="flex flex-wrap gap-4">
        <ModelPicker
          key={`${provider}-smart`}
          label="Smart model"
          help="Used for generating and refining maps."
          options={meta.models.smart}
          value={picks.smart}
          onChange={(m) => {
            setModel(provider, "smart", m);
            resetStatus();
          }}
        />
        <ModelPicker
          key={`${provider}-fast`}
          label="Fast model"
          help="Used for the tutor chat and quick edits."
          options={meta.models.fast}
          value={picks.fast}
          onChange={(m) => {
            setModel(provider, "fast", m);
            resetStatus();
          }}
        />
      </div>

      <div className="bg-block-lilac text-ink flex items-start gap-3 rounded-md px-[18px] py-4">
        <ShieldIcon />
        <span className="font-body-sm text-[15px] leading-[1.5]">
          Your key stays in this browser. Pathgrid never sends it to our servers
          — requests go straight from your device to {meta.label}.
        </span>
      </div>

      <div className="border-hairline flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <button
          type="button"
          onClick={() => {
            clearKey(provider);
            resetStatus();
          }}
          className="font-link text-ink border-ink border-b-2 text-[15px]"
        >
          Clear key from this browser
        </button>
        <span className="text-ink/50 font-mono text-[10px] tracking-[0.4px] uppercase">
          Changes save automatically
        </span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[10px]">
      <span className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

function StatusRow({
  status,
  message,
  providerLabel,
}: {
  status: Status;
  message: string;
  providerLabel: string;
}) {
  return (
    <div className="flex min-h-6 items-center" role="status" aria-live="polite">
      {status === "idle" && (
        <span className="text-ink/60 text-[13px]">
          Paste a key, then test it. It’s stored only in this browser.
        </span>
      )}
      {status === "checking" && (
        <span className="text-ink flex items-center gap-2 font-mono text-[11px] tracking-[0.4px] uppercase">
          <Spinner />
          Checking key…
        </span>
      )}
      {status === "valid" && (
        <span className="bg-block-mint text-ink flex items-center gap-2 rounded-full px-3 py-[5px] font-mono text-[11px] tracking-[0.4px] uppercase">
          <CheckIcon />
          Key valid · {providerLabel} reachable
        </span>
      )}
      {status === "invalid" && (
        <span className="bg-block-coral text-ink flex items-center gap-2 rounded-full px-3 py-[5px] font-mono text-[11px] tracking-[0.4px] uppercase">
          <WarnIcon />
          {message || "Couldn’t verify — check the key and try again"}
        </span>
      )}
    </div>
  );
}

function ModelPicker({
  label,
  help,
  options,
  value,
  onChange,
}: {
  label: string;
  help: string;
  options: string[];
  value: string;
  onChange: (model: string) => void;
}) {
  const [custom, setCustom] = useState(
    () => value !== "" && !options.includes(value),
  );

  return (
    <div className="flex min-w-[230px] flex-1 flex-col gap-[10px]">
      <span className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase">
        {label}
      </span>
      {custom ? (
        <input
          type="text"
          value={value}
          placeholder="model-id"
          aria-label={`${label} (custom id)`}
          onChange={(e) => onChange(e.target.value)}
          className="border-hairline bg-canvas text-ink focus:border-ink w-full rounded-md border px-[14px] py-3 font-mono text-[14px] outline-none"
        />
      ) : (
        <div className="relative">
          <select
            aria-label={label}
            value={options.includes(value) ? value : options[0]}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__custom__") setCustom(true);
              else onChange(v);
            }}
            className="border-hairline bg-canvas text-ink focus:border-ink w-full cursor-pointer appearance-none rounded-md border py-3 pr-9 pl-[14px] text-[15px] outline-none"
          >
            {options.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
            <option value="__custom__">Custom…</option>
          </select>
          <ChevronIcon />
        </div>
      )}
      {custom && (
        <button
          type="button"
          onClick={() => {
            setCustom(false);
            onChange(options[0]);
          }}
          className="text-ink/50 self-start font-mono text-[10px] tracking-[0.4px] uppercase"
        >
          Use a listed model
        </button>
      )}
      <span className="text-ink/60 text-[13px]">{help}</span>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-[13px] w-[13px] animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="var(--color-hairline)"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="var(--color-ink)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 6.4 4.7 9 10 3.4"
        stroke="var(--color-success)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 2.8v3.6M6 8.6v.2"
        stroke="var(--color-ink)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="mt-px shrink-0"
    >
      <path
        d="M8 1.5l5 2v3.2c0 3-2.1 5.6-5 6.8-2.9-1.2-5-3.8-5-6.8V3.5l5-2z"
        stroke="var(--color-ink)"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M6 8l1.4 1.4L10.5 6"
        stroke="var(--color-ink)"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 right-[13px] -translate-y-1/2"
    >
      <path
        d="M2 3.5l3 3 3-3"
        stroke="var(--color-ink)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
