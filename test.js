const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
    const leads = await prisma.lead.findMany({ select: { id: true, phone: true }, take: 5, orderBy: { createdAt: "desc" } });
    console.log("Leads:", leads);
    const messages = await prisma.chatMessage.findMany({ select: { id: true, leadId: true, content: true, direction: true, createdAt: true }, take: 10, orderBy: { createdAt: "desc" } });
    console.log("Messages:", messages);
}
main();
