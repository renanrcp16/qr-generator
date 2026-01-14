import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";

/**
 * Convert a ZodError into a consistent JSON response shape for the frontend.
 *
 * Why:
 * - Zod provides rich error objects, but they are not always frontend-friendly.
 * - We return both:
 *   - `issues`: a detailed list (path + message + code)
 *   - `fieldErrors`: a flattened map of field -> array of messages (easy to show in UI)
 */
function zodErrorToResponse(error: z.ZodError) {
  return {
    message: "Validation error",
    issues: error.issues.map((i) => ({
      // Example path: ["link"] -> "link"
      // Example nested path: ["user", "email"] -> "user.email"
      path: i.path.join("."),
      message: i.message,
      code: i.code,
    })),
    // fieldErrors example:
    // { link: ["Please provide a valid URL..."], size: ["Minimum size is 128"] }
    fieldErrors: error.flatten().fieldErrors,
  };
}

/**
 * Request body validation schema.
 *
 * IMPORTANT:
 * This schema is shared "contract" between the UI and API.
 * The frontend can do some UX checks, but the backend is the source of truth.
 *
 * Rules:
 * - link: required, must be a valid URL
 * - size: optional, coerced to number, must be an integer between 128 and 1024
 */
const bodySchema = z.object({
  link: z
    .string()
    .trim()
    .url("Please provide a valid URL (e.g., https://example.com)"),

  size: z.coerce
    .number("Size must be a number")
    .int("Size must be an integer")
    .min(128, { error: ({ minimum }) => `Minimum size is ${minimum}` })
    .max(1024, { error: ({ maximum }) => `Maximum size is ${maximum}` })
    .optional(),
});

/**
 * POST /api/qrcode
 *
 * Input:  { link: string, size?: number }
 * Output: { dataUrl: string } where dataUrl is a PNG Data URL (base64)
 *
 * Notes:
 * - Runs on the server (Next.js route handler).
 * - The frontend fetches this endpoint and displays the returned image.
 */
export async function POST(req: Request) {
  // Try to parse JSON body; if it fails, treat as null (will fail validation)
  const body = await req.json().catch(() => null);

  // Validate input
  const parsed = bodySchema.safeParse(body);

  // Return a 400 with structured validation details if invalid
  if (!parsed.success) {
    return NextResponse.json(zodErrorToResponse(parsed.error), { status: 400 });
  }

  // Extract validated values
  const { link, size } = parsed.data;

  try {
    /**
     * Generate a QR code as a Data URL.
     * - width controls the output pixel width (square image)
     * - margin controls whitespace around the QR code
     * - errorCorrectionLevel controls resilience to damage/occlusion ("M" is a good default)
     */
    const dataUrl = await QRCode.toDataURL(link, {
      width: size ?? 320,
      margin: 2,
      errorCorrectionLevel: "M",
    });

    // Success response: frontend will use dataUrl as <img src="...">
    return NextResponse.json({ dataUrl });
  } catch {
    // Any unexpected library/runtime errors -> 500
    return NextResponse.json(
      { message: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}
