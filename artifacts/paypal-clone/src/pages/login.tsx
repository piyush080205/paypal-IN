import React from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogin } from "@workspace/api-client-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const loginMutation = useLogin();
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          toast.success("Logged in successfully");
          login(res.token);
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to login");
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <Logo className="h-12 w-12" />
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Log in to PayPal
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 sm:rounded-lg sm:px-10 border border-gray-200">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label>Email address</Label>
                    <FormControl>
                      <Input placeholder="Email" {...field} className="py-6" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <Label>Password</Label>
                    <FormControl>
                      <Input type="password" placeholder="Password" {...field} className="py-6" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full py-6 text-lg font-semibold rounded-full bg-[#0070ba] hover:bg-[#003087]"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Logging in..." : "Log In"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <div className="mt-6">
              <Link href="/register">
                <Button variant="outline" className="w-full py-6 text-lg font-semibold rounded-full text-[#0070ba] border-[#0070ba] hover:bg-blue-50">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
