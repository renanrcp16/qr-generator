"use client";

import { useMemo, useState } from "react";

/**
 * Size constraints for the generated QR code (in pixels).
 * These values should match the backend validation rules.
 */
const MIN_SIZE = 128;
const MAX_SIZE = 1024;

/**
 * Clamp a number to a given range [min, max].
 * Example: clamp(2000, 128, 1024) -> 1024
 */
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Parse the size input:
 * - Allow digits only
 * - Disallow leading zero
 * - Clamp to MIN_SIZE..MAX_SIZE
 *
 * Returns:
 * - a number when there is a valid numeric input
 * - null when the input is empty (user is deleting the value)
 */
function parseSizeInput(raw: string): number | null {
  // Strip any non-digit characters (e.g. "320px" -> "320")
  let digits = raw.replace(/\D/g, "");

  // If the input becomes empty, treat as "no value" while typing
  if (digits.length === 0) return null;

  // Disallow leading zeros:
  // - Prevent a single "0"
  // - Prevent "0123" by trimming leading zeros
  if (digits[0] === "0") {
    digits = digits.replace(/^0+/, "");
    if (digits.length === 0) return null;
  }

  // Convert to number and validate conversion
  const n = Number(digits);
  if (Number.isNaN(n)) return null;

  // Enforce allowed range
  return clamp(n, MIN_SIZE, MAX_SIZE);
}

export default function Page() {
  /**
   * `link` is the user-provided URL that will be encoded into the QR code.
   */
  const [link, setLink] = useState("");

  /**
   * `size` is the numeric value we send to the API (always a number).
   * Default is 320px.
   */
  const [size, setSize] = useState<number>(320);

  /**
   * `sizeText` is what the user sees/edits in the input field.
   * We keep it separate from `size` to allow intermediate states
   * (like empty string while the user is deleting).
   */
  const [sizeText, setSizeText] = useState<string>("320");

  /**
   * The backend returns a PNG as a Data URL (base64).
   * Example: "data:image/png;base64,iVBORw0KGgoAAA..."
   */
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  /**
   * UI state flags for request status and error messaging.
   */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Enable the Generate button only when the user typed something.
   * (Final validation still happens on the backend via Zod.)
   */
  const canGenerate = useMemo(() => link.trim().length > 0, [link]);

  /**
   * Calls the Next.js API route to generate a QR code.
   * - Resets previous preview + error
   * - Sends { link, size } in JSON
   * - Handles success + validation errors coming from the API
   */
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

      // If the response isn't valid JSON, fallback to an empty object
      const payload = await res.json().catch(() => ({}));

      // If request failed, attempt to surface the most helpful error message:
      // - fieldErrors (Zod flatten) for link/size
      // - issues (Zod issues array)
      // - generic message
      if (!res.ok) {
        const msg =
          payload?.fieldErrors?.link?.[0] ??
          payload?.fieldErrors?.size?.[0] ??
          payload?.issues?.[0]?.message ??
          payload?.message ??
          "Failed to generate QR code";
        throw new Error(msg);
      }

      // On success, we receive { dataUrl }
      setDataUrl(payload.dataUrl);
    } catch (e: any) {
      setError(e?.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Downloads the generated QR code as a PNG using a temporary <a> element.
   */
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
        {/* Page header */}
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            QR Code Generator
          </h1>
          <p className="mt-2 text-zinc-400">
            Paste a URL and generate a PNG QR code.
          </p>
        </header>

        {/* Main form card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-sm">
          {/* URL input */}
          <label className="block text-sm font-medium text-zinc-300">URL</label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://example.com"
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600"
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:items-start">
            <div>
              {/* Size input */}
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
                  // (This prevents a common "stuck at 0" UX issue.)
                  if (raw === "0") return;

                  // Parse and clamp the numeric value (or null if empty)
                  const parsed = parseSizeInput(raw);

                  // Keep UI display digits-only and remove leading zeros
                  const digitsOnly = raw.replace(/\D/g, "");
                  const normalizedText = digitsOnly.replace(/^0+/, "");

                  // Update the visible text exactly as the user expects
                  setSizeText(normalizedText);

                  // Only update the numeric `size` if we have a real value
                  if (parsed !== null) setSize(parsed);
                }}
                onBlur={() => {
                  // When the user leaves the field, normalize to a valid final number.
                  // If empty/invalid, fall back to default 320.
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

            {/* Actions */}
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

          {/* Error box */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>

        {/* Preview card */}
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
