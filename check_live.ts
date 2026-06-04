import fetch from 'node-fetch';

async function checkLiveCatalog() {
    // 1. Login to get session
    const loginRes = await fetch('https://lensflow-crm.vercel.app/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            email: 'admin@lensflow.kz',
            password: 'admin',
            redirect: 'false'
        }),
        redirect: 'manual'
    });
    
    const setCookie = loginRes.headers.raw()['set-cookie'];
    console.log('Login status:', loginRes.status);
    
    if (!setCookie) {
        console.log('No cookie returned. Body:', await loginRes.text());
        return;
    }
    
    const cookies = setCookie.map(c => c.split(';')[0]).join('; ');
    
    // 2. Fetch catalog
    const catalogRes = await fetch('https://lensflow-crm.vercel.app/api/catalog?include_inactive=true', {
        headers: {
            'Cookie': cookies
        }
    });
    
    console.log('Catalog status:', catalogRes.status);
    const catalogData = await catalogRes.text();
    console.log('Catalog response:', catalogData);
}

checkLiveCatalog().catch(console.error);
