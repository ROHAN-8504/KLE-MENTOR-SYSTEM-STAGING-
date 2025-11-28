import { describe, it, expect } from 'vitest';
import { sendEmail, validateEmail } from './email';

describe('Email Utility Functions', () => {
    it('should validate a correct email address', () => {
        expect(validateEmail('test@example.com')).toBe(true);
    });

    it('should invalidate an incorrect email address', () => {
        expect(validateEmail('invalid-email')).toBe(false);
    });

    it('should send an email successfully', async () => {
        const response = await sendEmail('test@example.com', 'Subject', 'Body');
        expect(response).toEqual({ success: true });
    });
});