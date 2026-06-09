import React from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";

// Pages
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Send from "@/pages/send";
import Request from "@/pages/request";
import Activity from "@/pages/activity";
import TransactionDetail from "@/pages/transaction-detail";
import Wallet from "@/pages/wallet";
import Requests from "@/pages/requests";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin";

const queryClient = new QueryClient();

// Auth Guard
function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Redirect to="/login" />;
  
  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/send" component={() => <ProtectedRoute component={Send} />} />
      <Route path="/request" component={() => <ProtectedRoute component={Request} />} />
      <Route path="/activity" component={() => <ProtectedRoute component={Activity} />} />
      <Route path="/activity/:transactionId" component={() => <ProtectedRoute component={TransactionDetail} />} />
      <Route path="/wallet" component={() => <ProtectedRoute component={Wallet} />} />
      <Route path="/requests" component={() => <ProtectedRoute component={Requests} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={Admin} />} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
