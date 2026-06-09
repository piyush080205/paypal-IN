import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { ShieldCheck, Plus, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("paypal_token");
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const CATEGORY_LABELS: Record<string, string> = {
  unauthorised: "Unauthorised Transaction",
  item_not_received: "Item Not Received",
  item_not_as_described: "Item Not as Described",
  billing: "Billing Issue",
  other: "Other",
};

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
    open: { label: "Open", class: "bg-blue-100 text-blue-700", icon: <AlertCircle size={12} /> },
    under_review: { label: "Under Review", class: "bg-yellow-100 text-yellow-700", icon: <Clock size={12} /> },
    resolved: { label: "Resolved", class: "bg-green-100 text-green-700", icon: <CheckCircle2 size={12} /> },
    closed: { label: "Closed", class: "bg-gray-100 text-gray-600", icon: <XCircle size={12} /> },
  };
  const c = config[status] || config.open;
  return (
    <Badge className={`${c.class} border-none flex items-center gap-1 text-xs`}>
      {c.icon} {c.label}
    </Badge>
  );
}

export default function ResolutionCentre() {
  const queryClient = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [form, setForm] = useState({ transactionId: "", category: "", description: "" });

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ["disputes"],
    queryFn: () => apiFetch("/resolution-centre"),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["my-transactions-for-dispute"],
    queryFn: () => apiFetch("/transactions?limit=50"),
    select: (d: any) => d.transactions || [],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiFetch("/resolution-centre", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Case opened successfully");
      setOpenNew(false);
      setForm({ transactionId: "", category: "", description: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck size={28} className="text-[#0070ba]" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resolution Centre</h1>
            <p className="text-sm text-gray-500">Raise and track disputes on your transactions</p>
          </div>
        </div>
        <Button
          className="bg-[#0070ba] hover:bg-[#003087] rounded-full"
          onClick={() => setOpenNew(true)}
        >
          <Plus size={16} className="mr-2" /> Open a Case
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>How it works:</strong> If you have a problem with a transaction — unauthorised charges, items not received, or billing issues — you can open a case here. Our team will review and respond within 3–5 business days.
      </div>

      {/* Cases list */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading cases...</div>
      ) : disputes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ShieldCheck size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No open cases</p>
            <p className="text-sm text-gray-400 mt-1">You haven't raised any disputes yet</p>
            <Button
              className="mt-4 bg-[#0070ba] hover:bg-[#003087] rounded-full"
              onClick={() => setOpenNew(true)}
            >
              Open a Case
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {disputes.map((d: any) => (
            <Card
              key={d.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedCase(d)}
            >
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-[#003087]">{d.caseId}</span>
                      <StatusBadge status={d.status} />
                    </div>
                    <p className="text-sm font-medium">{CATEGORY_LABELS[d.category] || d.category}</p>
                    <p className="text-xs text-gray-500 mt-1">Transaction: {d.transactionId}</p>
                    <p className="text-xs text-gray-400 line-clamp-1 mt-1">{d.description}</p>
                  </div>
                  <div className="text-xs text-gray-400 text-right">
                    Opened {format(new Date(d.createdAt), "MMM d, yyyy")}
                    {d.updatedAt !== d.createdAt && (
                      <div>Updated {format(new Date(d.updatedAt), "MMM d, yyyy")}</div>
                    )}
                  </div>
                </div>
                {d.resolution && (
                  <div className="mt-3 p-3 bg-green-50 rounded-md text-xs text-green-800">
                    <strong>Resolution:</strong> {d.resolution}
                  </div>
                )}
                {d.adminNote && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-md text-xs text-blue-800">
                    <strong>Admin note:</strong> {d.adminNote}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Open new case dialog */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Open a New Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Transaction</Label>
              <Select value={form.transactionId} onValueChange={(v) => setForm({ ...form, transactionId: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a transaction" />
                </SelectTrigger>
                <SelectContent>
                  {transactions.map((tx: any) => (
                    <SelectItem key={tx.transactionId} value={tx.transactionId}>
                      {tx.transactionId} — ${Number(tx.amount).toFixed(2)} ({tx.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-1">Or type in a transaction ID directly:</p>
              <Input
                className="mt-1"
                placeholder="TXN-..."
                value={form.transactionId}
                onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                className="mt-1"
                rows={4}
                placeholder="Describe the issue in detail..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancel</Button>
            <Button
              className="bg-[#0070ba] hover:bg-[#003087]"
              disabled={createMutation.isPending || !form.transactionId || !form.category || !form.description}
              onClick={() => createMutation.mutate(form)}
            >
              {createMutation.isPending ? "Opening..." : "Open Case"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Case detail dialog */}
      <Dialog open={!!selectedCase} onOpenChange={(o) => !o && setSelectedCase(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCase?.caseId}</DialogTitle>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedCase.status} />
                <span className="text-sm text-gray-500">{CATEGORY_LABELS[selectedCase.category]}</span>
              </div>
              <div className="text-sm"><strong>Transaction:</strong> {selectedCase.transactionId}</div>
              <div className="text-sm"><strong>Opened:</strong> {format(new Date(selectedCase.createdAt), "MMM d, yyyy HH:mm")}</div>
              <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-700">{selectedCase.description}</div>
              {selectedCase.adminNote && (
                <div className="bg-blue-50 rounded-md p-3 text-sm text-blue-800">
                  <strong>Admin note:</strong> {selectedCase.adminNote}
                </div>
              )}
              {selectedCase.resolution && (
                <div className="bg-green-50 rounded-md p-3 text-sm text-green-800">
                  <strong>Resolution:</strong> {selectedCase.resolution}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCase(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
