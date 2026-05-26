// Single source of truth for frontend RBAC.
// Each entry maps a feature/action to the permission keys that grant access.
// Backend @Permissions() decorators must match these keys.

export const FEATURE_PERMS = {
  dashboard: [] as string[],

  // Projects
  projects:         ["projects.*", "projects.view"],
  projectsCreate:   ["projects.*", "projects.create"],
  projectsDelete:   ["projects.*", "projects.delete"],
  projectsManage:   ["projects.*"],

  // Tasks
  tasks:            ["tasks.*", "tasks.view"],
  tasksCreate:      ["tasks.*", "tasks.create"],
  tasksAssign:      ["tasks.*", "tasks.assign"],
  tasksComplete:    ["tasks.*", "tasks.complete"],

  // Timesheets
  timesheets:       ["timesheets.*", "timesheets.view_own", "timesheets.view_all"],
  timesheetsApprove:["timesheets.*", "timesheets.approve"],

  // Materials
  materials:        ["materials.*", "materials.log"],
  materialsManage:  ["materials.*", "materials.manage_inventory"],

  // Quotes
  quotes:           ["quotes.*", "quotes.view"],
  quotesCreate:     ["quotes.*", "quotes.create"],
  quotesSend:       ["quotes.*", "quotes.send"],
  quotesApprove:    ["quotes.*", "quotes.approve"],

  // Invoices
  invoices:         ["invoices.*", "invoices.view"],
  invoicesCreate:   ["invoices.*", "invoices.create"],
  invoicesSend:     ["invoices.*", "invoices.send"],
  invoicesMarkPaid: ["invoices.*", "invoices.mark_paid"],

  // Financials
  financials:       ["financials.*", "financials.view"],
  financialsManage: ["financials.*"],

  // Employees
  employees:        ["employees.*", "employees.manage"],

  // CRM
  crm:              ["crm.*", "crm.view"],
  crmManage:        ["crm.*", "crm.manage"],

  // Messaging
  messaging:        ["messaging.*", "messaging.view"],
  messagingSend:    ["messaging.*", "messaging.send"],

  // Documents
  documents:        ["documents.*", "documents.view"],
  documentsUpload:  ["documents.*", "documents.upload"],
  documentsApprove: ["documents.*"],

  // Reports
  reports:          ["reports.*", "reports.view"],

  // Settings (RBAC, company, subscription, workflows)
  settings:         ["settings.*"],
  settingsUsers:    ["settings.*", "employees.*"],
} as const;

export type FeaturePermKey = keyof typeof FEATURE_PERMS;
