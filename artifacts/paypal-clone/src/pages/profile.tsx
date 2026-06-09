import React from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { User, Phone, Mail, Calendar, ShieldCheck } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-light text-gray-900 mb-6">Profile Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card className="shadow-sm border-gray-200 text-center pt-8">
            <div className="w-32 h-32 mx-auto rounded-full bg-blue-100 flex items-center justify-center text-[#0070ba] font-light text-5xl mb-4">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <CardHeader className="pt-0">
              <CardTitle className="text-2xl">{user.firstName} {user.lastName}</CardTitle>
              <p className="text-gray-500 text-sm mt-1">Joined {format(new Date(user.createdAt), "yyyy")}</p>
            </CardHeader>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b bg-[#f5f7fa] py-4">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <User size={18} className="text-[#0070ba]" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              <div className="flex justify-between items-center p-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  <p className="font-medium flex items-center gap-2">
                    <Mail size={16} className="text-gray-400" /> {user.email}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center p-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Phone</p>
                  <p className="font-medium flex items-center gap-2">
                    <Phone size={16} className="text-gray-400" /> {user.phone || "Not provided"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b bg-[#f5f7fa] py-4">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <ShieldCheck size={18} className="text-green-600" /> Account Security
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-4">Your account is secured with standard encryption. This is a demo application.</p>
              <div className="flex items-center gap-4 text-sm font-medium text-[#0070ba]">
                <span>Password last changed: {format(new Date(user.createdAt), "MMM d, yyyy")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
