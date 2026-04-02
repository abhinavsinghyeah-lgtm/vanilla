import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Vanilla database...')

  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'changeme123'
  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash }
  })

  console.log(`✅ User created: ${user.username} (id: ${user.id})`)

  // Seed default streak record
  await prisma.streak.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id }
  })

  // Seed default rewards
  const defaultRewards = [
    { name: '3-Day Warrior',  description: 'Complete 3 consecutive evaluation days', targetStreak: 3 },
    { name: 'Week Crusher',   description: 'Complete a full 7-day streak',           targetStreak: 7 },
    { name: 'Fortnight King', description: '14 days of consistent execution',        targetStreak: 14 },
    { name: 'Month Dominator',description: 'Unstoppable for 30 days straight',       targetStreak: 30 },
    { name: 'Quarter Beast',  description: '90 days — you are the system',           targetStreak: 90 }
  ]

  for (const r of defaultRewards) {
    const existing = await prisma.reward.findFirst({
      where: { userId: user.id, targetStreak: r.targetStreak }
    })
    if (!existing) {
      await prisma.reward.create({ data: { userId: user.id, ...r } })
    }
  }

  console.log('✅ Default rewards seeded')
  console.log('🏁 Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
