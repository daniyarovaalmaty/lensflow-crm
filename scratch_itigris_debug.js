/**
 * ITIGRIS API Debug — using the CONFIRMED working credentials from git history
 * Commit 5158191: "Department ID 1000000007 confirmed working, 43 clients verified"
 */

const https = require('https');

// Credentials confirmed working in commit 5158191
const CONFIGS_TO_TRY = [
    { company: 'optima_demo', login: 'optima_demo', password: 'optima_demo', departmentId: 1000000007 },
    { company: 'optima_demo', login: 'optima_demo', password: 'optima_demo', departmentId: 1000000001 },
    { company: 'demo', login: 'optima_demo', password: 'optima_demo', departmentId: 1000000007 },
];

function request(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const req = https.request({
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: { 'Content-Type': 'application/json', ...(options.headers||{}) },
        }, (res) => {
            if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
                const loc = res.headers.location.startsWith('http') 
                    ? res.headers.location 
                    : new URL(res.headers.location, url).href;
                // Don't follow redirects to itigris.ru marketing site
                if (loc.includes('www.itigris.ru')) {
                    return resolve({ status: 404, data: `Redirect to: ${loc}` });
                }
                return resolve(request(loc, options));
            }
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, data: data.slice(0,500) }));
        });
        req.on('error', reject);
        if (options.body) req.write(JSON.stringify(options.body));
        req.end();
    });
}

async function tryConfig(config) {
    const baseURL = `https://optima.itigris.ru/${config.company}/api/v2`;
    console.log(`\nTrying: company="${config.company}" dept=${config.departmentId}`);
    console.log(`  URL: ${baseURL}/sign/in`);
    
    const r = await request(`${baseURL}/sign/in`, {
        method: 'POST',
        body: { 
            company: config.company, 
            login: config.login, 
            password: config.password, 
            departmentId: config.departmentId 
        }
    });
    
    if (r.status === 200 && r.data.includes('accessToken')) {
        const parsed = JSON.parse(r.data);
        console.log(`  ✅ SUCCESS! accessToken received`);
        
        // Try to list clients
        const authHeaders = { Authorization: `Bearer ${parsed.accessToken}` };
        const clients = await request(
            `${baseURL}/clients?clientSearchType=FULL_NAME&searchQuery=%D0%90&deleted=false&page=0&size=5`,
            { headers: authHeaders }
        );
        const cData = JSON.parse(clients.data);
        console.log(`  Clients total: ${cData.totalElements || 0}`);
        return true;
    } else {
        console.log(`  ❌ Status: ${r.status}, Response: ${r.data.slice(0, 150)}`);
        return false;
    }
}

async function main() {
    console.log('🔍 ITIGRIS — Testing confirmed-working credentials from git history');
    console.log('(Commit 5158191: "43 clients, dept 1000000007 confirmed working")');
    
    for (const config of CONFIGS_TO_TRY) {
        try {
            const ok = await tryConfig(config);
            if (ok) {
                console.log('\n🎉 Found working config!');
                console.log(`Company: ${config.company}`);
                console.log(`DepartmentId: ${config.departmentId}`);
                return;
            }
        } catch(e) {
            console.log(`  Error: ${e.message}`);
        }
    }
    
    console.log('\n❌ None of the configs worked.');
    console.log('The optima_demo account may have changed or been disabled.');
}

main().catch(console.error);
