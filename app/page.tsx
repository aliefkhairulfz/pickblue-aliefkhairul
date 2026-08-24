'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function AuthUI() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Form states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    // UI state
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [verifyToken, setVerifyToken] = useState('');

    useEffect(() => {
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();
            if (data.ok) {
                setUser(data.data);
            } else {
                setUser(null);
            }
        } catch (e) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (data.ok) {
                setMessage('Login successful!');
                fetchUser();
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (data.ok) {
                setMessage('Registration started! Please check your email for the verification link.');
            } else {
                setError(data.message || 'Registration failed');
            }
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            setUser(null);
            setMessage('Logged out successfully.');
        } catch (e) {}
    };

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-md space-y-4">
                {message && <div className="p-3 bg-green-100 text-green-700 rounded-md text-sm text-center">{message}</div>}
                {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm text-center">{error}</div>}

                {user ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Welcome, {user.name || 'User'}!</CardTitle>
                            <CardDescription>You are currently logged in.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-sm space-y-1">
                                <p>
                                    <strong>Email:</strong> {user.email}
                                </p>
                                <p>
                                    <strong>Roles:</strong> {user.roles?.join(', ') || 'user'}
                                </p>
                                <p>
                                    <strong>Status:</strong>
                                    <span className={user.verifiedAt ? 'text-green-600 ml-1' : 'text-amber-600 ml-1'}>{user.verifiedAt ? 'Verified' : 'Unverified'}</span>
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="destructive" className="w-full" onClick={handleLogout}>
                                Logout
                            </Button>
                        </CardFooter>
                    </Card>
                ) : (
                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="login">Login</TabsTrigger>
                            <TabsTrigger value="register">Register</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Login</CardTitle>
                                    <CardDescription>Enter your credentials to access your account.</CardDescription>
                                </CardHeader>
                                <form onSubmit={handleLogin}>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Password</Label>
                                            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button type="submit" className="w-full">
                                            Login
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </TabsContent>

                        <TabsContent value="register">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Register</CardTitle>
                                    <CardDescription>Create a new account.</CardDescription>
                                </CardHeader>
                                <form onSubmit={handleRegister}>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="reg-email">Email</Label>
                                            <Input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button type="submit" className="w-full">
                                            Create Account
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </div>
    );
}
