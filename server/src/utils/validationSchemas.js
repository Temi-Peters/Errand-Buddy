import { z } from 'zod';

const roleSchema = z.preprocess(
  (value) => String(value || '').toUpperCase(),
  z.enum(['CUSTOMER', 'RUNNER', 'ADMIN'], { message: 'Role must be CUSTOMER, RUNNER, or ADMIN' })
);

const serviceTypeSchema = z.preprocess(
  (value) => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
  z.enum(['DOG_WALKING', 'GROCERY_SHOPPING', 'PRESCRIPTION_PICKUP', 'DRY_CLEANING', 'GENERAL_ERRANDS'], { message: 'Valid service type is required' })
);

const bookingTypeSchema = z.preprocess(
  (value) => String(value || '').toLowerCase().includes('weekly') ? 'WEEKLY_SUBSCRIPTION' : String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
  z.enum(['ONE_OFF_TASK', 'WEEKLY_SUBSCRIPTION'], { message: 'Valid booking type is required' })
);

const idParamSchema = z.object({
  id: z.string().min(1, 'Booking id is required')
});

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required'),
    email: z.string().trim().email('Valid email is required').transform((value) => value.toLowerCase()),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: roleSchema,
    address: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    postcodeArea: z.string().trim().optional(),
    area: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    bio: z.string().trim().max(1000, 'Bio must be 1000 characters or fewer').optional(),
    transportMethod: z.string().trim().optional(),
    availabilityNotes: z.string().trim().max(1000, 'Availability notes must be 1000 characters or fewer').optional(),
    agreement: z.boolean().optional()
  }).superRefine((data, context) => {
    if (data.role === 'RUNNER' && !data.area) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Runner registration requires area', path: ['area'] });
    }
    if (data.role === 'RUNNER' && !data.phone) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Runner registration requires phone', path: ['phone'] });
    }
    if (data.role === 'RUNNER' && !data.transportMethod) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Runner registration requires transport method', path: ['transportMethod'] });
    }
    if (data.role === 'RUNNER' && data.agreement !== true) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Runner agreement is required', path: ['agreement'] });
    }

    if (data.role === 'CUSTOMER') {
      for (const field of ['address', 'phone', 'postcodeArea']) {
        if (!data[field]) {
          context.addIssue({ code: z.ZodIssueCode.custom, message: `Customer registration requires ${field}`, path: [field] });
        }
      }
    }
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Valid email is required').transform((value) => value.toLowerCase()),
    password: z.string().min(1, 'Password is required')
  })
});

export const createBookingSchema = z.object({
  body: z.object({
    serviceType: serviceTypeSchema,
    bookingType: bookingTypeSchema,
    subscriptionPlan: z.string().trim().optional().nullable(),
    subscription: z.string().trim().optional().nullable(),
    date: z.string().trim().min(1, 'Date is required'),
    time: z.string().trim().min(1, 'Time is required'),
    instructions: z.string().trim().min(1, 'Instructions are required'),
    address: z.string().trim().min(1, 'Address is required'),
    contactPhone: z.string().trim().min(1, 'Contact phone is required'),
    postcodeArea: z.string().trim().min(1, 'Postcode area is required'),
    price: z.coerce.number().positive('Price must be a positive number')
  })
});

export const updateBookingSchema = z.object({
  params: idParamSchema,
  body: z.object({
    runnerId: z.string().trim().optional().nullable(),
    status: z.string().trim().optional()
  }).refine((data) => data.runnerId !== undefined || data.status !== undefined, 'No booking updates provided')
});

export const bookingIdSchema = z.object({
  params: idParamSchema
});

export const messageSchema = z.object({
  params: idParamSchema,
  body: z.object({
    receiverId: z.string().trim().optional(),
    body: z.string().trim().min(1, 'Message body is required').max(1000, 'Message body must be 1000 characters or fewer')
  })
});

export const reviewSchema = z.object({
  params: idParamSchema,
  body: z.object({
    stars: z.coerce.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
    review: z.string().trim().max(1000, 'Review must be 1000 characters or fewer').optional()
  })
});
