import http from 'http';
import next from 'next';
import supertest from 'supertest';

describe('API /api/sessions + /chat', () => {
  let app: any;
  let server: http.Server;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    delete process.env.DEEPSEEK_API_KEY; // ensure fake mode
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

  it('creates session and chats (non-stream)', async () => {
    const create = await request
      .post('/api/sessions')
      .send({
        profile: { age: '28', gender: '男', occupation: '工程师', martial_status: '未婚', symptoms: '焦虑;失眠' }
      })
      .set('Content-Type', 'application/json');
    expect(create.status).toBe(200);
    const sid = create.body.session_id;
    expect(typeof sid).toBe('string');

    const chat = await request
      .post(`/api/sessions/${sid}/chat`)
      .send({ message: '你好，请做个自我介绍。' })
      .set('Content-Type', 'application/json');
    expect(chat.status).toBe(200);
    expect(chat.body).toHaveProperty('response');
    expect(chat.body).toHaveProperty('emotion');
  });

  it('streams chat tokens (basic)', async () => {
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
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
  });
});

