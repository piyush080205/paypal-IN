import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, Users, ArrowLeftRight, DollarSign, ShieldAlert, Trash2, Edit2, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon size={22} className="text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<any>(null);
  const [editBalance, setEditBalance] = useState("");

  if (!user || !(user as any).isAdmin) {
    setLocation("/dashboard");
    return null;
  }

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiFetch("/stats"),
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiFetch("/users"),
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: () => apiFetch("/transactions"),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ userId, suspend }: { userId: number; suspend: boolean }) =>
      apiFetch(`/users/${userId}/suspend`, {
        method: "POST",
        body: JSON.stringify({ suspend }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) =>
      apiFetch(`/users/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const balanceMutation = useMutation({
    mutationFn: ({ userId, balance }: { userId: number; balance: number }) =>
      apiFetch(`/users/${userId}/balance`, {
        method: "PATCH",
        body: JSON.stringify({ balance }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditUser(null);
      toast.success("Balance updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTxMutation = useMutation({
    mutationFn: (txId: number) =>
      apiFetch(`/transactions/${txId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      toast.success("Transaction deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredUsers = users.filter((u: any) =>
    [u.firstName, u.lastName, u.email].some((s: string) =>
      s?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const filteredTx = transactions.filter((t: any) =>
    [t.transactionId, t.fromUser?.email, t.toUser?.email, t.note].some((s: string) =>
      s?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage users and transactions</p>
        </div>
        <Badge className="bg-[#003087] text-white px-3 py-1 text-sm">Admin</Badge>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats.totalUsers} icon={Users} color="bg-[#0070ba]" />
          <StatCard label="Total Transactions" value={stats.totalTransactions} icon={ArrowLeftRight} color="bg-[#003087]" />
          <StatCard label="Total Volume" value={`$${Number(stats.totalVolume).toFixed(2)}`} icon={DollarSign} color="bg-green-600" />
          <StatCard label="Suspended" value={stats.suspendedUsers} icon={ShieldAlert} color="bg-red-500" />
        </div>
      )}

      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <TabsContent value="users">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">All Users ({filteredUsers.length})</CardTitle>
            </CardHeader>
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
                      <tr key={u.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          {u.firstName} {u.lastName}
                          {u.isAdmin && <Badge className="ml-2 text-xs bg-[#003087] text-white">Admin</Badge>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{u.email}</td>
                        <td className="px-4 py-3 font-semibold text-[#003087]">${Number(u.balance).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          {u.isSuspended
                            ? <Badge className="bg-red-100 text-red-700 border-none text-xs">Suspended</Badge>
                            : <Badge className="bg-green-100 text-green-700 border-none text-xs">Active</Badge>
                          }
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(u.createdAt), "MMM d, yyyy")}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {!u.isAdmin && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => { setEditUser(u); setEditBalance(String(Number(u.balance).toFixed(2))); }}
                                >
                                  <Edit2 size={12} className="mr-1" /> Balance
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={`h-7 px-2 text-xs ${u.isSuspended ? "text-green-600 border-green-300" : "text-orange-600 border-orange-300"}`}
                                  onClick={() => suspendMutation.mutate({ userId: u.id, suspend: !u.isSuspended })}
                                >
                                  {u.isSuspended ? <><Check size={12} className="mr-1" />Unsuspend</> : <><X size={12} className="mr-1" />Suspend</>}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs text-red-600 border-red-300"
                                  onClick={() => { if (confirm(`Delete ${u.firstName}?`)) deleteMutation.mutate(u.id); }}
                                >
                                  <Trash2 size={12} />
                                </Button>
                              </>
                            )}
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

        <TabsContent value="transactions">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">All Transactions ({filteredTx.length})</CardTitle>
            </CardHeader>
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
                      <th className="text-right px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txLoading ? (
                      <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
                    ) : filteredTx.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-gray-400">No transactions</td></tr>
                    ) : filteredTx.map((t: any) => (
                      <tr key={t.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.transactionId}</td>
                        <td className="px-4 py-3">{t.fromUser?.email || t.fromUserId}</td>
                        <td className="px-4 py-3">{t.toUser?.email || t.toUserId}</td>
                        <td className="px-4 py-3 font-semibold">${Number(t.amount).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          {t.status === "completed" && <Badge className="bg-green-100 text-green-700 border-none text-xs">Completed</Badge>}
                          {t.status === "pending" && <Badge className="bg-yellow-100 text-yellow-700 border-none text-xs">Pending</Badge>}
                          {t.status === "declined" && <Badge className="bg-red-100 text-red-700 border-none text-xs">Declined</Badge>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(t.createdAt), "MMM d, yyyy HH:mm")}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-red-600 border-red-300"
                            onClick={() => { if (confirm("Delete this transaction?")) deleteTxMutation.mutate(t.id); }}
                          >
                            <Trash2 size={12} />
                          </Button>
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

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Balance — {editUser?.firstName} {editUser?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>New Balance (USD)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={editBalance}
              onChange={(e) => setEditBalance(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button
              className="bg-[#0070ba] hover:bg-[#003087]"
              disabled={balanceMutation.isPending}
              onClick={() => {
                const bal = parseFloat(editBalance);
                if (isNaN(bal) || bal < 0) { toast.error("Invalid amount"); return; }
                balanceMutation.mutate({ userId: editUser.id, balance: bal });
              }}
            >
              {balanceMutation.isPending ? "Saving..." : "Save Balance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
