# 🌐 LLC Healthcare Management - Web ApplicationLLC ERP (MVP)



This is the **web version** of the LLC Healthcare Management System built with Next.js.This repository is a minimal LLC ERP inspired by accountsdeck.



## 🚀 Quick StartTech stack

- Next.js (TypeScript)

### Development Mode- Prisma + SQLite

```bash- Tailwind CSS

npm install- Simple REST API endpoints

npm run dev

```Quick start (PowerShell)



Visit: `http://localhost:3000`1. Install dependencies

   npm install

### Production Build

```bash2. Generate Prisma client and run migrations

npm run build   npx prisma migrate dev --name init

npm start

```3. Seed database (optional)

   node prisma/seed.js

## 📝 Available Scripts

4. Run dev server

| Command | Description |   npm run dev

|---------|-------------|

| `npm run dev` | Start development server |What I scaffolded

| `npm run build` | Build for production |- Basic dashboard (`pages/index.tsx`)

| `npm start` | Start production server |- Patient CRUD API (`pages/api/patients.ts`)

| `npm run prisma:generate` | Generate Prisma client |- Prisma schema (`prisma/schema.prisma`)

| `npm run prisma:migrate` | Run database migrations |- Simple UI components and Tailwind setup



## 🎨 CustomizationNext steps (suggested)

- Add authentication (NextAuth or custom JWT)

This is the **WEB APP** version. Customize this separately from the desktop app.- Add accounting ledgers, invoices, payments flows

- Add role-based access control

### Where to Customize:- Add reports and exports



- **Styling**: `styles/globals.css`, `tailwind.config.js`If you want, I can now run npm install and generate the Prisma client in this environment, or tailor the models/features further (invoicing, inventory, reports).
- **Pages**: `pages/*.tsx`
- **Components**: `components/*.tsx`
- **API Routes**: `pages/api/*.ts`
- **Database**: `prisma/schema.prisma`

### Web-Specific Features:

- Optimized for browser performance
- Responsive design for mobile/tablet
- Can be deployed to Vercel, Netlify, etc.
- Uses PostgreSQL or any database you configure

## 🚢 Deployment

### Deploy to Vercel:
```bash
vercel
```

### Deploy to Other Platforms:
- Update `DATABASE_URL` in `.env`
- Run `npm run build`
- Deploy the `.next` folder

## 📂 Structure

```
llc-webapp/
├── pages/              # Next.js pages
├── components/         # React components
├── lib/               # Utility functions
├── prisma/            # Database schema
├── public/            # Static assets
├── styles/            # CSS styles
└── package.json       # Dependencies
```

## 🔒 Environment Variables

Create `.env` file:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

---

**Note**: This is the **web application** folder. For the desktop app, see `../llc-desktop/`
