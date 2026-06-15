// C:\Users\uriel\Downloads\enero 26\archivo2\tests\unit\proxy.test.ts
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import nextConfig from '@/next.config'
import { config, proxy } from '@/proxy'

const updateSessionMock = vi.fn()

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: (...args: unknown[]) => updateSessionMock(...args),
}))

describe('proxy', () => {
  beforeEach(() => {
    updateSessionMock.mockReset()
  })

  it('protege rutas internas y excluye assets estaticos del matcher', () => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        nextConfig,
        url: '/dashboard',
      })
    ).toBe(true)

    expect(
      unstable_doesMiddlewareMatch({
        config,
        nextConfig,
        url: '/_next/static/chunks/app.js',
      })
    ).toBe(false)

    expect(
      unstable_doesMiddlewareMatch({
        config,
        nextConfig,
        url: '/logo.png',
      })
    ).toBe(false)
  })

  it('delegates request handling to updateSession', async () => {
    const response = NextResponse.next()
    updateSessionMock.mockResolvedValue(response)

    const request = new NextRequest('https://example.com/dashboard')
    const result = await proxy(request)

    expect(updateSessionMock).toHaveBeenCalledWith(request)
    expect(result).toBe(response)
  })
})
