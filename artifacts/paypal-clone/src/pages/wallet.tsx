import React, { useState } from "react";
import { 
  useGetPaymentMethods, 
  useAddPaymentMethod, 
  useRemovePaymentMethod, 
  getGetPaymentMethodsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Building, CreditCard, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";

const paymentMethodSchema = z.object({
  type: z.enum(["bank", "card"]),
  label: z.string().min(1, "Name/Label is required"),
  last4: z.string().length(4, "Must be exactly 4 digits").regex(/^\d+$/, "Must be numbers only"),
  isDefault: z.boolean().default(false),
});

type PaymentMethodFormValues = z.infer<typeof paymentMethodSchema>;

export default function Wallet() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: methods, isLoading } = useGetPaymentMethods({
    query: {
      queryKey: getGetPaymentMethodsQueryKey(),
    }
  });

  const addMutation = useAddPaymentMethod();
  const removeMutation = useRemovePaymentMethod();

  const form = useForm<PaymentMethodFormValues>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      type: "card",
      label: "",
      last4: "",
      isDefault: false,
    },
  });

  const onSubmit = (data: PaymentMethodFormValues) => {
    addMutation.mutate(
      { data },
      {
        onSuccess: () => {
          toast.success("Payment method added");
          queryClient.invalidateQueries({ queryKey: getGetPaymentMethodsQueryKey() });
          setIsDialogOpen(false);
          form.reset();
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to add payment method");
        },
      }
    );
  };

  const handleRemove = (id: number) => {
    removeMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Payment method removed");
          queryClient.invalidateQueries({ queryKey: getGetPaymentMethodsQueryKey() });
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to remove payment method");
        },
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-1">
        <h1 className="text-3xl font-light text-gray-900 mb-6">Wallet</h1>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full py-6 rounded-full bg-[#0070ba] hover:bg-[#003087] flex items-center gap-2">
              <Plus size={20} /> Link a bank or card
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link a new payment method</DialogTitle>
              <DialogDescription>Add a bank account or credit/debit card to your wallet.</DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Type</Label>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bank">Bank Account</SelectItem>
                          <SelectItem value="card">Credit/Debit Card</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Name (e.g. Chase Checking, Visa Platinum)</Label>
                      <FormControl>
                        <Input placeholder="Enter a label" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last4"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Last 4 Digits</Label>
                      <FormControl>
                        <Input placeholder="1234" maxLength={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="mt-6">
                  <DialogClose asChild>
                    <Button type="button" variant="outline" className="rounded-full">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={addMutation.isPending} className="rounded-full bg-[#0070ba] hover:bg-[#003087]">
                    {addMutation.isPending ? "Linking..." : "Link Method"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="md:col-span-2 space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </>
        ) : methods?.length === 0 ? (
          <Card className="border-dashed shadow-none bg-gray-50 border-gray-300">
            <CardContent className="p-12 text-center text-gray-500">
              <p>You haven't linked any banks or cards yet.</p>
            </CardContent>
          </Card>
        ) : (
          methods?.map(method => (
            <Card key={method.id} className="shadow-sm border-gray-200 group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-12 rounded bg-gray-100 flex items-center justify-center text-[#0070ba]">
                    {method.type === "bank" ? <Building size={24} /> : <CreditCard size={24} />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{method.label}</h3>
                    <p className="text-sm text-gray-500">{method.type === 'bank' ? 'Bank' : 'Card'} •••• {method.last4}</p>
                    {method.isDefault && <span className="text-xs text-[#0070ba] font-medium mt-1 block">Preferred</span>}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemove(method.id)}
                  disabled={removeMutation.isPending}
                >
                  <Trash2 size={20} />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
