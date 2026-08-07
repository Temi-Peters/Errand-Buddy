import { z } from 'zod';

const roleSchema = z.preprocess(
  (value) => String(value || '').toUpperCase(),
  z.enum(['CUSTOMER', 'RUNNER'], { message: 'Role must be CUSTOMER or RUNNER' })
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

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Enter a valid email').transform((value) => value.toLowerCase())
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().trim().min(1, 'Reset token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters')
  })
});

export const adminDeleteUserSchema = z.object({
  params: z.object({ id: z.string().trim().min(1, 'User id is required') }),
  body: z.object({
    reason: z.string().trim().max(500, 'Reason must be 500 characters or fewer').optional(),
    force: z.boolean().optional()
  }).optional().default({})
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
    onBehalfOf: z.string().trim().optional().nullable(),
    // What the customer agrees to spend on the shopping itself. Optional — some
    // errands (a prescription already paid for) have no goods cost at all.
    goodsBudget: z.preprocess(
      (v) => (v === '' || v == null ? undefined : v),
      z.coerce.number().min(0, 'Budget cannot be negative').max(1000, 'Budget looks too high').optional()
    ),
    substitutionPreference: z.enum(['ASK_ME_FIRST', 'SUBSTITUTE_FREELY', 'NO_SUBSTITUTES']).optional()
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

export const completeBookingSchema = z.object({
  params: idParamSchema,
  body: z.object({
    goodsCost: z.coerce.number().min(0).max(1000).optional(),
    overageReason: z.string().trim().max(500, 'Note must be 500 characters or fewer').optional()
  })
});

export const bookingItemsSchema = z.object({
  params: idParamSchema,
  body: z.object({
    items: z.array(z.object({
      name: z.string().trim().min(1, 'Each item needs a name').max(200),
      quantity: z.string().trim().max(40).optional(),
      backupName: z.string().trim().max(200).optional().nullable()
    })).max(60, 'That is a very long list — please split it across bookings')
  })
});

export const itemStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    itemId: z.string().min(1)
  }),
  body: z.object({
    status: z.enum(['PENDING', 'BOUGHT', 'SUBSTITUTED', 'UNAVAILABLE']),
    substitutedWith: z.string().trim().max(200).optional().nullable()
  })
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

export const feedbackSchema = z.object({
  body: z.object({
    wouldUse: z.enum(['Yes', 'Maybe', 'No'], { message: 'Please choose whether you would use ErrandBuddy' }),
    valueRating: z.coerce.number().int().min(1, 'Please give a rating').max(5, 'Rating must be 1-5'),
    pricePreference: z.string().trim().min(1, 'Please choose a price range'),
    standoutFeature: z.string().trim().min(1, 'Please choose a standout feature'),
    comment: z.string().trim().max(1000, 'Comment must be 1000 characters or fewer').optional().nullable(),
    email: z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().email('Enter a valid email').optional())
  })
});

export const contactSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
    email: z.string().trim().email('Enter a valid email'),
    message: z.string().trim().min(5, 'Please write a short message').max(2000, 'Message must be 2000 characters or fewer')
  })
});

export const createClaimSchema = z.object({
  body: z.object({
    bookingId: z.string().trim().min(1, 'Booking is required'),
    category: z.string().trim().min(1, 'Please choose a reason'),
    description: z.string().trim().min(10, 'Please describe the issue (at least 10 characters)').max(2000, 'Description must be 2000 characters or fewer')
  })
});

export const resolveClaimSchema = z.object({
  params: idParamSchema,
  body: z.object({
    action: z.enum(['resolve', 'reject'], { message: 'Action must be resolve or reject' }),
    note: z.string().trim().max(2000, 'Note must be 2000 characters or fewer').optional(),
    refundAmount: z.coerce.number().min(0).max(1000).optional()
  })
});
