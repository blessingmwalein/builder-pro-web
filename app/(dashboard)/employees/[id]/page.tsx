"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { fetchEmployee } from "@/store/slices/employeesSlice";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { current: employee } = useAppSelector((s) => s.employees);
  const empId = params.id as string;

  useEffect(() => {
    if (empId) dispatch(fetchEmployee(empId));
  }, [dispatch, empId]);

  if (!employee) return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title={employee.user ? `${employee.user.firstName} ${employee.user.lastName}` : employee.employeeCode}>
        <Button variant="outline" size="sm" onClick={() => router.push("/employees")}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
      </PageHeader>

      <Card>
        <CardContent className="flex items-center gap-4 py-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {employee.user ? `${employee.user.firstName[0]}${employee.user.lastName[0]}` : "??"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">{employee.user ? `${employee.user.firstName} ${employee.user.lastName}` : "—"}</h2>
            <p className="text-sm text-muted-foreground">{employee.jobTitle} — {employee.employeeCode}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant={employee.isActive ? "default" : "secondary"}>{employee.isActive ? "Active" : "Inactive"}</Badge>
              <Badge variant="secondary">{employee.employmentType.replace(/_/g, " ")}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{employee.user?.email || "—"}</span></div>
          <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{employee.user?.phone || "—"}</span></div>
          <div><span className="text-muted-foreground">Hourly Rate:</span> <span className="font-medium">{formatCurrency(employee.hourlyRate)}/hr</span></div>
          <div><span className="text-muted-foreground">Start Date:</span> <span className="font-medium">{new Date(employee.startDate).toLocaleDateString()}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
