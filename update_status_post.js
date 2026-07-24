const fs = require('fs');
const path = 'src/app/api/orders/[id]/status/route.ts';
let content = fs.readFileSync(path, 'utf8');

// Add import if not exists
if (!content.includes("import { sendWhatsAppMessage }")) {
    content = content.replace("import prisma from '@/lib/db/prisma';", "import prisma from '@/lib/db/prisma';\nimport { sendWhatsAppMessage } from '@/lib/greenApi';");
}

const notificationCode = `
        // Send WhatsApp notifications
        try {
            if (newStatus === 'new_order' && order.status === 'draft') {
                const message = \`🚨 Новый заказ №\${orderNumber} от врача \${order.doctorName || 'Неизвестно'}! Ожидает проверки!\`;
                sendWhatsAppMessage('77004601612@c.us', message).catch(err => console.error('WhatsApp Error:', err));
            } else if (newStatus === 'shipped' && order.status !== 'shipped') {
                const doctorUser = await prisma.user.findUnique({ where: { id: order.createdById } });
                const doctorPhone = doctorUser?.profile?.phone;
                if (doctorPhone) {
                    // Remove non-digits
                    const cleanPhone = String(doctorPhone).replace(/\\D/g, '');
                    if (cleanPhone.length >= 10) {
                        const message = \`✅ Ваш заказ №\${orderNumber} (Пациент: \${updated.patient?.name || 'Не указан'}) готов и передан в доставку!\`;
                        sendWhatsAppMessage(\`\${cleanPhone}@c.us\`, message).catch(err => console.error('WhatsApp Error:', err));
                    }
                }
            }
        } catch (e) {
            console.error('Failed to send WA notification', e);
        }
`;

if (!content.includes("sendWhatsAppMessage('77004601612@c.us'")) {
    content = content.replace("const reverseStatusMap: Record<string, string> =", notificationCode + "\n        const reverseStatusMap: Record<string, string> =");
}

fs.writeFileSync(path, content);
console.log('Updated status route.ts');
