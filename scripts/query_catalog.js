const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const productsRes = await client.query("SELECT id, name, description, category, \"isActive\" FROM products WHERE category = 'lens'");
  const products = productsRes.rows;

  console.log("DB Products length:", products.length);

  // Filter isActive
  const activeProducts = products.filter(p => p.isActive);
  console.log("Active Products:", activeProducts.map(p => p.description));

  const validDescriptions = new Set(['toric', 'spherical', 'rgp', 'probe', 'trial']);
  
  const oldFiltered = activeProducts.filter(p => p.category === 'lens' && p.description != null && validDescriptions.has(p.description));
  console.log("Old Filtered:", oldFiltered.map(p => p.description));

  const newFiltered = activeProducts.filter(p => p.category === 'lens' && p.description != null && (
      p.description === 'toric' || p.description.startsWith('toric_') ||
      p.description === 'spherical' || p.description.startsWith('spherical_') ||
      p.description === 'rgp' || p.description === 'probe' || p.description === 'trial'
  ));
  console.log("New Filtered:", newFiltered.map(p => p.description));

  await client.end();
}
main().catch(console.error);
