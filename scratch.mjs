import axios from 'axios';

const REMOTE_BASE = 'https://optima.itigris.ru';
const client = 'optika_narodnaya';
const key = 'ae8207fa-00eb-43db-b985-06fada966196';

async function test() {
    try {
        const url = `${REMOTE_BASE}/${client}/remoteRemains/list`;
        const resp = await axios.get(url, {
            params: { key, product: 'glasses', page: 1 },
        });
        console.log(resp.data);
    } catch (e) {
        console.error(e.response ? e.response.status : e.message);
    }
}
test();
