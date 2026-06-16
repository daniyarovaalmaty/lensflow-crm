const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
});

async function main() {
  await client.connect();
  console.log('Connected to DB');
  
  const res = await client.query("SELECT id, name FROM organizations WHERE name LIKE '%Демо Лаборатория%'");
  console.log('Found:', res.rows);
  
  for (let row of res.rows) {
      try {
          await client.query("DELETE FROM organizations WHERE id = $1", [row.id]);
          console.log(`Deleted ${row.id}`);
      } catch (e) {
          console.log(`Failed to delete ${row.id}, setting to blocked`);
          await client.query("UPDATE organizations SET status = 'blocked' WHERE id = $1", [row.id]);
          // To be safe, let's also make sure it doesn't appear in the UI if the UI doesn't filter by status.
          await client.query("UPDATE organizations SET type = 'standalone' WHERE id = $1", [row.id]);
      }
  }
  
  await client.end();
}

main().catch(console.error);
