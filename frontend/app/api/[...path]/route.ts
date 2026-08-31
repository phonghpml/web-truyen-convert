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
    // body handled below
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      const array = await request.arrayBuffer()
      fetchInit.body = array
    } catch (e) {
      // ignore
    }
  }

  const res = await fetch(url, fetchInit)

  // Build NextResponse
  const buf = await res.arrayBuffer()
  const nextRes = new NextResponse(Buffer.from(buf), { status: res.status })

  // copy headers
  for (const [k, v] of res.headers.entries()) {
    // let cookies pass through
    nextRes.headers.set(k, v)
  }

  return nextRes
}

function preflightResponse(origin?: string) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since,Accept-Encoding,Accept-Language',
    'Access-Control-Allow-Credentials': 'true',
  }
  if (origin) headers['Access-Control-Allow-Origin'] = origin
  return new NextResponse(null, { status: 204, headers })
}

export async function OPTIONS(request: NextRequest, { params }: { params: { path?: string[] } }) {
  const origin = request.headers.get('origin') || undefined
  return preflightResponse(origin)
}

export async function GET(request: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(request, params)
}

export async function POST(request: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(request, params)
}

export async function PUT(request: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(request, params)
}

export async function PATCH(request: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(request, params)
}

export async function DELETE(request: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(request, params)
}
