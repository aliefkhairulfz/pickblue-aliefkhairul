import { Resend } from 'resend';
import { db } from '../db';
import { AuthService } from './auth.service';
import { HashService } from './hash.service';

// Add comment: Initialize external services
const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');

// Add comment: Initialize local services with manual dependency injection
const hashService = new HashService();
const authService = new AuthService(db, resend, hashService);

// Add comment: Export singleton instances to be used across the Next.js app
export { authService, db, hashService, resend };
