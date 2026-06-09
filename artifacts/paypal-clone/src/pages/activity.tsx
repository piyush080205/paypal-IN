import React, { useState } from "react";
import { useGetTransactions, getGetTransactionsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { TransactionItem } from "./dashboard";
import { useDebounce } from "@/hooks/use-debounce";
import { Skeleton } from "@/components/ui/skeleton";

export default function Activity() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [type, setType] = useState<"all" | "sent" | "received">("all");
  const [status, setStatus] = useState<"all" | "pending" | "completed" | "declined">("all");

  const { data, isLoading } = useGetTransactions({
    search: debouncedSearch || undefined,
    type: type === "all" ? undefined : type,
    status: status === "all" ? undefined : status,
  }, {
    query: {
      queryKey: getGetTransactionsQueryKey({ search: debouncedSearch, type: type === "all" ? undefined : type, status: status === "all" ? undefined : status }),
    }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-light text-gray-900">Activity</h1>

      <Card className="shadow-sm border-gray-200">
        <CardHeader className="bg-[#f5f7fa] border-b p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input 
              placeholder="Search by name or email" 
              className="pl-10 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Tabs defaultValue="all" onValueChange={(v) => setType(v as any)} className="w-full">
            <TabsList className="bg-transparent space-x-2">
              <TabsTrigger value="all" className="rounded-full data-[state=active]:bg-[#003087] data-[state=active]:text-white">All Transactions</TabsTrigger>
              <TabsTrigger value="sent" className="rounded-full data-[state=active]:bg-[#003087] data-[state=active]:text-white">Sent</TabsTrigger>
              <TabsTrigger value="received" className="rounded-full data-[state=active]:bg-[#003087] data-[state=active]:text-white">Received</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex justify-between">
                  <div className="flex gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="space-y-2 text-right">
                    <Skeleton className="h-5 w-20 ml-auto" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : data?.transactions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No transactions found.</p>
            </div>
          ) : (
            <div className="px-4">
              {data?.transactions.map(tx => (
                <TransactionItem 
                  key={tx.id} 
                  transaction={tx} 
                  currentUserId={user?.id} 
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
