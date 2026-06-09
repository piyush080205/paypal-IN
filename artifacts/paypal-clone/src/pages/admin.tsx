import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Search, Users, ArrowLeftRight, DollarSign, ShieldAlert,
  Trash2, Edit2, Check, X, ShieldCheck, RotateCcw, CheckCircle,
  AlertCircle, Clock, XCircle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const BASE = "/api/admin";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("paypal_token");
  const res = await fetch(`${BASE}${path}`, {
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

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon size={20} className="text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  unauthorised: "Unauthorised Transaction",
  item_not_received: "Item Not Received",
  item_not_as_described: "Item Not as Described",
  billing: "Billing Issue",
  other: "Other",
};

function DisputeStatus({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    open:         { label: "Open",         cls: "bg-blue-100 text-blue-700",   icon: <AlertCircle size={11} /> },
    under_review: { label: "Under Review", cls: "bg-yellow-100 text-yellow-700", icon: <Clock size={11} /> },
    resolved:     { label: "Resolved",     cls: "bg-green-100 text-green-700", icon: <CheckCircle size={11} /> },
    closed:       { label: "Closed",       cls: "bg-gray-100 text-gray-500",   icon: <XCircle size={11} /> },
  };
  const c = map[status] || map.open;
  return (
    <Badge className={`${c.cls} border-none flex items-center gap-1 text-xs`}>
      {c.icon} {c.label}
    </Badge>
  );
}

function TxStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    pending:   "bg-yellow-100 text-yellow-700",
    declined:  "bg-red-100 text-red-700",
  };
  return <Badge className={`${map[status] || ""} border-none text-xs`}>{status}</Badge>;
}

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // edit balance
  const [editUser, setEditUser] = useState<any>(null);
  const [editBalance, setEditBalance] = useState("");

  // dispute editor
  const [editDispute, setEditDispute] = useState<any>(null);
  const [disputeForm, setDisputeForm] = useState({ status: "", resolution: "", adminNote: "" });

  if (!user || !(user as any).isAdmin) {
    setLocation("/dashboard");
    return null;
  }

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: () => apiFetch("/stats") });
  const { data: users = [], isLoading: usersLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => apiFetch("/users") });
  const { data: transactions = [], isLoading: txLoading } = useQuery({ queryKey: ["admin-transactions"], queryFn: () => apiFetch("/transactions") });
  const { data: disputes = [], isLoading: disputesLoading } = useQuery({ queryKey: ["admin-disputes"], queryFn: () => apiFetch("/disputes") });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const inv = (keys: string[]) => keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));

  const suspendMut = useMutation({
    mutationFn: ({ userId, suspend }: any) => apiFetch(`/users/${userId}/suspend`, { method: "POST", body: JSON.stringify({ suspend }) }),
    onSuccess: () => { inv(["admin-users"]); toast.success("User updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteUserMut = useMutation({
    mutationFn: (userId: number) => apiFetch(`/users/${userId}`, { method: "DELETE" }),
    onSuccess: () => { inv(["admin-users"]); toast.success("User deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const balanceMut = useMutation({
    mutationFn: ({ userId, balance }: any) => apiFetch(`/users/${userId}/balance`, { method: "PATCH", body: JSON.stringify({ balance }) }),
    onSuccess: () => { inv(["admin-users", "admin-stats"]); setEditUser(null); toast.success("Balance updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const completeTxMut = useMutation({
    mutationFn: (txId: number) => apiFetch(`/transactions/${txId}/complete`, { method: "POST" }),
    onSuccess: () => { inv(["admin-transactions", "admin-stats"]); toast.success("Transaction completed"); },
    onError: (e: any) => toast.error(e.message),
  });

  const reverseTxMut = useMutation({
    mutationFn: (txId: number) => apiFetch(`/transactions/${txId}/reverse`, { method: "POST" }),
    onSuccess: () => { inv(["admin-transactions", "admin-stats"]); toast.success("Transaction reversed"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTxMut = useMutation({
    mutationFn: (txId: number) => apiFetch(`/transactions/${txId}`, { method: "DELETE" }),
    onSuccess: () => { inv(["admin-transactions", "admin-stats"]); toast.success("Transaction deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateDisputeMut = useMutation({
    mutationFn: ({ caseId, ...body }: any) => apiFetch(`/disputes/${caseId}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { inv(["admin-disputes", "admin-stats"]); setEditDispute(null); toast.success("Case updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteDisputeMut = useMutation({
    mutationFn: (caseId: string) => apiFetch(`/disputes/${caseId}`, { method: "DELETE" }),
    onSuccess: () => { inv(["admin-disputes", "admin-stats"]); toast.success("Case deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Filtered data ─────────────────────────────────────────────────────────

  const q = search.toLowerCase();
  const filteredUsers = users.filter((u: any) =>
    [u.firstName, u.lastName, u.email].some((s: string) => s?.toLowerCase().includes(q))
  );
  const filteredTx = transactions.filter((t: any) =>
    [t.transactionId, t.fromUser?.email, t.toUser?.email, t.note, t.status].some((s: string) => s?.toLowerCase().includes(q))
  );
  const filteredDisputes = disputes.filter((d: any) =>
    [d.caseId, d.user?.email, d.transactionId, d.category, d.status].some((s: string) => s?.toLowerCase().includes(q))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Full read & write access to all platform data</p>
        </div>
        <Badge className="bg-[#003087] text-white px-3 py-1">Admin</Badge>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Users"        value={stats.totalUsers}        icon={Users}          color="bg-[#0070ba]" />
          <StatCard label="Transactions" value={stats.totalTransactions} icon={ArrowLeftRight} color="bg-[#003087]" />
          <StatCard label="Volume"       value={`$${Number(stats.totalVolume).toFixed(2)}`} icon={DollarSign} color="bg-green-600" />
          <StatCard label="Suspended"    value={stats.suspendedUsers}    icon={ShieldAlert}    color="bg-orange-500" />
          <StatCard label="Open Cases"   value={stats.openDisputes}      icon={ShieldCheck}    color="bg-red-500" />
        </div>
      )}

      <Tabs defaultValue="users">
        <TabsList className="mb-2">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="disputes">Resolution Centre</TabsTrigger>
        </TabsList>

        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* ── Users tab ── */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">All Users ({filteredUsers.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase">
                      <th className="text-left px-4 py-3">Name</th>
                      <th className="text-left px-4 py-3">Email</th>
                      <th className="text-left px-4 py-3">Balance</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Joined</th>
                      <th className="text-right px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading ? (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-400">No users found</td></tr>
                    ) : filteredUsers.map((u: any) => (
                      <tr key={u.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">
                          {u.firstName} {u.lastName}
                          {u.isAdmin && <Badge className="ml-2 text-xs bg-[#003087] text-white border-none">Admin</Badge>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{u.email}</td>
                        <td className="px-4 py-3 font-semibold text-[#003087]">${Number(u.balance).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          {u.isSuspended
                            ? <Badge className="bg-red-100 text-red-700 border-none text-xs">Suspended</Badge>
                            : <Badge className="bg-green-100 text-green-700 border-none text-xs">Active</Badge>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(u.createdAt), "MMM d, yyyy")}</td>
                        <td className="px-4 py-3">
                          {!u.isAdmin && (
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                                onClick={() => { setEditUser(u); setEditBalance(Number(u.balance).toFixed(2)); }}>
                                <Edit2 size={11} className="mr-1" />Balance
                              </Button>
                              <Button size="sm" variant="outline"
                                className={`h-7 px-2 text-xs ${u.isSuspended ? "text-green-600 border-green-300" : "text-orange-600 border-orange-300"}`}
                                onClick={() => suspendMut.mutate({ userId: u.id, suspend: !u.isSuspended })}>
                                {u.isSuspended ? <><Check size={11} className="mr-1" />Unsuspend</> : <><X size={11} className="mr-1" />Suspend</>}
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600 border-red-300"
                                onClick={() => { if (confirm(`Delete ${u.firstName}?`)) deleteUserMut.mutate(u.id); }}>
                                <Trash2 size={11} />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Transactions tab ── */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">All Transactions ({filteredTx.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase">
                      <th className="text-left px-4 py-3">ID</th>
                      <th className="text-left px-4 py-3">From</th>
                      <th className="text-left px-4 py-3">To</th>
                      <th className="text-left px-4 py-3">Amount</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-right px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txLoading ? (
                      <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
                    ) : filteredTx.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-gray-400">No transactions</td></tr>
                    ) : filteredTx.map((t: any) => (
                      <tr key={t.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.transactionId}</td>
                        <td className="px-4 py-3 text-xs">{t.fromUser?.email || t.fromUserId}</td>
                        <td className="px-4 py-3 text-xs">{t.toUser?.email || t.toUserId}</td>
                        <td className="px-4 py-3 font-semibold">${Number(t.amount).toFixed(2)}</td>
                        <td className="px-4 py-3"><TxStatusBadge status={t.status} /></td>
                        <td className="px-4 py-3 text-xs text-gray-400">{format(new Date(t.createdAt), "MMM d, HH:mm")}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {t.status === "pending" && (
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-green-600 border-green-300"
                                onClick={() => { if (confirm("Force-complete this transaction?")) completeTxMut.mutate(t.id); }}>
                                <CheckCircle size={11} className="mr-1" />Complete
                              </Button>
                            )}
                            {t.status === "completed" && (
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-orange-600 border-orange-300"
                                onClick={() => { if (confirm("Reverse (refund) this transaction?")) reverseTxMut.mutate(t.id); }}>
                                <RotateCcw size={11} className="mr-1" />Reverse
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600 border-red-300"
                              onClick={() => { if (confirm("Delete this transaction?")) deleteTxMut.mutate(t.id); }}>
                              <Trash2 size={11} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Disputes tab ── */}
        <TabsContent value="disputes">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">All Dispute Cases ({filteredDisputes.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase">
                      <th className="text-left px-4 py-3">Case ID</th>
                      <th className="text-left px-4 py-3">User</th>
                      <th className="text-left px-4 py-3">Transaction</th>
                      <th className="text-left px-4 py-3">Category</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Opened</th>
                      <th className="text-right px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disputesLoading ? (
                      <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
                    ) : filteredDisputes.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-gray-400">No cases found</td></tr>
                    ) : filteredDisputes.map((d: any) => (
                      <tr key={d.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-[#003087]">{d.caseId}</td>
                        <td className="px-4 py-3 text-xs">{d.user?.email || d.userId}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{d.transactionId}</td>
                        <td className="px-4 py-3 text-xs">{CATEGORY_LABELS[d.category] || d.category}</td>
                        <td className="px-4 py-3"><DisputeStatus status={d.status} /></td>
                        <td className="px-4 py-3 text-xs text-gray-400">{format(new Date(d.createdAt), "MMM d, yyyy")}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                              onClick={() => {
                                setEditDispute(d);
                                setDisputeForm({ status: d.status, resolution: d.resolution || "", adminNote: d.adminNote || "" });
                              }}>
                              <Edit2 size={11} className="mr-1" />Review
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600 border-red-300"
                              onClick={() => { if (confirm("Delete this case?")) deleteDisputeMut.mutate(d.caseId); }}>
                              <Trash2 size={11} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit balance dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Balance — {editUser?.firstName} {editUser?.lastName}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label>New Balance (USD)</Label>
            <Input type="number" step="0.01" min="0" value={editBalance} onChange={(e) => setEditBalance(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button className="bg-[#0070ba] hover:bg-[#003087]" disabled={balanceMut.isPending}
              onClick={() => {
                const bal = parseFloat(editBalance);
                if (isNaN(bal) || bal < 0) { toast.error("Invalid amount"); return; }
                balanceMut.mutate({ userId: editUser.id, balance: bal });
              }}>
              {balanceMut.isPending ? "Saving..." : "Save Balance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review dispute dialog */}
      <Dialog open={!!editDispute} onOpenChange={(o) => !o && setEditDispute(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Review Case — {editDispute?.caseId}</DialogTitle></DialogHeader>
          {editDispute && (
            <div className="space-y-4 py-2">
              <div className="bg-gray-50 rounded-md p-3 text-sm">
                <p><strong>User:</strong> {editDispute.user?.email}</p>
                <p><strong>Transaction:</strong> {editDispute.transactionId}</p>
                <p><strong>Category:</strong> {CATEGORY_LABELS[editDispute.category]}</p>
                <p className="mt-2 text-gray-600">{editDispute.description}</p>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={disputeForm.status} onValueChange={(v) => setDisputeForm({ ...disputeForm, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Admin Note (visible to user)</Label>
                <Textarea className="mt-1" rows={2} value={disputeForm.adminNote}
                  onChange={(e) => setDisputeForm({ ...disputeForm, adminNote: e.target.value })}
                  placeholder="Leave a note for the user..." />
              </div>
              <div>
                <Label>Resolution (shown when resolved)</Label>
                <Textarea className="mt-1" rows={2} value={disputeForm.resolution}
                  onChange={(e) => setDisputeForm({ ...disputeForm, resolution: e.target.value })}
                  placeholder="Final resolution decision..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDispute(null)}>Cancel</Button>
            <Button className="bg-[#0070ba] hover:bg-[#003087]" disabled={updateDisputeMut.isPending}
              onClick={() => updateDisputeMut.mutate({ caseId: editDispute.caseId, ...disputeForm })}>
              {updateDisputeMut.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
