import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { authUser } from "../lib/db/schema";
import { hash } from "@node-rs/argon2";
import { generateId } from "lucia";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

const PM_EMAIL = process.env.PM_EMAIL ?? "pm@gamatecha.com";
const PM_PASSWORD = process.env.PM_PASSWORD ?? "ChangeMe123!";

async function main() {
  console.log("Seeding PM account...");

  const hashedPassword = await hash(PM_PASSWORD);
  const userId = generateId(15);

  await db
    .insert(authUser)
    .values({ id: userId, email: PM_EMAIL.toLowerCase(), hashed_password: hashedPassword })
    .onConflictDoNothing();

  console.log(`PM account seeded: ${PM_EMAIL}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
