import { PrismaClient } from './generated'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@nebula.local'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const role = (process.env.ADMIN_ROLE || 'ADMIN').toUpperCase()
  const phone = process.env.ADMIN_PHONE || null

  if (!email) {
    throw new Error('ADMIN_EMAIL is required for seeding the admin user')
  }

  const hashed = await bcrypt.hash(password, 12)

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashed,
      role,
      ...(phone ? { phone } : {}),
      updatedAt: new Date(),
    },
    create: {
      email,
      password: hashed,
      role,
      ...(phone ? { phone } : {}),
    },
  })

  console.log(`✅ Seeded admin: ${admin.email} (role=${admin.role})`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
