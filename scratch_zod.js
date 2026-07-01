const { z } = require('zod');

const optionalNumber = z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number.isNaN(Number(val)) ? undefined : Number(val)),
    z.number().optional()
);

const optionalEnum = (enumSchema) =>
    z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? undefined : val),
        enumSchema.optional()
    );

const CharacteristicEnum = z.enum(['toric', 'spherical']);
const DkEnum = z.enum(['50', '100', '125', '180']);

const OrthoEyeParamsSchema = z.object({
    characteristic: optionalEnum(CharacteristicEnum),
    isRgp: z.boolean().optional(),
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
    apical_clearance: optionalNumber,
    compression_factor: optionalNumber,
    qty: z.preprocess(
        (val) => (val === '' || val === null || val === undefined || Number.isNaN(Number(val)) ? 1 : Number(val)),
        z.number().int().default(1)
    ),
}).refine(data => {
    if (data.characteristic === 'toric') {
        if (data.tor === undefined || data.tor === null || data.tor === 0) {
            return false;
        }
    }
    return true;
});

const LensTypeEnum = z.enum(['medilens']);
const LensConfigSchema = z.object({
    type: LensTypeEnum,
    eyes: z.object({
        od: OrthoEyeParamsSchema,
        os: OrthoEyeParamsSchema,
    }),
});

const input = {
  type: "medilens",
  eyes: {
    od: {
      characteristic: "toric",
      km: 41.5,
      dia: 10.2,
      dk: "100",
      tor: 0.75,
      qty: "1"
    },
    os: {
      characteristic: "toric",
      km: 43,
      dia: 10.2,
      dk: "125",
      tor: 1,
      qty: "1"
    }
  }
};

const result = LensConfigSchema.safeParse(input);
console.dir(result, { depth: null });
