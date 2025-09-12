import http from 'http';
import next from 'next';
import supertest from 'supertest';

describe('Chat API edge cases', () => {
  let app: any;
  let server: http.Server;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    delete process.env.DEEPSEEK_API_KEY; // use fake mode
    process.env.NODE_ENV = 'test';
    app = next({ dev: true, dir: process.cwd() + '/deploy' });
    await app.prepare();
    const handler = app.getRequestHandler();
    server = http.createServer((req, res) => handler(req, res));
    await new Promise<void>(resolve => server.listen(0, resolve));
    const address = server.address();
    const url = typeof address === 'object' && address ? `http://127.0.0.1:${address.port}` : 'http://127.0.0.1';
    request = supertest(url);
  }, 40000);

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('returns 404 for invalid session', async () => {
    const res = await request
      .post('/api/sessions/00000000-0000-0000-0000-000000000000/chat')
      .send({ message: 'hi' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(404);
  });

  it('returns 400 for missing message', async () => {
    const create = await request
      .post('/api/sessions')
      .send({ profile: { age: '28', gender: '男', occupation: '工程师', martial_status: '未婚', symptoms: '焦虑' } })
      .set('Content-Type', 'application/json');
    const sid = create.body.session_id;
    const res = await request
      .post(`/api/sessions/${sid}/chat`)
      .send({})
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });

  it('returns 400 when chatting to ended session', async () => {
    const create = await request
      .post('/api/sessions')
      .send({ profile: { age: '28', gender: '男', occupation: '工程师', martial_status: '未婚', symptoms: '焦虑' } })
      .set('Content-Type', 'application/json');
    const sid = create.body.session_id;
    const ended = await request.delete(`/api/sessions/${sid}`);
    expect(ended.status).toBe(200);
    const res = await request
      .post(`/api/sessions/${sid}/chat`)
      .send({ message: 'hi' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });

  it('aggregates SSE content end-to-end (fake mode)', async () => {
    const create = await request
      .post('/api/sessions')
      .send({ profile: { age: '28', gender: '男', occupation: '工程师', martial_status: '未婚', symptoms: '焦虑' } })
      .set('Content-Type', 'application/json');
    const sid = create.body.session_id;
    const res = await request
      .post(`/api/sessions/${sid}/chat`)
      .send({ message: '你现在感觉如何？', stream: true })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(200);
    const text = res.text || '';
    // Collect deltas
    const deltas = Array.from(text.matchAll(/^data:\s*(\{.*\})/gm)).map(m => {
      try { return JSON.parse(m[1]).delta as string; } catch { return ''; }
    }).join('');
    expect(deltas).toContain('最近工作确实很忙');
  });
});

