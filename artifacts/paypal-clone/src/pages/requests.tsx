import React, { useState } from "react";
import { 
  useGetMoneyRequests, 
  useApproveRequest, 
  useDeclineRequest,
  getGetMoneyRequestsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
import { StatusBadge } from "./dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Requests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [direction, setDirection] = useState<"received" | "sent">("received");

  const { data: requests, isLoading } = useGetMoneyRequests({
    direction,
    status: "pending"
  }, {
    query: {
      queryKey: getGetMoneyRequestsQueryKey({ direction, status: "pending" })
    }
  });

  const approveMutation = useApproveRequest();
  const declineMutation = useDeclineRequest();

  const handleApprove = (id: number) => {
    approveMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Request approved. Money sent.");
          queryClient.invalidateQueries({ queryKey: getGetMoneyRequestsQueryKey({ direction, status: "pending" }) });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to approve request");
        }
      }
    );
  };

  const handleDecline = (id: number) => {
    declineMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Request declined.");
          queryClient.invalidateQueries({ queryKey: getGetMoneyRequestsQueryKey({ direction, status: "pending" }) });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to decline request");
        }
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-light text-gray-900">Money Requests</h1>

      <Tabs defaultValue="received" onValueChange={(v) => setDirection(v as any)}>
        <TabsList className="bg-transparent space-x-2 border-b w-full justify-start rounded-none pb-px h-auto">
          <TabsTrigger value="received" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#0070ba] data-[state=active]:bg-transparent px-4 py-2">Needs Action</TabsTrigger>
          <TabsTrigger value="sent" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#0070ba] data-[state=active]:bg-transparent px-4 py-2">Pending Sent</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                  ))}
                </div>
              ) : requests?.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <p>No pending requests.</p>
                </div>
              ) : (
                <div className="px-4 py-2">
                  {requests?.map(req => (
                    <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-6 border-b last:border-0 gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#f5f7fa] flex items-center justify-center text-[#0070ba] font-bold text-lg flex-shrink-0">
                          {direction === 'received' ? req.fromUser?.firstName?.[0] : req.toUser?.firstName?.[0] || "?"}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-lg">
                            {direction === 'received' 
                              ? `${req.fromUser?.firstName} ${req.fromUser?.lastName} requested money`
                              : `You requested money from ${req.toUser?.firstName} ${req.toUser?.lastName}`
                            }
                          </p>
                          <p className="text-sm text-gray-500 mb-1">{format(new Date(req.createdAt), "MMM d, yyyy")}</p>
                          {req.note && <p className="text-gray-700 italic max-w-md mt-2">"{req.note}"</p>}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-3 sm:w-auto w-full">
                        <span className="font-semibold text-2xl text-gray-900">${req.amount.toFixed(2)}</span>
                        
                        {direction === "received" ? (
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button 
                              variant="outline" 
                              className="rounded-full flex-1 sm:flex-none text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleDecline(req.id)}
                              disabled={declineMutation.isPending || approveMutation.isPending}
                            >
                              Decline
                            </Button>
                            <Button 
                              className="rounded-full bg-[#0070ba] hover:bg-[#003087] flex-1 sm:flex-none"
                              onClick={() => handleApprove(req.id)}
                              disabled={approveMutation.isPending || declineMutation.isPending}
                            >
                              {approveMutation.isPending ? "Sending..." : "Send Money"}
                            </Button>
                          </div>
                        ) : (
                          <StatusBadge status={req.status} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}
