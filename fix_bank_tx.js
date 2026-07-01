require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

client.connect().then(async () => {
  try {
    await client.query('BEGIN');

    // Get organization ID from the first transaction
    const orgRes = await client.query('SELECT "organizationId" FROM financial_transactions LIMIT 1');
    const orgId = orgRes.rows[0].organizationId;

    // Create Bank account
    const createRes = await client.query(`
      INSERT INTO company_accounts (id, "organizationId", name, balance, "createdAt", "updatedAt")
      VALUES ('bank_' || extract(epoch from now()), $1, 'Банк / Расчетный счет', 0, now(), now())
      RETURNING id
    `, [orgId]);
    const bankId = createRes.rows[0].id;

    // The old cash account ID
    const cashId = 'cmqjalwy70000ai6ljmsuveb5';

    // Transaction ID for medinn vision lab (2M)
    const txId = 'cmqyx07m4000504kyhac073pt';

    // Move transaction to Bank account
    await client.query(`
      UPDATE financial_transactions
      SET "accountId" = $1
      WHERE id = $2
    `, [bankId, txId]);

    // Update balances: Cash account loses 2M, Bank account gains 2M
    await client.query(`
      UPDATE company_accounts
      SET balance = balance - 2000000
      WHERE id = $1
    `, [cashId]);

    await client.query(`
      UPDATE company_accounts
      SET balance = balance + 2000000
      WHERE id = $1
    `, [bankId]);

    await client.query('COMMIT');
    console.log('Successfully created bank account and moved transaction');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
  } finally {
    client.end();
  }
});
