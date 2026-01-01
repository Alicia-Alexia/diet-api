import { it, describe, beforeAll, afterAll, beforeEach, expect } from 'vitest'
import { execSync } from 'node:child_process'
import request from 'supertest'
import { app } from '../src/app.js'

describe('Users Routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    // Limpa e recria o banco antes de cada teste
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  it('should be able to create a new user', async () => {
    const response = await request(app.server)
      .post('/users')
      .send({
        name: 'John Doe',
        email: 'johndoe@example.com',
      })

    expect(response.statusCode).toEqual(201)
    
    // Verifica se o cookie foi criado
    const cookies = response.get('Set-Cookie')
    expect(cookies).toBeTruthy()
    expect(cookies![0]).toContain('session_id')
  })

  it('should be able to login with existing email (update session)', async () => {
    // 1. Cria o usuário pela primeira vez
    const firstResponse = await request(app.server)
      .post('/users')
      .send({
        name: 'John Doe',
        email: 'johndoe@example.com',
      })
    
    const firstCookie = firstResponse.get('Set-Cookie')![0]

    // 2. Tenta "criar" de novo com o mesmo email (Login)
    const loginResponse = await request(app.server)
      .post('/users')
      .send({
        name: 'John Doe',
        email: 'johndoe@example.com',
      })

    expect(loginResponse.statusCode).toEqual(201)

    const secondCookie = loginResponse.get('Set-Cookie')![0]

    // O cookie deve ter mudado, pois a rota gera um novo UUID para a sessão a cada login
    expect(firstCookie).not.toEqual(secondCookie)
  })

  it('should be able to get user profile', async () => {
    // 1. Cria usuário
    const createUserResponse = await request(app.server)
      .post('/users')
      .send({
        name: 'John Doe',
        email: 'johndoe@example.com',
      })

    const cookies = createUserResponse.get('Set-Cookie')
    if (!cookies) {
    throw new Error('Authentication cookie not found')
  }

    // 2. Busca perfil usando o cookie
    const profileResponse = await request(app.server)
      .get('/users/me')
      .set('Cookie', cookies)
      .expect(200)

    expect(profileResponse.body.user).toEqual(
      expect.objectContaining({
        name: 'John Doe',
        email: 'johndoe@example.com',
      }),
    )
  })

  it('should not be able to get user profile without cookie', async () => {
    await request(app.server)
      .get('/users/me')
      .expect(401)
  })

  it('should be able to logout', async () => {
    // 1. Cria usuário
    const createUserResponse = await request(app.server)
      .post('/users')
      .send({
        name: 'John Doe',
        email: 'johndoe@example.com',
      })
    
    // 2. Chama rota de logout
    const logoutResponse = await request(app.server)
      .post('/users/logout')
      .expect(200)
    
    // 3. Verifica se o cookie foi limpo (geralmente vem com data expirada ou vazio)
    const logoutCookie = logoutResponse.get('Set-Cookie')![0]
    
    // O padrão para limpar cookie é definir Max-Age=0 ou data no passado
    // O teste verifica se existe instrução de cookie na resposta
    expect(logoutCookie).toBeTruthy()
  })
})