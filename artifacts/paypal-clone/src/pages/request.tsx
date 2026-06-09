import React from "react";
import { useLocation } from "wouter";
import { useRequestMoney, useSearchUsers, getSearchUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useDebounce } from "@/hooks/use-debounce";

const requestMoneySchema = z.object({
  fromEmail: z.string().email("Invalid email address"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  note: z.string().optional(),
});

type RequestMoneyFormValues = z.infer<typeof requestMoneySchema>;

export default function Request() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const requestMoneyMutation = useRequestMoney();
  
  const form = useForm<RequestMoneyFormValues>({
    resolver: zodResolver(requestMoneySchema),
    defaultValues: {
      fromEmail: "",
      amount: 0,
      note: "",
    },
  });

  const watchEmail = form.watch("fromEmail");
  const debouncedEmail = useDebounce(watchEmail, 500);

  const { data: users } = useSearchUsers(
    { q: debouncedEmail },
    {
      query: {
        enabled: debouncedEmail.length > 2,
        queryKey: getSearchUsersQueryKey({ q: debouncedEmail }),
      }
    }
  );

  const onSubmit = (data: RequestMoneyFormValues) => {
    requestMoneyMutation.mutate(
      { data },
      {
        onSuccess: () => {
          toast.success("Request sent successfully");
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
          queryClient.invalidateQueries({ queryKey: ["/api/money-requests"] });
          setLocation("/dashboard");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to request money");
        },
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-lg border-0">
        <CardHeader className="text-center pb-8 border-b">
          <CardTitle className="text-3xl font-light">Request money</CardTitle>
          <CardDescription className="text-base mt-2">Request money securely from anyone.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="fromEmail"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-base">From</Label>
                    <FormControl>
                      <Input placeholder="Name, @username, email, or mobile" className="py-6 text-lg" {...field} />
                    </FormControl>
                    <FormMessage />
                    {users && users.length > 0 && debouncedEmail === field.value && (
                      <div className="mt-2 border rounded-md divide-y shadow-sm max-h-48 overflow-y-auto">
                        {users.map(u => (
                          <div 
                            key={u.id} 
                            className="p-3 hover:bg-gray-50 cursor-pointer flex flex-col"
                            onClick={() => form.setValue("fromEmail", u.email)}
                          >
                            <span className="font-medium">{u.firstName} {u.lastName}</span>
                            <span className="text-sm text-gray-500">{u.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-base">Amount ($)</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-500">$</span>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          className="py-8 pl-10 text-3xl font-light" 
                          {...field} 
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <Label>What's this for? (Optional)</Label>
                    <FormControl>
                      <Textarea placeholder="Add a note" className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full py-6 text-lg font-semibold rounded-full bg-[#0070ba] hover:bg-[#003087]"
                  disabled={requestMoneyMutation.isPending}
                >
                  {requestMoneyMutation.isPending ? "Requesting..." : "Request a Payment"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
