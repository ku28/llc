Developer notes

- To generate Prisma client: npx prisma generate
- To create the SQLite dev database and apply migrations: npx prisma migrate dev --name init
- The bundled seed file `prisma/seed.js` populates a couple of users and a patient

Authentication is intentionally omitted in this MVP. For production use, add secure auth (NextAuth.js or JWT) and environment config.
