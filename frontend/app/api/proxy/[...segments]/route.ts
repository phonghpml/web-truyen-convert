import { NextRequest } from "next/server";

type ProxyRouteContext = {
  params: Promise<{ segments: string[] }>;
};

const DEFAULT_TARGET = process.env.NEXT_PUBLIC_CRAWLER_URL || "http://127.0.0.1:8000";
const TARGET_BASE = (process.env.NEXT_PUBLIC_CRAWLER_URL || DEFAULT_TARGET).replace(/\/+$/, "");

async function forward(req: Request, segments: string[]) {
  const url = new URL(req.url);
  const query = url.search;
  const path = segments.map(encodeURIComponent).join("/");
  const targetUrl = `${TARGET_BASE}/${path}${query}`;

  const headers = new Headers(req.headers);
  // Remove host to avoid host mismatches
  headers.delete("host");

  // Forward request body if present
  const method = req.method;
  const init: RequestInit = { method, headers, redirect: "manual" };
  if (method !== "GET" && method !== "HEAD") {
    try {
      const body = await req.arrayBuffer();
      init.body = body;
    } catch {
      // ignore
    }
  }

  const resp = await fetch(targetUrl, init);

  // Copy response headers, but avoid hop-by-hop headers
  const excluded = new Set([
    "transfer-encoding",
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "upgrade",
  ]);

  const resHeaders: Record<string, string> = {};
  resp.headers.forEach((value, key) => {
    if (!excluded.has(key.toLowerCase())) resHeaders[key] = value;
  });

  const body = await resp.arrayBuffer();
  return new Response(body, {
    status: resp.status,
    headers: resHeaders,
  });
}

async function resolveSegments(context: ProxyRouteContext) {
  const { segments } = await context.params;
  return segments;
}

export async function GET(request: NextRequest, context: ProxyRouteContext) {
  const segments = await resolveSegments(context);
  return forward(request, segments);
}
export async function POST(request: NextRequest, context: ProxyRouteContext) {
  const segments = await resolveSegments(context);
  return forward(request, segments);
}
export async function PUT(request: NextRequest, context: ProxyRouteContext) {
  const segments = await resolveSegments(context);
  return forward(request, segments);
}
export async function DELETE(request: NextRequest, context: ProxyRouteContext) {
  const segments = await resolveSegments(context);
  return forward(request, segments);
}
export async function PATCH(request: NextRequest, context: ProxyRouteContext) {
  const segments = await resolveSegments(context);
  return forward(request, segments);
}
export async function OPTIONS(request: NextRequest, context: ProxyRouteContext) {
  const segments = await resolveSegments(context);
  return forward(request, segments);
}
