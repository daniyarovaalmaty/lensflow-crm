const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres'
});

async function main() {
  await client.connect();

  const oldUserId = 'cmocl4s7g000204jutt3x2eec';
  const oldOrgId = 'cmocl4s2u000104jum9fij0bk';
  const newUserId = 'cmrsxbqff000304ldvfj73fnj';

  try {
    await client.query('BEGIN');

    console.log("Deleting user branches for old user...");
    await client.query(`DELETE FROM user_branches WHERE "userId" = $1 OR "branchId" = $2`, [oldUserId, oldOrgId]);

    console.log("Deleting old user...");
    await client.query(`DELETE FROM users WHERE id = $1`, [oldUserId]);

    console.log("Deleting old organization...");
    await client.query(`DELETE FROM organizations WHERE id = $1`, [oldOrgId]);

    console.log("Normalizing phone number for new user...");
    await client.query(`UPDATE users SET phone = '+77075160075' WHERE id = $1`, [newUserId]);

    await client.query('COMMIT');
    console.log("Migration completed successfully.");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Error during migration, rolled back:", e);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
