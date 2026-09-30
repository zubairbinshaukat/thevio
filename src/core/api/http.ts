// What every API handler returns: a status, headers and a body, as plain
// data. Routes turn it into a Response; tests read it directly. No
// Request/Response here, so core stays runnable anywhere.

export type ApiResult = {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
};

/** Anyone may call the API from a browser: it reads no cookies or secrets. */
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
} as const;

/**
 * For responses that are a pure function of the URL. The CDN keeps them for
 * a year (Vercel purges it on every deploy, so engine changes still land);
 * browsers for a day.
 */
export const IMMUTABLE = {
  "Cache-Control": "public, max-age=86400, immutable",
  "CDN-Cache-Control": "max-age=31536000",
} as const;

export const NO_STORE = { "Cache-Control": "no-store" } as const;

export function json(
  status: number,
  data: unknown,
  headers: Record<string, string> = {},
): ApiResult {
  return {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS,
      ...headers,
    },
    body: `${JSON.stringify(data, null, 2)}\n`,
  };
}

const TITLES: Record<number, string> = {
  400: "Bad Request",
  404: "Not Found",
  413: "Content Too Large",
  415: "Unsupported Media Type",
  422: "Unprocessable Content",
};

/**
 * An RFC 9457 problem. `about:blank` types use the status phrase as title,
 * as the RFC asks; `detail` says what to change.
 */
export function problem(
  status: number,
  detail: string,
  extra: Record<string, unknown> = {},
): ApiResult {
  return {
    status,
    headers: {
      "Content-Type": "application/problem+json; charset=utf-8",
      ...CORS,
      ...NO_STORE,
    },
    body: `${JSON.stringify(
      {
        type: "about:blank",
        title: TITLES[status] ?? "Error",
        status,
        detail,
        ...extra,
      },
      null,
      2,
    )}\n`,
  };
}

export const preflight = (): ApiResult => ({
  status: 204,
  headers: { ...CORS },
  body: "",
});
