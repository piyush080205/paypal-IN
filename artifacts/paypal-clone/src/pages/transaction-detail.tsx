import React, { useEffect } from "react";
import { useParams, Link } from "wouter";
import { useGetTransaction, getGetTransactionQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { StatusBadge } from "./dashboard";
import { Download, ArrowLeft, Printer } from "lucide-react";

export default function TransactionDetail() {
  const { transactionId } = useParams();
  const { user } = useAuth();
  
  const { data: transaction, isLoading } = useGetTransaction(transactionId!, {
    query: {
      enabled: !!transactionId,
      queryKey: getGetTransactionQueryKey(transactionId!),
    }
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-32" />
        <Card>
          <CardContent className="p-8 space-y-8">
            <div className="text-center space-y-4">
              <Skeleton className="h-16 w-48 mx-auto" />
              <Skeleton className="h-6 w-24 mx-auto" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold">Transaction not found</h2>
        <Button variant="link" asChild className="mt-4">
          <Link href="/activity">Return to Activity</Link>
        </Button>
      </div>
    );
  }

  const isSender = transaction.fromUserId === user?.id;
  const isRequest = transaction.type === "request";
  
  let title = "";
  let amountStr = "";
  let amountClass = "";
  let otherPerson = isSender ? transaction.toUser : transaction.fromUser;

  if (isRequest) {
    if (isSender) {
      title = "Request to";
      amountStr = `+$${transaction.amount.toFixed(2)}`;
      amountClass = transaction.status === "completed" ? "text-green-600" : "text-gray-900";
    } else {
      title = "Request from";
      amountStr = `-$${transaction.amount.toFixed(2)}`;
      amountClass = "text-gray-900";
    }
  } else {
    if (isSender) {
      title = "Payment to";
      amountStr = `-$${transaction.amount.toFixed(2)}`;
      amountClass = "text-gray-900";
    } else {
      title = "Payment from";
      amountStr = `+$${transaction.amount.toFixed(2)}`;
      amountClass = "text-green-600";
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 print:m-0 print:p-0">
      <div className="flex justify-between items-center print:hidden">
        <Button variant="ghost" asChild className="text-[#0070ba] hover:bg-blue-50">
          <Link href="/activity" className="flex items-center gap-2">
            <ArrowLeft size={16} /> Back to Activity
          </Link>
        </Button>
        <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2 border-[#0070ba] text-[#0070ba] rounded-full">
          <Printer size={16} /> Print Receipt
        </Button>
      </div>

      <Card className="shadow-lg border-0 print:shadow-none print:border-0">
        <CardContent className="p-8 md:p-12">
          <div className="text-center space-y-2 mb-10">
            <div className="w-20 h-20 mx-auto rounded-full bg-[#f5f7fa] flex items-center justify-center text-[#0070ba] font-bold text-3xl mb-4">
              {otherPerson?.firstName?.[0] || "?"}
            </div>
            <h2 className="text-gray-500 text-lg">{title}</h2>
            <h1 className="text-3xl font-semibold text-gray-900">{otherPerson?.firstName} {otherPerson?.lastName}</h1>
            <div className={`text-5xl font-light tracking-tight mt-4 ${amountClass}`}>
              {amountStr}
            </div>
            <div className="mt-4">
              <StatusBadge status={transaction.status} />
            </div>
          </div>

          <div className="space-y-6 border-t pt-8">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Date</span>
              <span className="font-medium text-gray-900">{format(new Date(transaction.createdAt), "MMMM d, yyyy 'at' h:mm a")}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Transaction ID</span>
              <span className="font-mono text-gray-900 text-sm">{transaction.transactionId}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Payment Type</span>
              <span className="font-medium text-gray-900 capitalize">{transaction.type}</span>
            </div>

            {transaction.note && (
              <div className="flex justify-between items-start">
                <span className="text-gray-500">Note</span>
                <span className="font-medium text-gray-900 text-right max-w-xs break-words italic">"{transaction.note}"</span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="bg-[#f5f7fa] p-6 text-center text-sm text-gray-500 justify-center print:hidden rounded-b-xl border-t">
          Need help? <a href="#" className="text-[#0070ba] ml-1 hover:underline">Contact Support</a>
        </CardFooter>
      </Card>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          .max-w-2xl * {
            visibility: visible;
          }
          .max-w-2xl {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}} />
    </div>
  );
}
