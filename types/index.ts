// ============================================================
// BuilderPro — Core TypeScript Types
// Aligned with NestJS API: http://localhost:3005/api/v1
// ============================================================

// ---- Enums ----

export type AccountType = "COMPANY" | "INDIVIDUAL";
export type ProjectStatus = "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
export type ProjectType = "RESIDENTIAL" | "COMMERCIAL" | "RENOVATION" | "INDUSTRIAL" | "INFRASTRUCTURE";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type QuoteStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "CONVERTED";
export type InvoiceStatus = "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "VOID";
export type TimeEntryStatus = "ACTIVE" | "PENDING" | "APPROVED" | "REJECTED";
export type VariationType = "ADDITION" | "OMISSION" | "SUBSTITUTION";
export type EmploymentType = "FULL_TIME" | "PART_TIME" | "SUBCONTRACTOR" | "CASUAL";
export type ClientType = "RESIDENTIAL" | "COMMERCIAL" | "GOVERNMENT" | "OTHER";
export type ConversationType = "PROJECT" | "DIRECT";
export type DocumentType = "PLAN" | "PHOTO" | "CONTRACT" | "REPORT" | "OTHER";
export type PaymentMethod = "PAYNOW" | "ECOCASH" | "BANK_TRANSFER" | "CASH" | "CARD";
export type BillingCycle = "MONTHLY" | "ANNUAL";
export type SubscriptionStatus = "TRIAL" | "TRIAL_EXPIRED" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "PENDING_PAYMENT" | "NONE";
export type LineItemCategory = "Labour" | "Materials" | "Equipment" | "Subcontractors" | "Overheads" | "Margin";

// ---- Pagination ----

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

// ---- Auth & User ----

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  roles: Role[];
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  industry: string;
  countryCode: string;
  defaultCurrency: string;
  timezone: string;
  isActive: boolean;
  accountType: AccountType;
}

export interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  permissions: string[];
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
}

export interface RegisterRequest {
  companyName: string;
  industry: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  planCode: string;
}

export interface RegisterResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  company: {
    id: string;
    name: string;
    slug: string;
  };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  subscription: SubscriptionInfo;
}

export interface MeResponse {
  user: User;
  tenant: Tenant;
  permissions: string[];
}

export interface InviteRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  roleId: string;
}

export interface InviteResponse {
  userId: string;
  email: string;
  inviteToken: string;
  inviteLink: string;
  expiresAt: string;
}

// ---- Subscription ----

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  planCode: string;
  planName: string;
  description?: string;
  billingCycle?: BillingCycle;
  currentPeriodFrom?: string;
  currentPeriodTo?: string;
  trialEndsAt?: string | null;
  trialDaysLeft?: number | null;
  limits: { maxUsers: number; maxProjects: number; storageGb: number };
  features?: string[];
  isExpired?: boolean;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  description?: string;
  targetAccountType?: AccountType | null;
  monthlyPrice: string | number;
  annualPrice: string | number;
  limits: { maxUsers: number; maxProjects: number; storageGb: number };
  features?: string[];
  sortOrder?: number;
  isActive?: boolean;
}

// ---- Subscription Payments ----

export type SubscriptionPaymentMethod = "PAYNOW" | "ECOCASH";

export interface ActivateSubscriptionRequest {
  planCode: string;
  method: SubscriptionPaymentMethod;
  billingCycle: BillingCycle;
  payerEmail: string;
  payerPhone?: string;
}

export interface ActivateSubscriptionResponse {
  status: SubscriptionStatus;
  planCode?: string;
  planName?: string;
  billingCycle?: BillingCycle;
  amount?: number;
  currency?: string;
  paymentUrl?: string | null;
  instructions?: string | null;
  pollUrl?: string | null;
  providerReference?: string | null;
  entitlements?: { limits?: Record<string, number>; features?: string[] };
  message?: string;
}

export interface PollPaymentRequest {
  reference: string;
  pollUrl: string;
}

export interface PollPaymentResponse {
  paid: boolean;
  status: string;
  amount?: number;
  reference?: string;
}

// ---- RBAC ----

