const axios = require('axios');

const BASE = 'https://optima.itigris.ru/optika_narodnaya/api/v2';

async function main() {
  console.log('🔐 Signing in to ITIGRIS...');
  
  // Sign in - returns accessToken + refreshToken
  const signIn = await axios.post(`${BASE}/sign/in`, {
    company: 'optika_narodnaya',
    login: 'topmanager',
    password: '987654321',
    departmentId: 1000000001,
  });
  
  const token = signIn.data?.accessToken || signIn.data?.token;
  console.log('✅ Token received:', token ? token.substring(0, 20) + '...' : 'NONE');
  console.log('Full sign-in response keys:', Object.keys(signIn.data || {}));
  
  if (!token) {
    console.log('Full response:', JSON.stringify(signIn.data, null, 2));
    return;
  }

  const headers = { Authorization: `Bearer ${token}` };

  // Get departments
  const resp = await axios.get(`${BASE}/departments`, { headers, params: { page: 0, size: 200 } });
  const departments = resp.data?.content || resp.data || [];
  
  console.log(`\n📍 Всего точек: ${departments.length}\n`);
  
  for (const d of departments) {
    const type = (d.type || '-').padEnd(12);
    const city = (d.city || '-').padEnd(15);
    console.log(`  ID: ${d.id}\t${type}\t${city}\t${d.name}`);
  }
}

main().catch(e => {
  console.error('Error:', e.response?.status, e.response?.data || e.message);
});
