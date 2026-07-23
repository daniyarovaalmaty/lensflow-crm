import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

async function main() {
    const connStr = process.env.DIRECT_URL || process.env.DATABASE_URL!;
    const pool = new pg.Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const mainOrgId = 'cmowv0aio000204la3rf3ff0f';
    const branches = {
        aktobe: 'cmppqdyy7000104gshlynzaw6',
        astana: 'cmppqdn94000004gs8rwc1upr',
        kostanay: 'cmppqe8gr000c04l7n2mih9tq'
    };

    // Map department ID to branch ID
    const deptToBranch: Record<number, string> = {
        1000000023: branches.aktobe,
        1000000022: branches.aktobe,
        1000000021: branches.aktobe,
        1000000019: branches.aktobe,
        1000000014: branches.aktobe,
        1000000013: branches.aktobe,
        1000000010: branches.aktobe,
        1000000009: branches.aktobe, // Актобе Склад

        1000000018: branches.astana,
        1000000015: branches.astana,
        1000000007: branches.astana, // Астана Склад
        1000000006: branches.astana,

        1000000024: branches.kostanay,
        1000000020: branches.kostanay,
        1000000017: branches.kostanay,
        1000000012: branches.kostanay,
        1000000004: branches.kostanay,
        1000000003: branches.kostanay, // Костанай Склад
        1000000016: branches.kostanay, // Рудный (Костанайская область)

        1000000005: branches.kostanay, // Цех
        1000000001: branches.kostanay, // Центральный офис
    };

    console.log('Fetching products from main org in batches...');
    
    const products: any[] = [];
    let lastId: string | undefined = undefined;

    while (true) {
        const batch: any = await prisma.opticProduct.findMany({
            where: { 
                organizationId: mainOrgId,
                specs: { path: ['source'], equals: 'itigris' }
            },
            select: {
                id: true,
                sku: true,
                currentStock: true,
                retailPrice: true,
                specs: true
            },
            take: 5000,
            skip: lastId ? 1 : 0,
            ...(lastId ? { cursor: { id: lastId } } : {}),
            orderBy: { id: 'asc' }
        });

        if (batch.length === 0) break;
        products.push(...batch);
        lastId = batch[batch.length - 1].id;
        console.log(`Fetched ${products.length} products so far...`);
    }

    console.log(`Finished fetching. Found ${products.length} products to process.`);

    const getNewSignature = (specs: any) => {
        const idFields = { ...specs };
        delete idFields.price;
        delete idFields.amount;
        delete idFields.quantity;
        delete idFields.count;
        delete idFields.department;
        delete idFields.departmentId;
        delete idFields.source;
        delete idFields.itigrisCategory;

        const cat = specs.itigrisCategory || 'unknown';
        const str = cat + '|' + Object.keys(idFields).sort()
            .map(k => `${k}=${idFields[k] ?? ''}`).join('|');
        
        let h = 0;
        for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
        return `ITG-M-${cat}-${(h >>> 0).toString(36)}`;
    };

    // Grouping structure: branchId -> newSku -> [products]
    const grouped = new Map<string, Map<string, typeof products>>();

    let unmapped = 0;

    for (const p of products) {
        const specs = p.specs as any;
        const deptId = specs?.department;
        let branchId = deptToBranch[deptId];
        
        if (!branchId) {
            unmapped++;
            branchId = mainOrgId; // Leave unmapped in main org
        }

        const newSku = getNewSignature(specs);

        let branchMap = grouped.get(branchId);
        if (!branchMap) {
            branchMap = new Map();
            grouped.set(branchId, branchMap);
        }

        let skuArray = branchMap.get(newSku);
        if (!skuArray) {
            skuArray = [];
            branchMap.set(newSku, skuArray);
        }
        skuArray.push(p);
    }

    console.log(`Grouped products. Unmapped items: ${unmapped}`);
    console.log('Starting migration transactions...');

    let processedGroups = 0;
    let deletedCount = 0;

    // Process branch by branch, chunk by chunk
    for (const [branchId, branchMap] of grouped.entries()) {
        console.log(`Processing branch ${branchId} with ${branchMap.size} unique SKUs`);
        
        const chunks = [];
        const entries = Array.from(branchMap.values());
        
        for (let i = 0; i < entries.length; i += 50) {
            chunks.push(entries.slice(i, i + 50));
        }

        const queryWithRetry = async (queryText: string, params?: any[]) => {
            let retries = 5;
            while (retries > 0) {
                try {
                    return await pool.query(queryText, params);
                } catch (e: any) {
                    if (e.message.includes('Connection terminated unexpectedly') || e.message.includes('read ECONNRESET')) {
                        retries--;
                        console.log(`Connection dropped, retrying... (${retries} retries left)`);
                        await new Promise(r => setTimeout(r, 2000));
                    } else {
                        throw e;
                    }
                }
            }
            throw new Error('Max retries reached for query');
        };

        let chunkIndex = 0;
        for (const chunk of chunks) {
            chunkIndex++;
            if (chunkIndex % 10 === 0) console.log(`  Processing chunk ${chunkIndex}/${chunks.length}...`);
            try {
                const updateValues = [];
                const deleteIds = [];
                const queryParams = [];
                let paramIndex = 1;

                for (const items of chunk) {
                    const master = items[0];
                    const specs = master.specs as any;
                    const newSku = getNewSignature(specs);

                    let totalStock = 0;
                    let maxPrice = 0;

                    for (const item of items) {
                        totalStock += item.currentStock;
                        if (item.retailPrice > maxPrice) maxPrice = item.retailPrice;
                    }

                    const newSpecs = { ...specs };
                    delete newSpecs.department;
                    delete newSpecs.departmentId;

                    // Prepare update row
                    updateValues.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, CAST($${paramIndex++} AS INTEGER), CAST($${paramIndex++} AS DOUBLE PRECISION), CAST($${paramIndex++} AS JSONB))`);
                    queryParams.push(master.id, branchId, newSku, newSku.toLowerCase(), totalStock, maxPrice, JSON.stringify(newSpecs));

                    // Prepare delete ids
                    for (let i = 1; i < items.length; i++) {
                        deleteIds.push(`'${items[i].id}'`);
                        deletedCount++;
                    }
                    processedGroups++;
                }

                if (updateValues.length > 0) {
                    const updateQuery = `
                        UPDATE optic_products AS op
                        SET 
                            "organizationId" = v.org_id,
                            "sku" = v.sku,
                            "slug" = v.slug,
                            "currentStock" = v.stock,
                            "retailPrice" = v.price,
                            "specs" = v.specs
                        FROM (VALUES ${updateValues.join(', ')}) AS v(id, org_id, sku, slug, stock, price, specs)
                        WHERE op.id = v.id;
                    `;
                    try {
                        await queryWithRetry(updateQuery, queryParams);
                    } catch (err: any) {
                        if (err.code === '23505') {
                            console.log('    Bulk update hit duplicate SKU. Falling back to sequential and deleting ghosts...');
                            let offsetParam = 1;
                            for (const items of chunk) {
                                const master = items[0];
                                const specs = master.specs as any;
                                const newSku = getNewSignature(specs);
                                let totalStock = 0; let maxPrice = 0;
                                for (const item of items) {
                                    totalStock += item.currentStock;
                                    if (item.retailPrice > maxPrice) maxPrice = item.retailPrice;
                                }
                                const newSpecs = { ...specs };
                                delete newSpecs.department; delete newSpecs.departmentId;
                                
                                try {
                                    await queryWithRetry(
                                        `UPDATE optic_products SET "organizationId" = $1, "sku" = $2, "slug" = $3, "currentStock" = $4, "retailPrice" = $5, "specs" = $6 WHERE id = $7`,
                                        [branchId, newSku, newSku.toLowerCase(), totalStock, maxPrice, JSON.stringify(newSpecs), master.id]
                                    );
                                } catch (e: any) {
                                    if (e.code === '23505') {
                                        // Ghost duplicate! The master is already in the target branch.
                                        await queryWithRetry(`DELETE FROM optic_products WHERE id = $1`, [master.id]);
                                    } else throw e;
                                }
                            }
                        } else throw err;
                    }
                }

                if (deleteIds.length > 0) {
                    const deleteQuery = `DELETE FROM optic_products WHERE id IN (${deleteIds.join(', ')})`;
                    await queryWithRetry(deleteQuery);
                }
            } catch (err) {
                console.error('Error in chunk:', err);
                throw err;
            }
        }
    }

    console.log(`Migration completed successfully!`);
    console.log(`Processed ${processedGroups} unique SKUs.`);
    console.log(`Deleted ${deletedCount} duplicate entries.`);
    
    await prisma.$disconnect();
    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
