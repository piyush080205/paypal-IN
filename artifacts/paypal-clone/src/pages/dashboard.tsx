import React from "react";
import { Link } from "wouter";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { SendHorizontal, ArrowDownToLine, Wallet } from "lucide-react";
import { Transaction } from "@workspace/api-client-react";

export function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">Completed</Badge>;
  if (status === "declined") return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-none">Declined</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-none">Pending</Badge>;
}

export function TransactionItem({ transaction, currentUserId }: { transaction: Transaction, currentUserId?: number }) {
  const isSender = transaction.fromUserId === currentUserId;
  const isRequest = transaction.type === "request";
  
  let title = "";
  let amountStr = "";
  let amountClass = "";

  if (isRequest) {
    if (isSender) {
      title = `Requested from ${transaction.toUser?.firstName || 'Unknown'}`;
      amountStr = `+$${transaction.amount.toFixed(2)}`;
      amountClass = transaction.status === "completed" ? "text-green-600" : "text-gray-900";
    } else {
      title = `Request from ${transaction.fromUser?.firstName || 'Unknown'}`;
      amountStr = `-$${transaction.amount.toFixed(2)}`;
      amountClass = "text-gray-900";
    }
  } else {
    if (isSender) {
      title = `Sent to ${transaction.toUser?.firstName || 'Unknown'}`;
      amountStr = `-$${transaction.amount.toFixed(2)}`;
      amountClass = "text-gray-900";
    } else {
      title = `Received from ${transaction.fromUser?.firstName || 'Unknown'}`;
      amountStr = `+$${transaction.amount.toFixed(2)}`;
      amountClass = "text-green-600";
    }
  }

  return (
    <Link href={`/activity/${transaction.transactionId}`}>
      <div className="flex items-center justify-between py-4 border-b last:border-0 hover:bg-gray-50 px-4 -mx-4 cursor-pointer transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#f5f7fa] flex items-center justify-center text-[#0070ba] font-bold text-lg">
            {(isSender ? transaction.toUser?.firstName?.[0] : transaction.fromUser?.firstName?.[0]) || "?"}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{title}</p>
            <p className="text-sm text-gray-500">{format(new Date(transaction.createdAt), "MMM d, yyyy")}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`font-semibold text-lg ${amountClass}`}>{amountStr}</p>
          <div className="mt-1">
            <StatusBadge status={transaction.status} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: {
      queryKey: getGetDashboardSummaryQueryKey(),
    }
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Left Column - Balance & Quick Actions */}
      <div className="md:col-span-1 space-y-6">
        <Card className="shadow-sm border-gray-200 overflow-hidden">
          <CardContent className="p-8">
            <h3 className="text-lg font-medium text-gray-700 mb-2">PayPal Balance</h3>
            {isLoading ? (
              <Skeleton className="h-12 w-48" />
            ) : (
              <div className="text-5xl font-light text-gray-900 tracking-tight">
                ${summary?.balance.toFixed(2)}
              </div>
            )}
            <div className="mt-4 text-sm text-gray-500">Available</div>
          </CardContent>
          <CardFooter className="bg-[#f5f7fa] p-0 grid grid-cols-2 divide-x border-t">
            <Button variant="ghost" className="rounded-none py-6 h-auto font-semibold text-[#0070ba] hover:text-[#003087] hover:bg-blue-50" asChild>
              <Link href="/wallet">Transfer Funds</Link>
            </Button>
            <Button variant="ghost" className="rounded-none py-6 h-auto font-semibold text-[#0070ba] hover:text-[#003087] hover:bg-blue-50" asChild>
              <Link href="/wallet">Add Money</Link>
            </Button>
          </CardFooter>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Link href="/send">
            <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer border-gray-200 group">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#0070ba]/10 text-[#0070ba] flex items-center justify-center group-hover:bg-[#0070ba] group-hover:text-white transition-colors">
                  <SendHorizontal size={24} />
                </div>
                <span className="font-semibold text-gray-900">Send</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/request">
            <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer border-gray-200 group">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#0070ba]/10 text-[#0070ba] flex items-center justify-center group-hover:bg-[#0070ba] group-hover:text-white transition-colors">
                  <ArrowDownToLine size={24} />
                </div>
                <span className="font-semibold text-gray-900">Request</span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {summary && summary.pendingCount > 0 && (
          <Card className="shadow-sm border-yellow-200 bg-yellow-50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-yellow-800">Pending Requests</p>
                <p className="text-sm text-yellow-700">You have {summary.pendingCount} pending requests.</p>
              </div>
              <Button size="sm" asChild className="bg-yellow-600 hover:bg-yellow-700">
                <Link href="/requests">Review</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column - Recent Activity */}
      <div className="md:col-span-2">
        <Card className="shadow-sm border-gray-200 h-full">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
            <Button variant="ghost" className="text-[#0070ba] hover:bg-blue-50 font-medium" asChild>
              <Link href="/activity">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex justify-between">
                    <div className="flex gap-4">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : summary?.recentTransactions.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p>No recent activity.</p>
                <Button variant="outline" className="mt-4 border-[#0070ba] text-[#0070ba] rounded-full" asChild>
                  <Link href="/send">Send Money</Link>
                </Button>
              </div>
            ) : (
              <div className="px-4">
                {summary?.recentTransactions.map(tx => (
                  <TransactionItem 
                    key={tx.id} 
                    transaction={tx} 
                    currentUserId={tx.fromUserId} 
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
