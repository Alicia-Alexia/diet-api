import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('meals', (table) => {
    // 👇 Altera o tipo da coluna para BigInteger (aceita timestamps gigantes)
    table.bigInteger('date').alter()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('meals', (table) => {
    // Reverte para integer se der erro (rollback)
    table.integer('date').alter()
  })
}