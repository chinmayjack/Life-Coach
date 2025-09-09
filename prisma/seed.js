import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create default user
  const user = await prisma.user.upsert({
    where: { email: "default@example.com" },
    update: {},
    create: {
      email: "default@example.com",
      name: "Default User",
    },
  });

  console.log("Default user created/ensured:", user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
