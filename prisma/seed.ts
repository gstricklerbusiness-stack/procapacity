import { PrismaClient } from "@prisma/client";
import { PRESET_ROLES, INTERNAL_PROJECTS } from "../lib/constants";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Log preset roles (these are used as reference data, not stored in DB)
  console.log("\n📋 Available preset roles:");
  PRESET_ROLES.forEach((role) => console.log(`  - ${role}`));

  console.log("\n📁 Available internal project templates:");
  INTERNAL_PROJECTS.forEach((project) => console.log(`  - ${project}`));

  console.log("\n✅ Seed complete!");
  console.log("\nNote: Roles and internal projects are defined in lib/constants.ts");
  console.log("Use seed-demo.ts to create example workspace data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

