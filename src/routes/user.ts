import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { knex } from "../database/database.js";
import { randomUUID } from "node:crypto";
import { checkSessionIdExists } from "../middlewares/check_session_id_exists.js";

export async function usersRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    const get_users = await knex("users").select();

    return { get_users };
  });
  app.post("/", async (request, reply) => {
    const createUserBodySchema = z.object({
      name: z.string(),
      email: z.string().email(),
    });

    const { name, email } = createUserBodySchema.parse(request.body);

    // 1. Verifica se o usuário já existe
    const userByEmail = await knex("users").where({ email }).first();
    let sessionId = randomUUID();

    if (userByEmail) {
      // ✅ LOGIN: O usuário existe.
      await knex("users")
        .where({ id: userByEmail.id })
        .update({ session_id: sessionId });
    } else {
      // ✅ CADASTRO: Cria do zero.
      await knex("users").insert({
        id: randomUUID(),
        name,
        email,
        session_id: sessionId,
      });
    }

    // 3. Grava o cookie novo no navegador
    reply.cookie("session_id", sessionId, {
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      secure: true,      
      sameSite: 'none',  
      httpOnly: true,
    });
    return reply.status(201).send();
  });
  app.post("/logout", async (request, reply) => {
    reply.clearCookie("session_id", { path: "/", secure: true,
      sameSite: 'none' });
    return reply.status(200).send({ message: "Logged out successfully" });
  });

  app.get(
    "/me",
    { preHandler: [checkSessionIdExists] }, 
    async (request, reply) => {
      const { session_id } = request.cookies;

      const user = await knex("users").where({ session_id }).first();

      if (!user) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
      return reply.send({
        user: {
          name: user.name,
          email: user.email,
        },
      });
    }
  );
}
