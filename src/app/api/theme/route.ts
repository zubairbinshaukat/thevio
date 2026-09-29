type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail?: string;
};

function notImplemented(): Response {
  const body: ProblemDetails = {
    type: "about:blank",
    title: "Not Implemented",
    status: 501,
    detail: "The theme API is not available yet.",
  };
  return Response.json(body, {
    status: 501,
    headers: { "Content-Type": "application/problem+json" },
  });
}

export function GET(): Response {
  return notImplemented();
}

export function POST(): Response {
  return notImplemented();
}
