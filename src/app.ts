import fastify from "fastify";
import cookies from "@fastify/cookie"
import { mealsRoutes } from "./routes/meals.js";
import { usersRoutes } from "./routes/user.js";
import fastifyCors from '@fastify/cors'

export const app = fastify()
app.register(fastifyCors, {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true, // ⚠️ ISSO É CRUCIAL: Permite que o cookie vá e volte
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
})
app.register(cookies)

app.register(usersRoutes, { prefix: 'users' })
app.register(mealsRoutes, { prefix: 'meals' })