import { ItigrisApiClient } from './src/lib/itigris/client';

async function test() {
    const api = new ItigrisApiClient({ company: 'optima_demo', login: 'admin', password: '1', departmentId: 1, organizationId: '' });
    
    let validDept = -1;
    for (let i = 1000000000; i <= 1000000020; i++) {
        try {
            const ok = await api.signInToDepartment(i);
            if (ok) { validDept = i; break; }
        } catch (e: any) { }
    }
    
    if (validDept !== -1) {
        console.log('FOUND VALID DEPT FOR ADMIN:', validDept);
        const rows = await api.getRemains('glasses', validDept, 0);
        console.log(`Success! Fetched ${rows.length} glasses from optima_demo with admin!`);
    } else {
        console.log('Could not find valid dept ID for admin');
    }
}
test();
