import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";

function zodErrorToResponse(error: z.ZodError) {
  return {
    message: "Validation error",
    issues: error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
      code: i.code,
    })),
    fieldErrors: error.flatten().fieldErrors,
  };
}

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

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(zodErrorToResponse(parsed.error), { status: 400 });
  }

  const { link, size } = parsed.data;

  try {
    const dataUrl = await QRCode.toDataURL(link, {
      width: size ?? 320,
      margin: 2,
      errorCorrectionLevel: "M",
    });

    return NextResponse.json({ dataUrl });
  } catch {
    return NextResponse.json(
      { message: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}
