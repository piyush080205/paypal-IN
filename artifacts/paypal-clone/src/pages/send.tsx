import React, { useState } from "react";
import { useLocation } from "wouter";
import { useSendMoney, useSearchUsers, getSearchUsersQueryKey } from "@workspace/api-client-react";
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
import { Form, FormControl, FormField, FormItem, FormMessage, FormDescription } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDebounce } from "@/hooks/use-debounce";

const sendMoneySchema = z.object({
  toEmail: z.string().email("Invalid email address"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  note: z.string().optional(),
  paymentType: z.enum(["instant", "bank_transfer"]).default("instant"),
});

type SendMoneyFormValues = z.infer<typeof sendMoneySchema>;

export default function Send() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const sendMoneyMutation = useSendMoney();
  
  const form = useForm<SendMoneyFormValues>({
    resolver: zodResolver(sendMoneySchema),
    defaultValues: {
      toEmail: "",
      amount: 0,
      note: "",
      paymentType: "instant",
    },
  });

  const watchEmail = form.watch("toEmail");
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

  const onSubmit = (data: SendMoneyFormValues) => {
    sendMoneyMutation.mutate(
      { data: { ...data, paymentType: data.paymentType as any } },
      {
        onSuccess: () => {
          toast.success("Money sent successfully");
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
          queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
          setLocation("/dashboard");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to send money");
        },
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-lg border-0">
        <CardHeader className="text-center pb-8 border-b">
          <CardTitle className="text-3xl font-light">Send money</CardTitle>
          <CardDescription className="text-base mt-2">Send money securely to friends and family.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="toEmail"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-base">To</Label>
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
                            onClick={() => form.setValue("toEmail", u.email)}
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

              <FormField
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <Label>Payment Method</Label>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0 p-4 border rounded-md cursor-pointer hover:bg-gray-50">
                          <FormControl>
                            <RadioGroupItem value="instant" />
                          </FormControl>
                          <div className="flex flex-col">
                            <Label className="font-medium cursor-pointer">PayPal Balance</Label>
                            <span className="text-sm text-gray-500">Instant transfer. Free.</span>
                          </div>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0 p-4 border rounded-md cursor-pointer hover:bg-gray-50">
                          <FormControl>
                            <RadioGroupItem value="bank_transfer" />
                          </FormControl>
                          <div className="flex flex-col">
                            <Label className="font-medium cursor-pointer">Bank Transfer</Label>
                            <span className="text-sm text-gray-500">1-3 business days. Free.</span>
                          </div>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full py-6 text-lg font-semibold rounded-full bg-[#0070ba] hover:bg-[#003087]"
                  disabled={sendMoneyMutation.isPending}
                >
                  {sendMoneyMutation.isPending ? "Sending..." : "Send"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
