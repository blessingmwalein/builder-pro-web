"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, ShieldBan, ShieldCheck, Trash2 } from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { deleteEmployee, fetchEmployee, toggleEmployeeStatus, updateEmployee } from "@/store/slices/employeesSlice";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { JobTitleSelect } from "@/components/shared/job-title-select";
import { DatePickerField } from "@/components/shared/date-picker-field";
import type { EmploymentType } from "@/types";

type EditEmployeeForm = {
  jobTitle: string;
  employmentType: EmploymentType;
  hourlyRate: number;
  startDate: string;
};

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { current: employee } = useAppSelector((s) => s.employees);
  const empId = params.id as string;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [editData, setEditData] = useState<EditEmployeeForm>({
    jobTitle: "",
    employmentType: "FULL_TIME",
    hourlyRate: 0,
    startDate: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (empId) dispatch(fetchEmployee(empId));
  }, [dispatch, empId]);

  useEffect(() => {
    if (!employee) return;
    setEditData({
      jobTitle: employee.jobTitle,
      employmentType: employee.employmentType,
      hourlyRate: Number(employee.hourlyRate ?? 0),
      startDate: employee.startDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    });
  }, [employee]);

  async function onSaveEdit() {
    if (!employee) return;
    if (!editData.jobTitle.trim()) {
      toast.error("Job title is required");
      return;
    }
    setIsSaving(true);
    try {
      await dispatch(updateEmployee({
        id: employee.id,
        data: {
          employeeCode: employee.employeeCode,
          userId: employee.userId,
          jobTitle: editData.jobTitle.trim(),
          employmentType: editData.employmentType,
          hourlyRate: Number(editData.hourlyRate),
          startDate: editData.startDate,
        },
      })).unwrap();
      toast.success("Employee updated");
      setIsEditOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update employee";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function onToggleStatus() {
    if (!employee) return;
    setIsStatusUpdating(true);
    try {
      await dispatch(toggleEmployeeStatus({ id: employee.id, isActive: !employee.isActive })).unwrap();
      toast.success(employee.isActive ? "Employee deactivated" : "Employee activated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update employee status";
      toast.error(message);
    } finally {
      setIsStatusUpdating(false);
    }
  }

  async function onDeleteEmployee() {
    if (!employee) return;
    try {
      await dispatch(deleteEmployee(employee.id)).unwrap();
      toast.success("Employee deleted");
      router.push("/employees");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete employee";
      toast.error(message);
    }
  }

  if (!employee) return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title={employee.user ? `${employee.user.firstName} ${employee.user.lastName}` : employee.employeeCode}>
        <Button variant="outline" size="sm" onClick={() => router.push("/employees")}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
        <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
        <Button variant="outline" size="sm" onClick={onToggleStatus} disabled={isStatusUpdating}>
          {isStatusUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : employee.isActive ? <ShieldBan className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
          {employee.isActive ? "Deactivate" : "Activate"}
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setIsDeleteOpen(true)}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee details and role assignment.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Job Title</Label>
              <JobTitleSelect
                value={editData.jobTitle}
                onChange={(value) => setEditData((prev) => ({ ...prev, jobTitle: value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <Select
                value={editData.employmentType}
                onValueChange={(value: string | null) => {
                  if (!value) return;
                  setEditData((prev) => ({ ...prev, employmentType: value as EmploymentType }));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">Full Time</SelectItem>
                  <SelectItem value="PART_TIME">Part Time</SelectItem>
                  <SelectItem value="SUBCONTRACTOR">Subcontractor</SelectItem>
                  <SelectItem value="CASUAL">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hourly Rate (USD)</Label>
              <Input
                type="number"
                step="0.01"
                value={editData.hourlyRate}
                onChange={(e) => setEditData((prev) => ({ ...prev, hourlyRate: Number(e.target.value || 0) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <DatePickerField
                value={editData.startDate}
                onChange={(value) => setEditData((prev) => ({ ...prev, startDate: value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button type="button" onClick={onSaveEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This action removes the employee record and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteEmployee}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}