const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// 1. Add engineerId to Order
if (!schema.includes('engineerId      String?')) {
    schema = schema.replace(
        '  createdById     String?\n  createdBy       User?        @relation("CreatedBy", fields: [createdById], references: [id])',
        '  createdById     String?\n  createdBy       User?        @relation("CreatedBy", fields: [createdById], references: [id])\n  engineerId      String?\n  engineer        User?        @relation("OrderEngineer", fields: [engineerId], references: [id])'
    );
}

// 2. Add relation to User model
if (!schema.includes('engineeredOrders Order[] @relation("OrderEngineer")')) {
    schema = schema.replace(
        '  orders Order[] @relation("CreatedBy")',
        '  orders Order[] @relation("CreatedBy")\n  engineeredOrders Order[] @relation("OrderEngineer")'
    );
}

// 3. Add LabSettings fields
if (!schema.includes('normContrapolPerLens')) {
    schema = schema.replace(
        '  urgentDiscountPercent    Int    @default(0)',
        '  urgentDiscountPercent    Int    @default(0)\n  normContrapolPerLens    Float  @default(0)\n  normWaxPerLens          Float  @default(0)\n  normBoxPerOrder         Int    @default(0)\n  normPackagePerOrder     Int    @default(0)\n  normStickerPerLens      Int    @default(0)'
    );
}

fs.writeFileSync('prisma/schema.prisma', schema);
