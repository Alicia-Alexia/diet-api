import { it, describe, beforeAll, afterAll, beforeEach, expect } from 'vitest'
import { execSync } from 'node:child_process'
import request from 'supertest'
import { app } from '../src/app.js'

describe('Meals Routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    // Reseta o banco de dados antes de cada teste para garantir isolamento
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  it('should be able to create a new meal', async () => {
    // 1. Criar um usuário primeiro (obrigatório para ter session_id)
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

    // 2. Criar a refeição usando o cookie do usuário
    await request(app.server)
      .post('/meals')
      .set('Cookie', cookies)
      .send({
        name: 'Breakfast',
        description: 'Eggs and bacon',
        isOnDiet: true,
        date: new Date(),
      })
      .expect(201)
  })

  it('should be able to list all meals from a user', async () => {
    const createUserResponse = await request(app.server)
      .post('/users')
      .send({ name: 'John Doe', email: 'johndoe@example.com' })

    const cookies = createUserResponse.get('Set-Cookie')
     if (!cookies) {
      throw new Error('Authentication cookie not found')
     }

    await request(app.server)
      .post('/meals')
      .set('Cookie', cookies)
      .send({
        name: 'Lunch',
        description: 'Sandwich',
        isOnDiet: true,
        date: new Date(),
      })

    const listMealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)
      .expect(200)

    expect(listMealsResponse.body.meals).toHaveLength(1)
    expect(listMealsResponse.body.meals[0].name).toEqual('Lunch')
  })

  it('should be able to show a specific meal', async () => {
    const createUserResponse = await request(app.server)
      .post('/users')
      .send({ name: 'John Doe', email: 'johndoe@example.com' })

    const cookies = createUserResponse.get('Set-Cookie')
     if (!cookies) {
      throw new Error('Authentication cookie not found')
     }

    await request(app.server)
      .post('/meals')
      .set('Cookie', cookies)
      .send({
        name: 'Dinner',
        description: 'Pizza',
        isOnDiet: false,
        date: new Date(),
      })

    const listMealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)

    const mealId = listMealsResponse.body.meals[0].id

    const getMealResponse = await request(app.server)
      .get(`/meals/${mealId}`)
      .set('Cookie', cookies)
      .expect(200)

    expect(getMealResponse.body.meal).toEqual(
      expect.objectContaining({
        name: 'Dinner',
        description: 'Pizza',
        is_on_diet: 0,
      }),
    )
  })

  it('should be able to update a meal', async () => {
    const createUserResponse = await request(app.server)
      .post('/users')
      .send({ name: 'John Doe', email: 'johndoe@example.com' })

    const cookies = createUserResponse.get('Set-Cookie')
     if (!cookies) {
      throw new Error('Authentication cookie not found')
     }

    await request(app.server)
      .post('/meals')
      .set('Cookie', cookies)
      .send({
        name: 'Lunch',
        description: 'Sandwich',
        isOnDiet: true,
        date: new Date(),
      })

    const listMealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)

    const mealId = listMealsResponse.body.meals[0].id

    await request(app.server)
      .put(`/meals/${mealId}`)
      .set('Cookie', cookies)
      .send({
        name: 'Dinner',
        description: 'Burger',
        isOnDiet: false,
        date: new Date(),
      })
      .expect(204)
  })

  it('should be able to delete a meal', async () => {
    const createUserResponse = await request(app.server)
      .post('/users')
      .send({ name: 'John Doe', email: 'johndoe@example.com' })

    const cookies = createUserResponse.get('Set-Cookie')
     if (!cookies) {
      throw new Error('Authentication cookie not found')
     }

    await request(app.server)
      .post('/meals')
      .set('Cookie', cookies)
      .send({
        name: 'Lunch',
        description: 'Sandwich',
        isOnDiet: true,
        date: new Date(),
      })

    const listMealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)

    const mealId = listMealsResponse.body.meals[0].id

    await request(app.server)
      .delete(`/meals/${mealId}`)
      .set('Cookie', cookies)
      .expect(204)
  })

  it('should be able to get metrics from a user', async () => {
    const createUserResponse = await request(app.server)
      .post('/users')
      .send({ name: 'John Doe', email: 'johndoe@example.com' })

    const cookies = createUserResponse.get('Set-Cookie')
     if (!cookies) {
      throw new Error('Authentication cookie not found')
     }

    // Refeição dentro da dieta
    await request(app.server)
      .post('/meals')
      .set('Cookie', cookies)
      .send({
        name: 'Breakfast',
        description: 'Oatmeal',
        isOnDiet: true,
        date: new Date('2025-01-01T08:00:00'),
      })

    // Refeição fora da dieta
    await request(app.server)
      .post('/meals')
      .set('Cookie', cookies)
      .send({
        name: 'Lunch',
        description: 'Burger',
        isOnDiet: false,
        date: new Date('2025-01-01T12:00:00'),
      })

    // Refeição dentro da dieta
    await request(app.server)
      .post('/meals')
      .set('Cookie', cookies)
      .send({
        name: 'Dinner',
        description: 'Salad',
        isOnDiet: true,
        date: new Date('2025-01-01T20:00:00'),
      })

    const metricsResponse = await request(app.server)
      .get('/meals/metrics')
      .set('Cookie', cookies)
      .expect(200)

    expect(metricsResponse.body).toEqual({
      totalMeals: 3,
      totalMealsOnDiet: 2,
      totalMealsOffDiet: 1,
      bestOnDietSequence: 1,
    })
  })
})