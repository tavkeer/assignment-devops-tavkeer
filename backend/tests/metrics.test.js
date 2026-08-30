const request = require('supertest');
const app = require('../src/server');

describe('Prometheus Metrics Endpoint', () => {
  it('GET /metrics returns 200 with Prometheus text format', async () => {
    // Generate a sample request first to trigger metric recording
    await request(app).get('/');

    const res = await request(app).get('/metrics');
    expect(res.statusCode).toEqual(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);

    // Verify Prometheus runtime metrics
    expect(res.text).toContain('process_cpu_user_seconds_total');
    expect(res.text).toContain('nodejs_heap_size_total_bytes');

    // Verify Custom RED metrics
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('http_request_duration_seconds');
    expect(res.text).toContain('http_active_requests');
  });

  it('GET /metrics correctly records route labels', async () => {
    await request(app).get('/api/health');

    const res = await request(app).get('/metrics');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('route="/api/health"');
    expect(res.text).toContain('status_code="200"');
  });
});

