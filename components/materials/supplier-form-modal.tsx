"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  createMaterialCategory,
  createSupplier,
  fetchMaterialCategories,
} from "@/store/slices/materialsSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function SupplierFormModal({ open, onOpenChange, onSaved }: Props) {
  const dispatch = useAppDispatch();
  const { categories } = useAppSelector((s) => s.materials);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Custom category fields
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  useEffect(() => {
    if (open) void dispatch(fetchMaterialCategories());
  }, [open, dispatch]);

  useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setWebsite("");
      setNotes("");
      setSelectedCodes([]);
      setShowAddCategory(false);
      setNewCatName("");
    }
  }, [open]);

  function toggleCategory(code: string) {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  async function handleAddCustomCategory() {
    if (!newCatName.trim()) return;
    setAddingCategory(true);
    try {
      const formattedCode = newCatName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_");
      const result = await dispatch(
        createMaterialCategory({
          name: newCatName.trim(),
          code: formattedCode,
        })
      ).unwrap();
      
      setSelectedCodes(prev => [...prev, result.code]);
      setNewCatName("");
      setShowAddCategory(false);
      toast.success("Category added");
    } catch (err: any) {
      toast.error(err.message || "Failed to add category");
    } finally {
      setAddingCategory(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    setSaving(true);
    try {
      await dispatch(
        createSupplier({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          website: website.trim() || undefined,
          notes: notes.trim() || undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          categories: selectedCodes.join(",") || undefined,
        } as any),
      ).unwrap();
      toast.success(`Supplier ${name.trim()} added`);
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Failed to add supplier");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Supplier</DialogTitle>
          <DialogDescription>
            Record a hardware supplier. Assign one or more material categories so
            quotes and purchases can filter by supplier specialisation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Electrosales" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, country" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Website</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label>Product Categories Supplied</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-xs" 
                onClick={() => setShowAddCategory(!showAddCategory)}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Custom
              </Button>
            </div>

            {showAddCategory && (
              <div className="flex gap-2 mb-2 animate-in fade-in slide-in-from-top-1">
                <Input 
                  placeholder="Category Name" 
                  value={newCatName} 
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomCategory()}
                />
                <Button 
                  size="sm" 
                  className="h-8" 
                  onClick={handleAddCustomCategory}
                  disabled={addingCategory || !newCatName.trim()}
                >
                  {addingCategory ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-3 max-h-48 overflow-y-auto">
              {categories.length === 0 ? (
                <p className="col-span-full text-xs text-muted-foreground">
                  No categories found. Add one to get started.
                </p>
              ) : (
                categories.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors"
                  >
                    <Checkbox
                      checked={selectedCodes.includes(cat.code)}
                      onCheckedChange={() => toggleCategory(cat.code)}
                    />
                    <span className="truncate" title={cat.name}>{cat.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Supplier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
