import type { NextRequest } from "next/server";
import { preflight, problem } from "@/core/api/http";
import { getTheme, MAX_BODY_BYTES, postTheme } from "@/core/api/theme";
import { toResponse } from "@/lib/api";

// Node runtime (Cache Components doesn't support edge). The logic and its
// tests live in core/api/theme.ts; this file only adapts Request/Response.

export function GET(request: NextRequest): Response {
  return toResponse(
    getTheme(request.nextUrl.searchParams, request.nextUrl.origin),
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  // Refuse oversized bodies before reading them.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return toResponse(
      problem(413, `Bodies are limited to ${MAX_BODY_BYTES / 1024} KB.`),
    );
  }
  return toResponse(
    postTheme(
      request.headers.get("content-type"),
      await request.text(),
      request.nextUrl.searchParams,
      request.nextUrl.origin,
    ),
  );
}

export function OPTIONS(): Response {
  return toResponse(preflight());
}
