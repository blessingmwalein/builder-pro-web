"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Search } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchEmployees } from "@/store/slices/employeesSlice";
import { fetchProjects } from "@/store/slices/projectsSlice";
import { createConversation } from "@/store/slices/messagingSlice";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateConversationDialog({ open, onOpenChange }: Props) {
  const dispatch = useAppDispatch();
  const employees = useAppSelector((s) => s.employees.items);
  const projects = useAppSelector((s) => s.projects.items);
  const currentUser = useAppSelector((s) => s.auth.user);

  const [type, setType] = useState<"DIRECT" | "PROJECT">("PROJECT");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      dispatch(fetchEmployees({ limit: 100 }));
      dispatch(fetchProjects({ limit: 100 }));
      setType("PROJECT");
      setTitle("");
      setProjectId("");
      setSearch("");
      setSelectedParticipants([]);
    }
  }, [open, dispatch]);

  const filteredEmployees = employees.filter(
    (e) =>
      e.user?.id !== currentUser?.id &&
      (e.user?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        e.user?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
        e.user?.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleParticipant = (userId: string) => {
    if (selectedParticipants.includes(userId)) {
      setSelectedParticipants((prev) => prev.filter((id) => id !== userId));
    } else {
      setSelectedParticipants((prev) => [...prev, userId]);
    }
  };

  const handleSubmit = async () => {
    if (selectedParticipants.length === 0) return;
    if (type === "PROJECT" && !projectId) return;

    setIsLoading(true);
    try {
      await dispatch(
        createConversation({
          type,
          projectId: type === "PROJECT" ? projectId : undefined,
          title: type === "PROJECT" ? title || undefined : undefined,
          participantIds: selectedParticipants,
        })
      ).unwrap();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Chat</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Chat Type</Label>
            <RadioGroup
              value={type}
              onValueChange={(val: "DIRECT" | "PROJECT") => {
                setType(val);
                if (val === "DIRECT" && selectedParticipants.length > 1) {
                  // Direct can only have 1 participant (plus currentUser)
                  setSelectedParticipants([selectedParticipants[0]]);
                }
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PROJECT" id="t-project" />
                <Label htmlFor="t-project">Group / Project</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="DIRECT" id="t-direct" />
                <Label htmlFor="t-direct">Direct Message</Label>
              </div>
            </RadioGroup>
          </div>

          {type === "PROJECT" && (
            <>
              <div className="space-y-2">
                <Label>Link to Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Group Name (Optional)</Label>
                <Input
                  placeholder="E.g. Site Team Alpha"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-3">
            <Label>Add Participants {type === "DIRECT" && "(Select 1)"}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {selectedParticipants.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedParticipants.map((id) => {
                  const emp = employees.find((e) => e.userId === id);
                  return (
                    <Badge key={id} variant="secondary" className="flex items-center gap-1">
                      {emp?.user?.firstName} {emp?.user?.lastName}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => toggleParticipant(id)}
                      />
                    </Badge>
                  );
                })}
              </div>
            )}

            <ScrollArea className="h-48 rounded-md border">
              <div className="p-2 space-y-1">
                {filteredEmployees.map((emp) => {
                  if (!emp.user) return null;
                  const isSelected = selectedParticipants.includes(emp.user.id);
                  const disabled = type === "DIRECT" && !isSelected && selectedParticipants.length >= 1;
                  return (
                    <div
                      key={emp.id}
                      onClick={() => !disabled && toggleParticipant(emp.user!.id)}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted/50 ${
                        disabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {emp.user.firstName} {emp.user.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">{emp.user.email}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  );
                })}
                {filteredEmployees.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">No matching users</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || selectedParticipants.length === 0 || (type === "PROJECT" && !projectId)}
          >
            {isLoading ? "Creating..." : "Start Chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
