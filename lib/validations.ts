// ============================================================
// ownit2buildit — Zod validation schemas
// ============================================================

import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  industry: z.string().min(1, "Select an industry").default("Construction"),
  planCode: z.string().default("STARTER"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional().or(z.literal("")),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[0-9]/, "Must include a number")
    .regex(/[^A-Za-z0-9]/, "Must include a special character"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[0-9]/, "Must include a number"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const activateSubscriptionSchema = z.object({
  planCode: z.string().min(1, "Plan is required"),
  method: z.enum(["PAYNOW", "ECOCASH"]),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]).default("MONTHLY"),
  payerEmail: z.string().email("Enter a valid email"),
  payerPhone: z.string().optional(),
}).refine(
  (d) => d.method !== "ECOCASH" || (d.payerPhone && d.payerPhone.length >= 10),
  { message: "Phone number is required for EcoCash", path: ["payerPhone"] }
);

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  projectType: z.enum(["RESIDENTIAL", "COMMERCIAL", "RENOVATION", "INDUSTRIAL", "INFRASTRUCTURE"]),
  siteAddress: z.string().optional(),
  clientId: z.string().optional(),
  projectManagerId: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  baselineBudget: z.coerce.number().min(0).optional(),
});

export const createTaskSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.coerce.number().min(0).optional(),
  assigneeIds: z.array(z.string()).optional(),
});

export const createClientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  contactPerson: z.string().optional(),
  clientType: z.enum(["RESIDENTIAL", "COMMERCIAL", "GOVERNMENT", "OTHER"]),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const createQuoteSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  projectId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  expiryDate: z.string().optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  lineItems: z.array(z.object({
    category: z.enum(["Labour", "Materials", "Equipment", "Subcontractors", "Overheads", "Margin"]),
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().min(0.01, "Quantity must be positive"),
    unitPrice: z.coerce.number().min(0, "Price must be non-negative"),
  })).min(1, "At least one line item is required"),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  projectId: z.string().optional(),
  quoteId: z.string().optional(),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  retentionPct: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1),
    quantity: z.coerce.number().min(0.01),
    unitPrice: z.coerce.number().min(0),
  })).min(1, "At least one line item is required"),
});

export const createEmployeeSchema = z.object({
  userId: z.string().min(1, "User is required"),
  employeeCode: z.string().optional(),
  jobTitle: z.string().min(1, "Job title is required"),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "SUBCONTRACTOR", "CASUAL"]),
  hourlyRate: z.coerce.number().min(0, "Rate must be non-negative"),
  startDate: z.string().min(1, "Start date is required"),
});

export const createMaterialSchema = z.object({
  name: z.string().min(1, "Material name is required"),
  sku: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  unitCost: z.coerce.number().min(0),
  supplierId: z.string().optional(),
});

export const logMaterialUsageSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  materialId: z.string().min(1, "Material is required"),
  quantity: z.coerce.number().min(0.01, "Quantity must be positive"),
  unitCost: z.coerce.number().min(0),
  supplierId: z.string().optional(),
  notes: z.string().optional(),
});

// Use z.output for form data types since z.coerce transforms input types
export type LoginFormData = z.output<typeof loginSchema>;
export type RegisterFormData = z.output<typeof registerSchema>;
export type CreateProjectFormData = z.output<typeof createProjectSchema>;
export type CreateTaskFormData = z.output<typeof createTaskSchema>;
export type CreateClientFormData = z.output<typeof createClientSchema>;
export type CreateQuoteFormData = z.output<typeof createQuoteSchema>;
export type CreateInvoiceFormData = z.output<typeof createInvoiceSchema>;
export type CreateEmployeeFormData = z.output<typeof createEmployeeSchema>;
