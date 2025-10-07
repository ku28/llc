LLC ERP (MVP)

This repository is a minimal LLC ERP inspired by accountsdeck.

Tech stack
- Next.js (TypeScript)
- Prisma + SQLite
- Tailwind CSS
- Simple REST API endpoints

Quick start (PowerShell)

1. Install dependencies
   npm install

2. Generate Prisma client and run migrations
   npx prisma migrate dev --name init

3. Seed database (optional)
   node prisma/seed.js

4. Run dev server
   npm run dev

What I scaffolded
- Basic dashboard (`pages/index.tsx`)
- Patient CRUD API (`pages/api/patients.ts`)
- Prisma schema (`prisma/schema.prisma`)
- Simple UI components and Tailwind setup

Next steps (suggested)
- Add authentication (NextAuth or custom JWT)
- Add accounting ledgers, invoices, payments flows
- Add role-based access control
- Add reports and exports

If you want, I can now run npm install and generate the Prisma client in this environment, or tailor the models/features further (invoicing, inventory, reports).