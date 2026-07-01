require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => {
  client.query('SELECT id, name, category FROM optic_products WHERE name ILIKE \'%Подбор торических ночных линз + Годовое обслуживание%\' LIMIT 5')
    .then(res => console.log(res.rows))
    .finally(() => client.end());
});
