"use client";

import { useMemo, useState } from "react";

const MIN_SIZE = 128;
const MAX_SIZE = 1024;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Digits only, disallow leading zero, clamp to range.
 * Returns null when empty (user is deleting).
 */
function parseSizeInput(raw: string): number | null {
  let digits = raw.replace(/\D/g, "");

  if (digits.length === 0) return null;

  // Disallow leading zero (no "0", no "0123")
  if (digits[0] === "0") {
    digits = digits.replace(/^0+/, "");
    if (digits.length === 0) return null;
  }

  const n = Number(digits);
  if (Number.isNaN(n)) return null;

  return clamp(n, MIN_SIZE, MAX_SIZE);
}

export default function Page() {
  const [link, setLink] = useState("");
  const [size, setSize] = useState<number>(320);
  const [sizeText, setSizeText] = useState<string>("320");

  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = useMemo(() => link.trim().length > 0, [link]);

  async function generate() {
    setLoading(true);
    setError(null);
    setDataUrl(null);

    try {
      const res = await fetch(`/api/qrcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link, size }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          payload?.fieldErrors?.link?.[0] ??
          payload?.fieldErrors?.size?.[0] ??
          payload?.issues?.[0]?.message ??
          payload?.message ??
          "Failed to generate QR code";
        throw new Error(msg);
      }

      setDataUrl(payload.dataUrl);
    } catch (e: any) {
      setError(e?.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  function downloadPng() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "qrcode.png";
    a.click();
  }

  return (
    <div className="dark min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            QR Code Generator
          </h1>
          <p className="mt-2 text-zinc-400">
            Paste a URL and generate a PNG QR code.
          </p>
        </header>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-sm">
          <label className="block text-sm font-medium text-zinc-300">URL</label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://example.com"
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600"
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:items-start">
            <div>
              <label className="block text-sm font-medium text-zinc-300">
                Size (px)
              </label>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={sizeText}
                onChange={(e) => {
                  const raw = e.target.value;

                  // Hard block: do not allow a single "0"
                  if (raw === "0") return;

                  const parsed = parseSizeInput(raw);

                  // Keep display digits-only, remove leading zeros
                  const digitsOnly = raw.replace(/\D/g, "");
                  const normalizedText = digitsOnly.replace(/^0+/, "");

                  setSizeText(normalizedText);

                  if (parsed !== null) setSize(parsed);
                }}
                onBlur={() => {
                  const parsed = parseSizeInput(sizeText);
                  const finalValue = parsed ?? 320;
                  setSize(finalValue);
                  setSizeText(String(finalValue));
                }}
                className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                placeholder="320"
                aria-label="QR code size in pixels"
              />

              <p className="mt-2 text-xs text-zinc-500">
                Between {MIN_SIZE} and {MAX_SIZE}. Leading zero is not allowed.
              </p>
            </div>

            <div className="flex gap-3 sm:pt-[1.625rem]">
              <button
                onClick={generate}
                disabled={!canGenerate || loading}
                className="flex-1 rounded-xl bg-zinc-100 px-4 py-3 font-medium text-zinc-950 hover:bg-white disabled:opacity-60"
              >
                {loading ? "Generating..." : "Generate QR Code"}
              </button>

              <button
                onClick={downloadPng}
                disabled={!dataUrl}
                className="shrink-0 rounded-xl border border-zinc-700 px-4 py-3 font-medium text-zinc-100 hover:bg-zinc-800 disabled:opacity-60"
                title="Download PNG"
              >
                Download
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-lg font-semibold">Preview</h2>
          <div className="mt-4 flex min-h-[360px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
            {dataUrl ? (
              <img
                src={dataUrl}
                alt="QR Code preview"
                className="h-auto max-w-[85%] rounded-lg"
              />
            ) : (
              <p className="text-zinc-600">
                Generate a QR code to see it here.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
