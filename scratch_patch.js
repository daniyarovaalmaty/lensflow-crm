const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});
async function main() {
  await client.connect();
  
  const validConfig = {
      type: "medilens",
      eyes: {
          od: {
              km: 43.0,
              tp: 1.5,
              dia: 10.6,
              dk: "100",
              qty: 1,
              characteristic: "spherical"
          },
          os: {
              km: 43.5,
              tp: 1.5,
              dia: 10.6,
              dk: "100",
              qty: 1,
              characteristic: "toric"
          }
      }
  };
  
  await client.query("UPDATE orders SET \"lensConfig\" = $1 WHERE \"organizationId\" = 'org-demo-clinic';", [JSON.stringify(validConfig)]);
  console.log('Fixed lens configs!');
  await client.end();
}
main().catch(console.error);
