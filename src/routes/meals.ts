import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { knex } from "../database/database.js";
import { randomUUID } from "node:crypto";
import { checkSessionIdExists } from "../middlewares/check_session_id_exists.js";

export async function mealsRoutes(app: FastifyInstance) {
  app.post(
    "/",
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const createMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        isOnDiet: z.boolean(),
        date: z.coerce.date(),
      });

      const { name, description, isOnDiet, date } = createMealBodySchema.parse(
        request.body
      );

      // 1. Pega o session_id do cookie
      let { session_id } = request.cookies;

      if (!session_id) {
        session_id = randomUUID();
        reply.cookie("session_id", session_id, {
          path: "/",
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        });
      }

      // 2. Acha o usuário dono dessa sessão
      const user = await knex("users").where({ session_id }).first();
      if (!user) {
        return reply.status(401).send({ message: "Unauthorized" });
      }

      // 3. Salva a refeição COM O USER_ID preenchido
      await knex("meals").insert({
        id: randomUUID(),
        name,
        description,
        is_on_diet: isOnDiet,
        date: date.getTime(),
        user_id: user.id,
      });

      return reply.status(201).send();
    }
  ),
    app.get(
      "/",
      { preHandler: [checkSessionIdExists] },
      async (request, reply) => {
        const { session_id } = request.cookies;

        // 1. Valida se existe uma query 
        const getMealsParamsSchema = z.object({
          q: z.string().optional(),
        });

        const { q } = getMealsParamsSchema.parse(request.query);
        const user = await knex("users").where({ session_id }).first();

        if (!user) {
          return reply.status(401).send({ error: "Unauthorized" });
        }

        // 2. Constroi a query base
        let query = knex("meals")
          .where({ user_id: user.id })
          .orderBy("date", "desc");

        // 3. Se tiver texto de busca, adiciona o filtro WHERE LIKE
        if (q) {
          query = query.where("name", "like", `%${q}%`); // O % serve para buscar em qualquer parte do texto
        }

        const meals = await query;

        return reply.send({ meals });
      }
    );

  app.get(
    "/:mealId",
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const paramsSchema = z.object({ mealId: z.string().uuid() });
      const { mealId } = paramsSchema.parse(request.params);
      const { session_id } = request.cookies;
      const user = await knex("users").where({ session_id }).first();

      if (!user) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const meal = await knex("meals")
        .where({
          id: mealId,
          user_id: user.id, 
        })
        .first();

      if (!meal) {
        return reply.status(404).send({ error: "Meal not found" });
      }

      return reply.send({ meal });
    }
  );

  app.put(
    "/:id",
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      // 1. Validações dos dados de entrada
      const paramsSchema = z.object({
        id: z.string().uuid(),
      });

      const { id } = paramsSchema.parse(request.params);
      const updateMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        isOnDiet: z.boolean(),
        date: z.coerce.date(),
      });

      const { name, description, isOnDiet, date } = updateMealBodySchema.parse(
        request.body
      );

      // 2. Busca o usuário dono da sessão
      const { session_id } = request.cookies;
      const user = await knex("users").where({ session_id }).first();

      if (!user) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      // 3. Atualiza a refeição garantindo que ela pertence a esse usuário
      const meal = await knex("meals")
        .where({ id, user_id: user.id }) 
        .update({
          name,
          description,
          is_on_diet: isOnDiet,
          date: date.getTime(),
        });

      if (!meal) {
        return reply.status(404).send({ error: "Meal not found" });
      }
      return reply.status(204).send();
    }
  );

  app.delete(
    "/:id",
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
      });

      const { id } = paramsSchema.parse(request.params);

      // 1. Busca o usuário pelo cookie
      const { session_id } = request.cookies;
      const user = await knex("users").where({ session_id }).first();

      if (!user) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      // 2. Apagamos SOMENTE se o ID da refeição e o ID do usuário baterem
      const deletedCount = await knex("meals")
        .where({ id, user_id: user.id }) 
        .delete();

      if (deletedCount === 0) {
        return reply
          .status(404)
          .send({ error: "Meal not found or not authorized" });
      }

      return reply.status(204).send();
    }
  );

  app.get(
    "/metrics",
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const { session_id } = request.cookies;

      // 1. Acha o usuário
      const user = await knex("users").where({ session_id }).first();

      if (!user) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      // 2. Busca todas as refeições DESSE USUÁRIO
      const totalMeals = await knex("meals")
        .where({ user_id: user.id }) 
        .orderBy("date", "desc");

      const totalMealsOnDiet = totalMeals.filter(
        (meal) => meal.is_on_diet
      ).length;

      const totalMealsOffDiet = totalMeals.length - totalMealsOnDiet;

      const { bestOnDietSequence } = totalMeals.reduce(
        (acc, meal) => {
          if (meal.is_on_diet) {
            acc.currentSequence += 1;
          } else {
            acc.currentSequence = 0;
          }

          if (acc.currentSequence > acc.bestOnDietSequence) {
            acc.bestOnDietSequence = acc.currentSequence;
          }

          return acc;
        },
        { bestOnDietSequence: 0, currentSequence: 0 }
      );

      return reply.send({
        totalMeals: totalMeals.length,
        totalMealsOnDiet,
        totalMealsOffDiet,
        bestOnDietSequence,
      });
    }
  );
}