export interface RolePermission {
  id: string;
  permission: {
    id: string;
    key: string;
    description: string;
  };
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  permissions?: RolePermission[];
  _count?: { userRoles: number };
}

// ---- Projects ----

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  projectType: ProjectType;
  siteAddress: string | null;
  startDate: string;
  endDate: string | null;
  completionPercent: number;
  baselineBudget: number;
  projectManagerId: string | null;
  clientId: string | null;
  client?: Client;
  projectManager?: User;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDashboard {
  project: Project;
  taskCounts: { total: number; todo: number; inProgress: number; done: number; blocked: number };
  budgetUtilisation: { total: number; spent: number; remaining: number; percentUsed: number };
  timeline: { startDate: string; endDate: string; daysElapsed: number; totalDays: number };
  alerts: ProjectAlert[];
  members: ProjectMember[];
  recentActivity: ActivityItem[];
}

export interface ProjectAlert {
  type: "BUDGET_THRESHOLD" | "TASK_OVERDUE" | "PENDING_APPROVAL" | "UNINVOICED_WORK";
  message: string;
  severity: "warning" | "error" | "info";
}

export interface ProjectMember {
  userId: string;
  user: User;
  role: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  description: string;
  user: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface CreateProjectRequest {
  code?: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
  projectType: ProjectType;
  siteAddress?: string;
  projectManagerId?: string;
  clientId?: string;
  startDate: string;
  endDate?: string;
  baselineBudget?: number;
}

// ---- Tasks ----

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  parentTaskId: string | null;
  assignees: User[];
  comments?: TaskComment[];
  checklists?: Checklist[];
  project?: Project;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  content: string;
  user: User;
  createdAt: string;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface CreateTaskRequest {
  projectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  parentTaskId?: string;
  assigneeIds?: string[];
}

// ---- Time Tracking ----

export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string;
  taskId: string | null;
  clockInAt: string;
  clockOutAt: string | null;
  breakMinutes: number;
  totalHours: number | null;
  status: TimeEntryStatus;
  gpsInLat: number | null;
  gpsInLng: number | null;
  gpsOutLat: number | null;
  gpsOutLng: number | null;
  notes: string | null;
  approvedBy: string | null;
  approvalComment: string | null;
  user?: User;
  project?: Project;
  task?: Task;
  createdAt: string;
}

export interface ClockInRequest {
  projectId: string;
  taskId?: string;
  gpsInLat?: number;
  gpsInLng?: number;
}

export interface ClockOutRequest {
  breakMinutes?: number;
  gpsOutLat?: number;
  gpsOutLng?: number;
}

export interface WeeklySummary {
  weekStart: string;
  totalHours: number;
  days: { date: string; hours: number; entries: TimeEntry[] }[];
}

// ---- Materials ----

export interface Material {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  unitCost: number;
  currentStock: number;
  reorderAt: number;
  supplierId: string | null;
  supplier?: Supplier;
  createdAt: string;
}

export interface MaterialUsageLog {
  id: string;
  projectId: string;
  materialId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplierId: string | null;
  notes: string | null;
  loggedById: string;
  material?: Material;
  project?: Project;
  loggedBy?: User;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
}

export interface CreateMaterialUsageRequest {
  projectId: string;
  materialId: string;
  quantity: number;
  unitCost: number;
  supplierId?: string;
  notes?: string;
}

// ---- Quotes ----

export interface Quote {
  id: string;
  referenceNumber: string;
  clientId: string;
  projectId: string | null;
  title: string;
  status: QuoteStatus;
  issueDate: string;
  expiryDate: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  notes: string | null;
  paymentTerms: string | null;
  lineItems: QuoteLineItem[];
  client?: Client;
  project?: Project;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteLineItem {
  id?: string;
  category: LineItemCategory;
  description: string;
  quantity: number;
  unitPrice: number;
  total?: number;
}

export interface CreateQuoteRequest {
  clientId: string;
  projectId?: string;
  title: string;
  issueDate: string;
  expiryDate?: string;
  taxRate?: number;
  discountAmount?: number;
  notes?: string;
  paymentTerms?: string;
  lineItems: Omit<QuoteLineItem, "id" | "total">[];
}

export interface Variation {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  type: VariationType;
  status: QuoteStatus;
  lineItems: QuoteLineItem[];
  total: number;
  createdAt: string;
}

// ---- Invoices ----

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  projectId: string | null;
  quoteId: string | null;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  retentionPct: number;
  notes: string | null;
  paymentTerms: string | null;
  lineItems: InvoiceLineItem[];
  payments: Payment[];
  client?: Client;
  project?: Project;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total?: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  method: PaymentMethod;
  amount: number;
  paidAt: string;
  reference: string | null;
}

