import { NextResponse } from 'next/server'

const HF_BASE = process.env.NEXT_PUBLIC_CRAWLER_URL_PROXY || 'https://phonghp-crawler.hf.space'

async function proxy(request: Request, params: { path: string[] }) {
  const path = params.path?.join('/') || ''
  const url = `${HF_BASE}/${path}`

  const init: RequestInit = {
    method: request.method,
    headers: {},
    body: null,
    redirect: 'follow',
  }

  // copy headers
  for (const [key, value] of request.headers) {
    // skip host header
    if (key.toLowerCase() === 'host') continue
    init.headers![key] = value
  }

  if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
    init.body = await request.arrayBuffer()
  }

  const res = await fetch(url, init)
  const responseHeaders = new Headers(res.headers)

  // Build NextResponse with same status and body
  const body = await res.arrayBuffer()
  const nextRes = new NextResponse(body, { status: res.status })

  // copy response headers
  for (const [key, value] of responseHeaders) {
    // Allow Vercel proxies to set cookies back to browser
    nextRes.headers.set(key, value)
  }

  return nextRes
}

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  return proxy(request, params)
}

export async function POST(request: Request, { params }: { params: { path: string[] } }) {
  return proxy(request, params)
}

export async function PUT(request: Request, { params }: { params: { path: string[] } }) {
  return proxy(request, params)
}

export async function PATCH(request: Request, { params }: { params: { path: string[] } }) {
  return proxy(request, params)
}

export async function DELETE(request: Request, { params }: { params: { path: string[] } }) {
  return proxy(request, params)
}

export async function OPTIONS(request: Request, { params }: { params: { path: string[] } }) {
  return proxy(request, params)
}
