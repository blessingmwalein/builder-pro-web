"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { fetchClient } from "@/store/slices/crmSlice";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { current: client } = useAppSelector((s) => s.crm);
  const clientId = params.id as string;

  useEffect(() => {
    if (clientId) dispatch(fetchClient(clientId));
  }, [dispatch, clientId]);

  if (!client) {
    return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={client.name}>
        <Button variant="outline" size="sm" onClick={() => router.push("/crm")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Badge variant="secondary">{client.clientType}</Badge>
      </PageHeader>

      {/* Contact card */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:gap-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {client.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <h2 className="text-lg font-semibold">{client.name}</h2>
            {client.contactPerson && <p className="text-sm text-muted-foreground">Contact: {client.contactPerson}</p>}
          </div>
          <div className="flex flex-col gap-2 text-sm">
            {client.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{client.email}</div>}
            {client.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{client.phone}</div>}
            {client.address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{client.address}</div>}
          </div>
        </CardContent>
      </Card>

      {/* Financials summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(client.totalRevenue || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Outstanding Balance</p>
            <p className={`text-2xl font-bold ${(client.outstandingBalance || 0) > 0 ? "text-destructive" : ""}`}>
              {formatCurrency(client.outstandingBalance || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* History tabs */}
      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projects ({client.projects?.length || 0})</TabsTrigger>
          <TabsTrigger value="quotes">Quotes ({client.quotes?.length || 0})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({client.invoices?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4">
          <Card>
            <CardContent className="py-4">
              {client.projects && client.projects.length > 0 ? (
                <div className="space-y-2">
                  {client.projects.map((p) => (
                    <button
                      key={p.id}
                      className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-muted/50"
                      onClick={() => router.push(`/projects/${p.id}`)}
                    >
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.code}</p>
                      </div>
                      <StatusBadge status={p.status} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No projects with this client.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <Card>
            <CardContent className="py-4">
              {client.quotes && client.quotes.length > 0 ? (
                <div className="space-y-2">
                  {client.quotes.map((q) => (
                    <button
                      key={q.id}
                      className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-muted/50"
                      onClick={() => router.push(`/quotes/${q.id}`)}
                    >
                      <div>
                        <p className="text-sm font-medium">{q.title}</p>
                        <p className="text-xs text-muted-foreground">{q.referenceNumber}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{formatCurrency(q.total)}</span>
                        <StatusBadge status={q.status} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No quotes for this client.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="py-4">
              {client.invoices && client.invoices.length > 0 ? (
                <div className="space-y-2">
                  {client.invoices.map((inv) => (
                    <button
                      key={inv.id}
                      className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-muted/50"
                      onClick={() => router.push(`/invoices/${inv.id}`)}
                    >
                      <div>
                        <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{formatCurrency(inv.total)}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No invoices for this client.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notes */}
      {client.notes && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{client.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
