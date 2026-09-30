import type { ApiResult } from "@/core/api/http";

/** core/api's plain result → a Response. 204s must have no body. */
export function toResponse({ status, headers, body }: ApiResult): Response {
  return new Response(status === 204 ? null : body, { status, headers });
}
