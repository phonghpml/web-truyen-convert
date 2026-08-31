import { NextResponse, type NextRequest } from 'next/server'

const HF_BASE = process.env.NEXT_PUBLIC_CRAWLER_URL_PROXY || 'https://phonghp-crawler.hf.space'

async function proxy(request: NextRequest, params: { path?: string[] }) {
  const path = params.path?.join('/') || ''
  const url = `${HF_BASE}/${path}`.replace(/\/+/g, '/')

  // Forward request headers except host
  const forwardedHeaders: Record<string, string> = {}
  for (const [k, v] of request.headers.entries()) {
    if (k.toLowerCase() === 'host') continue
    forwardedHeaders[k] = v
  }

  const fetchInit: RequestInit = {
    method: request.method,
    headers: forwardedHeaders,
    redirect: 'follow',
    export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
      const origin = request.headers.get('origin') || undefined
      // ensure signature matches Next's expected context typing
      await context.params
      return preflightResponse(origin)
    }

    export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
      const p = await context.params
      return proxy(request, { path: p.path })
    }

    export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
      const p = await context.params
      return proxy(request, { path: p.path })
    }

    export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
      const p = await context.params
      return proxy(request, { path: p.path })
    }

    export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
      const p = await context.params
      return proxy(request, { path: p.path })
    }

    export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
      const p = await context.params
      return proxy(request, { path: p.path })
    }
export async function DELETE(request: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(request, params)
=======
export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const origin = request.headers.get('origin') || undefined
  // ensure signature matches Next's expected context typing
  await context.params
  return preflightResponse(origin)
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const p = await context.params
  return proxy(request, { path: p.path })
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const p = await context.params
  return proxy(request, { path: p.path })
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const p = await context.params
  return proxy(request, { path: p.path })
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const p = await context.params
  return proxy(request, { path: p.path })
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const p = await context.params
  return proxy(request, { path: p.path })
>>>>>>> 073ae26 (fix(frontend): adapt API route handler signatures to Next.js typing (await context.params))
}
