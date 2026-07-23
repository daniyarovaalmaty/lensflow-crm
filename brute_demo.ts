import { ItigrisApiClient } from './src/lib/itigris/client';

async function test() {
    const api = new ItigrisApiClient({ company: 'optima_demo', login: 'optima_demo', password: 'optima_demo', departmentId: 1, organizationId: '' });
    
    let validDept = -1;
    // Try 1-20
    for (let i = 1; i <= 20; i++) {
        try {
            const ok = await api.signInToDepartment(i);
            if (ok) { validDept = i; break; }
        } catch (e: any) { }
    }
    
    if (validDept === -1) {
        // Try 1000000000 to 1000000020
        for (let i = 1000000000; i <= 1000000020; i++) {
            try {
                const ok = await api.signInToDepartment(i);
                if (ok) { validDept = i; break; }
            } catch (e: any) { }
        }
    }
    
    if (validDept !== -1) {
        console.log('FOUND VALID DEPT:', validDept);
        const depts = await api.getDepartments();
        console.log('All depts:', depts.map((d: any) => d.id));
        
        console.log('Fetching products...');
        const rows = await api.getRemains('glasses', validDept, 0);
        console.log(`Success! Fetched ${rows.length} glasses from optima_demo!`);
    } else {
        console.log('Could not find valid dept ID for optima_demo');
    }
}
test();
