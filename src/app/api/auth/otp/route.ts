/**
 * OTP via WhatsApp — Send & Verify
 * POST /api/auth/otp
 * 
 * Action: "send" — sends a 4-digit code to WhatsApp
 * Action: "verify" — checks the code and returns a temp token
 */
import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/greenApi';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

function normalizePhone(phone: string): string {
    let digits = phone.replace(/\D/g, '');
    // Kazakhstan: 8xxx → 7xxx
    if (digits.startsWith('8') && digits.length === 11) {
        digits = '7' + digits.slice(1);
    }
    // Add country code if 10 digits
    if (digits.length === 10) {
        digits = '7' + digits;
    }
    return digits;
}

function generateCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, phone, code: inputCode } = body;

        if (!phone) {
            return NextResponse.json({ error: 'Номер телефона обязателен' }, { status: 400 });
        }

        const normalizedPhone = normalizePhone(phone);
        if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
            return NextResponse.json({ error: 'Неверный формат номера' }, { status: 400 });
        }

        // ==================== SEND ====================
        if (action === 'send') {
            // Rate limit: max 1 code per 60 seconds
            const existing = await prisma.otpCode.findUnique({ where: { phone: normalizedPhone } });
            if (existing && existing.expiresAt.getTime() > Date.now() + 4 * 60 * 1000) {
                // Code was sent less than 60 seconds ago
                return NextResponse.json({ error: 'Код уже отправлен. Подождите 60 секунд.' }, { status: 429 });
            }

            const code = generateCode();
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min TTL
            
            await prisma.otpCode.upsert({
                where: { phone: normalizedPhone },
                update: { code, expiresAt, attempts: 0 },
                create: { phone: normalizedPhone, code, expiresAt, attempts: 0 }
            });

            // Send via WhatsApp
            const message = `🔐 LensFlow — ваш код входа: ${code}\n\nКод действителен 5 минут. Никому не сообщайте этот код.`;
            
            try {
                await sendWhatsAppMessage(`${normalizedPhone}@c.us`, message);
            } catch (waError) {
                console.error('[OTP] WhatsApp send failed:', waError);
                // Still return success — user can retry
                return NextResponse.json({ error: 'Не удалось отправить код. Проверьте номер и повторите.' }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                message: 'Код отправлен в WhatsApp',
                phone: normalizedPhone.replace(/(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})/, '+$1 ($2) ***-**-$5'),
            });
        }

        // ==================== VERIFY ====================
        if (action === 'verify') {
            if (!inputCode) {
                return NextResponse.json({ error: 'Введите код' }, { status: 400 });
            }

            const stored = await prisma.otpCode.findUnique({ where: { phone: normalizedPhone } });
            if (!stored) {
                return NextResponse.json({ error: 'Код устарел или не был отправлен' }, { status: 400 });
            }

            if (stored.expiresAt.getTime() < Date.now()) {
                await prisma.otpCode.delete({ where: { phone: normalizedPhone } });
                return NextResponse.json({ error: 'Срок действия кода истёк' }, { status: 400 });
            }

            if (stored.attempts >= 3) {
                await prisma.otpCode.delete({ where: { phone: normalizedPhone } });
                return NextResponse.json({ error: 'Слишком много попыток. Запросите новый код.' }, { status: 400 });
            }

            if (stored.code !== inputCode) {
                await prisma.otpCode.update({
                    where: { phone: normalizedPhone },
                    data: { attempts: stored.attempts + 1 }
                });
                return NextResponse.json({ error: 'Неверный код' }, { status: 400 });
            }

            // Valid!
            await prisma.otpCode.delete({ where: { phone: normalizedPhone } });

            // Check if user exists in LensFlow
            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        { phone: normalizedPhone },
                        { phone: `+${normalizedPhone}` },
                    ],
                },
                include: { organization: true },
            });

            return NextResponse.json({
                success: true,
                verified: true,
                phone: normalizedPhone,
                userExists: !!existingUser,
                userId: existingUser?.id || null,
            });
        }

        return NextResponse.json({ error: 'Неверное действие. Используйте send или verify.' }, { status: 400 });
    } catch (error) {
        console.error('[OTP] Error:', error);
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
    }
}
