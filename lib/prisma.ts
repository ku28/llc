import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

const _prisma = global.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.prisma = _prisma

// Export as `any` to avoid transient TypeScript model-delegate mismatches during iterative development.
// This preserves the runtime Prisma client while silencing type errors in the API layer.
const prisma: any = _prisma as any

export default prisma
