async function main() {
    const res = await fetch('http://localhost:3000/api/orders');
    if (!res.ok) {
        console.error('Failed to fetch:', res.status);
        return;
    }
    const orders = await res.json();
    const rozhnov = orders.filter(o => o.patient.name.includes('Рожнов') || o.patient.name.includes('Роман'));
    console.log(JSON.stringify(rozhnov, null, 2));
}
main().catch(console.error);
