import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  ["web-development", "Web Development", "Modern frontend and backend fundamentals."],
  ["data-science", "Data Science", "Statistics, Python, and machine learning essentials."],
  ["cybersecurity", "Cybersecurity", "Secure engineering and defensive practices."],
];

async function main() {
  for (const [slug, name, description] of categories) {
    await prisma.category.upsert({
      where: { slug },
      update: { name, description },
      create: { slug, name, description },
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    await prisma.user.upsert({
      where: { email: adminEmail.toLowerCase() },
      update: { role: "ADMIN", emailVerifiedAt: new Date() },
      create: {
        email: adminEmail.toLowerCase(),
        name: "QuizForge Admin",
        passwordHash: await hash(adminPassword, 12),
        role: "ADMIN",
        emailVerifiedAt: new Date(),
      },
    });
  }
}

main()
  .finally(async () => prisma.$disconnect());
