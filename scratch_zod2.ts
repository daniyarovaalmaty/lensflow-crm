import { CreateOrderSchema } from './src/types/order.js';

const body = {
    optic_id: 'OPT-001',
    patient: { name: 'Test' },
    config: {
        type: 'medilens',
        eyes: {
            od: { characteristic: 'toric', km: "41.5", dia: "10.2", dk: "100", tor: "0.75", qty: "1" },
            os: { characteristic: 'toric', km: "43", dia: "10.2", dk: "125", tor: "1", qty: "1", apical_clearance: "1", compression_factor: "2.2" }
        }
    }
};

const validated = CreateOrderSchema.safeParse(body);
console.dir(validated, {depth: null});