export interface CreateInvoiceRequest {
  clientId: string;
  projectId?: string;
  quoteId?: string;
  issueDate: string;
  dueDate: string;
  retentionPct?: number;
  notes?: string;
  paymentTerms?: string;
  lineItems: Omit<InvoiceLineItem, "id" | "total">[];
}

export interface AgingReport {
  current: Invoice[];
  thirtyDays: Invoice[];
  sixtyDays: Invoice[];
  ninetyPlus: Invoice[];
  totalOutstanding: number;
}

// ---- Financials ----

export interface FinancialDashboard {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  profitMargin: number;
  outstandingInvoices: number;
  cashFlow: { month: string; revenue: number; costs: number }[];
  projectProfitability: { projectId: string; projectName: string; revenue: number; costs: number; profit: number }[];
}

export interface ProjectBudget {
  projectId: string;
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  percentUsed: number;
  lines: BudgetLine[];
}

export interface BudgetLine {
  categoryId: string;
  categoryName: string;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
  thresholdPct: number;
}

export interface BudgetCategory {
  id: string;
  code: string;
  name: string;
}

export interface FinancialTransaction {
  id: string;
  projectId: string;
  categoryId: string;
  description: string;
  amount: number;
  occurredAt: string;
  reference: string | null;
  category?: BudgetCategory;
  createdAt: string;
}

// ---- Employees ----

export interface Employee {
  id: string;
  userId: string;
  employeeCode: string;
  jobTitle: string;
  employmentType: EmploymentType;
  hourlyRate: number;
  startDate: string;
  isActive: boolean;
  user?: User;
  createdAt: string;
}

export interface CreateEmployeeRequest {
  userId: string;
  employeeCode?: string;
  jobTitle: string;
  employmentType: EmploymentType;
  hourlyRate: number;
  startDate: string;
}

export interface PayrollExportEntry {
  employeeId: string;
  employeeName: string;
  hoursWorked: number;
  hourlyRate: number;
  grossPay: number;
}

// ---- CRM / Clients ----

export interface Client {
  id: string;
  name: string;
  contactPerson: string | null;
  clientType: ClientType;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  projects?: Project[];
  quotes?: Quote[];
  invoices?: Invoice[];
  totalRevenue?: number;
  outstandingBalance?: number;
  createdAt: string;
}

export interface CreateClientRequest {
  name: string;
  contactPerson?: string;
  clientType: ClientType;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

// ---- Messaging ----

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string | null;
  projectId: string | null;
  participants: User[];
  lastMessage: Message | null;
  unreadCount: number;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  body: string;
  senderId: string;
  sender?: User;
  createdAt: string;
}

// ---- Notifications ----

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data: Record<string, unknown>;
  createdAt: string;
}

// ---- Documents ----

export interface Document {
  id: string;
  fileKey: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  projectId: string | null;
  type: DocumentType;
  folder: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  downloadUrl?: string;
  uploadedBy?: User;
  createdAt: string;
}

// ---- Reports ----

export interface ProjectProgressReport {
  projectId: string;
  projectName: string;
  taskCompletion: number;
  budgetUtilisation: number;
  timelineStatus: "ON_TRACK" | "DELAYED" | "AHEAD";
  milestones: { name: string; dueDate: string; status: string }[];
}

export interface LabourReport {
  entries: { workerId: string; workerName: string; projectName: string; hours: number; cost: number }[];
  totalHours: number;
  totalCost: number;
}

export interface FinancialSummaryReport {
  revenue: number;
  costs: number;
  profit: number;
  outstandingInvoices: number;
  marginPercent: number;
}
