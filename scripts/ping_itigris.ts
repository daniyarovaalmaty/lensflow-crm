import axios from 'axios';

async function ping() {
    try {
        console.log("Pinging POST sign/in optima...");
        const response = await axios.post('https://optima.itigris.ru/optika_narodnaya/api/v1/sign/in', {
            company: "optika_narodnaya", login: "test", password: "test"
        }, { timeout: 5000 });
        console.log(`Success! Status: ${response.status}`);
    } catch (e: any) {
        console.error(`Error: ${e.message}`);
    }
}
ping();
