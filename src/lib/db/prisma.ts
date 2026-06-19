import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

function createPrismaClient() {
    const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL || 'postgresql://localhost:5432/lensflow';
    
    const pool = new pg.Pool({ 
        connectionString,
        max: 5,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 20000
    });
    const adapter = new PrismaPg(pool);

    const client = new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    });

    // Tenant Isolation Middleware
    return client.$extends({
        query: {
            $allModels: {
                async deleteMany({ model, args, query }) {
                    const protectedModels = ['OpticProduct', 'Sale', 'SaleItem', 'Order', 'StockDocument', 'StockItem', 'StockMovement', 'Lead', 'Patient'];
                    if (protectedModels.includes(model)) {
                        if (!args.where || (!args.where.organizationId && !args.where.id)) {
                            throw new Error(`[Tenant Isolation] БЛОКИРОВКА: Попытка выполнить глобальный deleteMany для таблицы ${model} без указания organizationId!`);
                        }
                    }
                    return query(args);
                },
                async updateMany({ model, args, query }) {
                    const protectedModels = ['OpticProduct', 'Sale', 'SaleItem', 'Order', 'StockDocument', 'StockItem', 'StockMovement', 'Lead', 'Patient'];
                    if (protectedModels.includes(model)) {
                        if (!args.where || (!args.where.organizationId && !args.where.id)) {
                            throw new Error(`[Tenant Isolation] БЛОКИРОВКА: Попытка выполнить глобальный updateMany для таблицы ${model} без указания organizationId!`);
                        }
                    }
                    return query(args);
                }
            }
        }
    });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
    prisma: ExtendedPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
