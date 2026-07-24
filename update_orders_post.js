const fs = require('fs');
const path = 'src/app/api/orders/route.ts';
let content = fs.readFileSync(path, 'utf8');

// Add import if not exists
if (!content.includes("import { sendWhatsAppMessage }")) {
    content = content.replace("import prisma from '@/lib/db/prisma';", "import prisma from '@/lib/db/prisma';\nimport { sendWhatsAppMessage } from '@/lib/greenApi';");
}

// Add notification logic after order creation (around line 650, before "break; // Success")
const notificationCode = `
                // Send WhatsApp notification to accountant if order is new
                if (updateData.status === 'new_order') {
                    try {
                        const message = \`🚨 Новый заказ №\${orderNumber} от врача \${validatedData.doctor || session.user.profile?.fullName || 'Неизвестно'}! Сумма: \${totalPrice.toLocaleString('ru-RU')} ₸. Ожидает проверки!\`;
                        // Send async so it doesn't block
                        sendWhatsAppMessage('77004601612@c.us', message).catch(err => console.error('WhatsApp Error:', err));
                    } catch (e) {}
                }
`;
if (!content.includes("sendWhatsAppMessage('77004601612@c.us'")) {
    content = content.replace("break; // Success", notificationCode + "\n                break; // Success");
}

fs.writeFileSync(path, content);
console.log('Updated route.ts');
