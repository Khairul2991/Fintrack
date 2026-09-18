import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { setTokenProvider, ApiError } from '../src/services/api.js'
import { fetchReportPdf } from '../src/services/exportApi.js'

function jsonResponse(body, status) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

describe('report PDF download', () => {
  let originalFetch

  before(() => {
    originalFetch = globalThis.fetch
    setTokenProvider(() => 'test-token')
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  it('sends the Authorization header and returns a Blob PDF', async () => {
    let captured
    globalThis.fetch = async (url, options) => {
      captured = { url, options }
      return {
        ok: true,
        status: 200,
        blob: async () => new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
      }
    }

    const blob = await fetchReportPdf('id')
    assert.equal(captured.url, '/api/reports/pdf?lang=id')
    assert.equal(captured.options.headers['Authorization'], 'Bearer test-token')
    assert.ok(blob instanceof Blob)
  })

  it('throws ApiError(401) for unauthenticated responses instead of downloading', async () => {
    globalThis.fetch = async () =>
      jsonResponse({ success: false, message: 'Authentication required.' }, 401)

    await assert.rejects(
      () => fetchReportPdf('en'),
      (error) => {
        assert.ok(error instanceof ApiError)
        assert.equal(error.status, 401)
        return true
      },
    )
  })

  it('surfaces the backend JSON error message for server failures', async () => {
    globalThis.fetch = async () =>
      jsonResponse({ success: false, message: 'Unable to process request.' }, 500)

    await assert.rejects(
      () => fetchReportPdf('en'),
      (error) => {
        assert.ok(error instanceof ApiError)
        assert.equal(error.status, 500)
        assert.equal(error.message, 'Unable to process request.')
        return true
      },
    )
  })
})