"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function VerificationContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const email = searchParams.get("e");
    const token = searchParams.get("t");

    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"user" | "creator">("user");

    useEffect(() => {
        if (!email || !token) {
            setStatus("error");
            setMessage("Invalid verification link. Missing email or token.");
        }
    }, [email, token]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        
        try {
            const res = await fetch("/api/auth/register-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    name, 
                    email, 
                    password, 
                    role, 
                    token, 
                    providerId: "credentials" 
                })
            });
            const data = await res.json();
            
            if (data.ok) {
                setStatus("success");
                setMessage("Registration successful! You can now log in.");
            } else {
                setStatus("error");
                setMessage(data.message || "Failed to register.");
            }
        } catch (error: any) {
            setStatus("error");
            setMessage(error.message || "An error occurred during registration.");
        }
    };

    if (status === "error" && (!email || !token)) {
        return (
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle>Error</CardTitle>
                    <CardDescription className="text-red-500">{message}</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button onClick={() => router.push("/")} className="w-full">Back to Home</Button>
                </CardFooter>
            </Card>
        );
    }

    if (status === "success") {
        return (
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle>Success</CardTitle>
                    <CardDescription className="text-green-600">{message}</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button onClick={() => router.push("/")} className="w-full">Proceed to Login</Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
                <CardTitle>Complete Registration</CardTitle>
                <CardDescription>
                    Please provide your details to complete your account for {email}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input 
                            id="name" 
                            type="text" 
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required 
                            disabled={status === "loading"}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input 
                            id="password" 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                            disabled={status === "loading"}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">Account Type</Label>
                        <select 
                            id="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value as "user" | "creator")}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={status === "loading"}
                        >
                            <option value="user">Regular User</option>
                            <option value="creator">Creator</option>
                        </select>
                    </div>

                    {status === "error" && (
                        <div className="text-sm text-red-500 font-medium">{message}</div>
                    )}

                    <Button type="submit" className="w-full" disabled={status === "loading"}>
                        {status === "loading" ? "Completing..." : "Complete Registration"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export default function RegisterVerificationPage() {
    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
            <Suspense fallback={<div className="text-center">Loading...</div>}>
                <VerificationContent />
            </Suspense>
        </div>
    );
}
