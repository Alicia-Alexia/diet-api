import type { FastifyReply, FastifyRequest } from 'fastify'
import { knex } from '../database/database.js'

export async function checkSessionIdExists(
  request: FastifyRequest,
  reply: FastifyReply,
) {
const sessionId = request.cookies.session_id

  if (!sessionId) {
    return reply.status(401).send({
      error: 'Unauthorized',
    })
  }
}