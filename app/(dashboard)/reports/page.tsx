"use client";

import { useEffect, useState } from "react";
import { BarChart3, Download, FileText, Clock, DollarSign, Package, TrendingUp, Loader2 } from "lucide-react";
import { useAppSelector, useFormatCurrency } from "@/lib/hooks";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { DatePickerField } from "@/components/shared/date-picker-field";
import type { ProjectProgressReport, LabourReport, FinancialSummaryReport } from "@/types";

interface ReportCard {
  title: string;
  description: string;
  icon: React.ElementType;
  type: string;
}

const reportTypes: ReportCard[] = [
  { title: "Project Progress", description: "Tasks, timeline, budget status per project", icon: BarChart3, type: "PROJECT_PROGRESS" },
  { title: "Labour Report", description: "Hours per worker, per project, per period", icon: Clock, type: "LABOUR" },
  { title: "Materials Report", description: "Materials used, costs per project/category", icon: Package, type: "MATERIALS" },
  { title: "Financial Summary", description: "Revenue, costs, profit, outstanding invoices", icon: DollarSign, type: "FINANCIAL" },
  { title: "Profitability Report", description: "Margin per project, per client, per period", icon: TrendingUp, type: "PROFITABILITY" },
  { title: "Invoice Aging", description: "Outstanding invoices by days overdue", icon: FileText, type: "INVOICE_AGING" },
];

export default function ReportsPage() {
  const formatCurrency = useFormatCurrency();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [reportData, setReportData] = useState<FinancialSummaryReport | LabourReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function generateReport(type: string) {
    setSelectedReport(type);
    setIsLoading(true);
    setReportData(null);
    try {
      let data: LabourReport | FinancialSummaryReport;
      switch (type) {
        case "LABOUR":
          data = await api.get<LabourReport>("/reporting/labour", { from: dateFrom, to: dateTo });
          break;
        case "FINANCIAL":
          data = await api.get<FinancialSummaryReport>("/reporting/financial-summary", { from: dateFrom, to: dateTo });
          break;
        default:
          data = await api.get<FinancialSummaryReport>("/reporting/financial-summary", { from: dateFrom, to: dateTo });
      }
      setReportData(data);
    } catch {
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" description="Generate insights from your project data." />

      {/* Date range */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 py-4">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <DatePickerField value={dateFrom} onChange={setDateFrom} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <DatePickerField value={dateTo} onChange={setDateTo} className="w-40" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-4">
          {/* Report selection */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reportTypes.map((report) => (
              <Card
                key={report.type}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedReport === report.type ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => generateReport(report.type)}
              >
                <CardContent className="py-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <report.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{report.title}</CardTitle>
                      <CardDescription className="text-xs mt-1">{report.description}</CardDescription>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Report output */}
          {isLoading && (
            <Card className="mt-6">
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span className="text-sm text-muted-foreground">Generating report...</span>
              </CardContent>
            </Card>
          )}

          {reportData && !isLoading && selectedReport === "FINANCIAL" && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Financial Summary</CardTitle>
                <CardDescription>{dateFrom} to {dateTo}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Revenue", value: formatCurrency((reportData as FinancialSummaryReport).revenue || 0), color: "text-emerald-600" },
                    { label: "Costs", value: formatCurrency((reportData as FinancialSummaryReport).costs || 0), color: "text-destructive" },
                    { label: "Profit", value: formatCurrency((reportData as FinancialSummaryReport).profit || 0), color: "text-primary" },
                    { label: "Outstanding", value: formatCurrency((reportData as FinancialSummaryReport).outstandingInvoices || 0), color: "text-amber-600" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border p-4 text-center">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-3.5 w-3.5" /> Export PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {reportData && !isLoading && selectedReport === "LABOUR" && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Labour Report</CardTitle>
                <CardDescription>{dateFrom} to {dateTo}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 mb-4">
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-xs text-muted-foreground">Total Hours</p>
                    <p className="text-xl font-bold">{(reportData as LabourReport).totalHours?.toFixed(1) || 0}</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-xs text-muted-foreground">Total Cost</p>
                    <p className="text-xl font-bold">{formatCurrency((reportData as LabourReport).totalCost || 0)}</p>
                  </div>
                </div>
                {(reportData as LabourReport).entries?.length > 0 && (
                  <div className="space-y-2">
                    {(reportData as LabourReport).entries.slice(0, 10).map((e, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">{e.workerName}</p>
                          <p className="text-xs text-muted-foreground">{e.projectName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{e.hours.toFixed(1)} hrs</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(e.cost)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-3.5 w-3.5" /> Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Previously generated reports will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
