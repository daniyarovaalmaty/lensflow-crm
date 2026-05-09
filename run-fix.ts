import { GET } from './src/app/api/fix-phones/route';
GET().then(res => res.json()).then(console.log).catch(console.error);
