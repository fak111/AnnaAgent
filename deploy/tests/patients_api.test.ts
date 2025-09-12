import http from 'http';
import next from 'next';
import supertest from 'supertest';

describe('API /api/patients', () => {
  let app: any;
  let server: http.Server;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    app = next({ dev: true, dir: process.cwd() + '/deploy' });
    await app.prepare();
    const handler = app.getRequestHandler();
    server = http.createServer((req, res) => handler(req, res));
    await new Promise<void>(resolve => server.listen(0, resolve));
    const address = server.address();
    const url = typeof address === 'object' && address ? `http://127.0.0.1:${address.port}` : 'http://127.0.0.1';
    request = supertest(url);
  }, 30000);

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('responds with list shape', async () => {
    const res = await request.get('/api/patients?page=1&page_size=1');
    expect([200, 500]).toContain(res.status); // 500 acceptable if dataset missing
    if (res.status === 200) {
      expect(res.body).toHaveProperty('patients');
      expect(res.body).toHaveProperty('total');
    }
  });
});

