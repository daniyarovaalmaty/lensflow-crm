import { z } from 'zod';

// ==================== Lens Types ====================
export const LensTypeEnum = z.enum(['medilens']);
export type LensType = z.infer<typeof LensTypeEnum>;

// ==================== Dk Values ====================
export const DkEnum = z.enum(['50', '100', '125', '180']);
export type DkValue = z.infer<typeof DkEnum>;

// ==================== Characteristic (lens design) ====================
export const CharacteristicEnum = z.enum(['toric', 'spherical', 'rgp']);
export type Characteristic = z.infer<typeof CharacteristicEnum>;

export const CharacteristicLabels: Record<Characteristic, string> = {
    toric: 'Торическая',
    spherical: 'Сферическая',
    rgp: 'RGP',
};

// ==================== Color options per Dk ====================
export const ColorsByDk: Record<string, string[]> = {
    '50': ['Тёмно-синий', 'Тёмно-зелёный'],
    '100': ['Синий', 'Зелёный', 'Фиолетовый'],
    '125': ['Синий', 'Зелёный', 'Фиолетовый', 'Красный'],
    '180': ['Голубой', 'Салатовый'],
};

// ==================== Preprocess helpers ====================
// HTML form inputs send "" for empty selects and NaN for empty number inputs.
// These helpers coerce those to undefined so Zod .optional() works correctly.
const optionalNumber = z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number.isNaN(Number(val)) ? undefined : Number(val)),
    z.number().optional()
);

const optionalBoundedNumber = (min: number, max: number) =>
    z.preprocess(
        (val) => (val === '' || val === null || val === undefined || Number.isNaN(Number(val)) ? undefined : Number(val)),
        z.number().min(min).max(max).optional()
    );

const optionalEnum = <T extends [string, ...string[]]>(enumSchema: z.ZodEnum<T>) =>
    z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? undefined : val),
        enumSchema.optional()
    );

// ==================== Eye Parameters (Orthokeratology) ====================
export const OrthoEyeParamsSchema = z.object({
    characteristic: optionalEnum(CharacteristicEnum),
    myorthok: z.boolean().optional(),
    km: optionalNumber,
    tp: optionalNumber,
    dia: optionalNumber,
    e1: optionalNumber,
    e2: optionalNumber,
    tor: optionalNumber,
    trial: z.boolean().optional(),
    color: z.string().optional(),
    dk: optionalEnum(DkEnum),
    apical_clearance: optionalBoundedNumber(-9, 9),
    compression_factor: optionalBoundedNumber(-4.5, 4.5),
    qty: z.preprocess(
        (val) => (val === '' || val === null || val === undefined || Number.isNaN(Number(val)) ? 1 : Number(val)),
        z.number().int().min(1).max(100).default(1)
    ),
});

export type OrthoEyeParams = z.infer<typeof OrthoEyeParamsSchema>;

// ==================== Patient ====================
export const PatientSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
    phone: z.string().regex(/^\+?[\d\s\-()]{10,20}$/, 'Неверный формат телефона'),
    email: z.string().email('Неверный email').optional(),
    notes: z.string().optional(),
});

export type Patient = z.infer<typeof PatientSchema>;

// ==================== Order Status ====================
export const OrderStatusEnum = z.enum([
    'new',
    'in_production',
    'ready',
    'rework',
    'shipped',
    'cancelled',
]);

export type OrderStatus = z.infer<typeof OrderStatusEnum>;

export const OrderStatusLabels: Record<OrderStatus, string> = {
    new: 'Новый',
    in_production: 'В производстве',
    ready: 'Готов',
    rework: 'На доработку',
    shipped: 'Отгружен',
    cancelled: 'Отменен',
};

export const OrderStatusColors: Record<OrderStatus, string> = {
    new: 'bg-blue-100 text-blue-700',
    in_production: 'bg-yellow-100 text-yellow-700',
    ready: 'bg-green-100 text-green-700',
    rework: 'bg-orange-100 text-orange-700',
    shipped: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700',
};

// ==================== Payment Status ====================
export const PaymentStatusEnum = z.enum(['unpaid', 'paid', 'partial']);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

export const PaymentStatusLabels: Record<PaymentStatus, string> = {
    unpaid: 'Не оплачен',
    paid: 'Оплачен',
    partial: 'Частично',
};

export const PaymentStatusColors: Record<PaymentStatus, string> = {
    unpaid: 'bg-gray-100 text-gray-500',
    paid: 'bg-emerald-100 text-emerald-700',
    partial: 'bg-amber-100 text-amber-700',
};

// ==================== Lens Configuration ====================
export const LensConfigSchema = z.object({
    type: LensTypeEnum,
    eyes: z.object({
        od: OrthoEyeParamsSchema,
        os: OrthoEyeParamsSchema,
    }),
});

export type LensConfig = z.infer<typeof LensConfigSchema>;

// ==================== Order Metadata ====================
export const OrderMetaSchema = z.object({
    optic_id: z.string(),
    optic_name: z.string(),
    doctor: z.string().optional(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

export type OrderMeta = z.infer<typeof OrderMetaSchema>;

// ==================== Defect Record ====================
export const DefectRecordSchema = z.object({
    id: z.string(),
    qty: z.number().int().min(1),
    date: z.string().datetime(),
    note: z.string().optional(),
    archived: z.boolean().optional(),
});

export type DefectRecord = z.infer<typeof DefectRecordSchema>;

// ==================== Complete Order ====================
export const OrderSchema = z.object({
    order_id: z.string(),
    meta: OrderMetaSchema,
    patient: PatientSchema,
    config: LensConfigSchema,
    company: z.string().optional(),
    inn: z.string().optional(),
    delivery_method: z.string().optional(),
    delivery_address: z.string().optional(),
    doctor_email: z.string().email().optional().or(z.literal('')),
    status: OrderStatusEnum,
    tracking_number: z.string().optional(),
    production_started_at: z.string().datetime().optional(),
    production_completed_at: z.string().datetime().optional(),
    shipped_at: z.string().datetime().optional(),
    notes: z.string().optional(),
    payment_status: PaymentStatusEnum.optional(),
    defects: z.array(DefectRecordSchema).optional(),
});

export type Order = z.infer<typeof OrderSchema>;

// ==================== Create Order DTO ====================
export const CreateOrderSchema = OrderSchema.omit({
    order_id: true,
    meta: true,
    status: true,
    tracking_number: true,
    production_started_at: true,
    production_completed_at: true,
    shipped_at: true,
}).extend({
    optic_id: z.string(),
    doctor: z.string().optional(),
});

export type CreateOrderDTO = z.infer<typeof CreateOrderSchema>;

// ==================== Update Order Status DTO ====================
export const UpdateOrderStatusSchema = z.object({
    status: OrderStatusEnum,
    notes: z.string().optional(),
});

export type UpdateOrderStatusDTO = z.infer<typeof UpdateOrderStatusSchema>;
