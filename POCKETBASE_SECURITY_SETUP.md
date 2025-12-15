# PocketBase Security Configuration for Registration

This document outlines the required security configuration for the ReadTrail registration workflow in PocketBase.

## Overview

The registration system uses PocketBase's built-in user authentication with strong password requirements and email validation. This setup ensures secure user registration while maintaining ease of use.

## Required Configuration Steps

### 1. Users Collection Setup

The `users` collection should already exist as it's PocketBase's built-in authentication collection. Verify it exists in the PocketBase admin panel at `http://127.0.0.1:8090/_/`.

**Important Fields:**
- `email` - User's email address (unique, required)
- `password` - User's password (hashed automatically by PocketBase)
- `verified` - Email verification status
- `emailVisibility` - Controls if email is visible in API responses

### 2. Password Security Rules

Configure the following password requirements in PocketBase admin panel:

Navigate to: **Settings → Users → Password rules**

**Recommended Settings:**
- **Minimum length**: 8 characters
- **Require uppercase**: Yes
- **Require lowercase**: Yes
- **Require number**: Yes
- **Require special character**: Optional (recommended for higher security)

These settings match the client-side validation in `Register.vue` to provide immediate feedback to users.

### 3. Collection Rules (Users Collection)

Configure the collection API rules for the `users` collection:

Navigate to: **Collections → users → API Rules**

**listRule** (who can list users):
```javascript
// Only allow users to see their own record
@request.auth.id != "" && id = @request.auth.id
```

**viewRule** (who can view a single user):
```javascript
// Only allow users to view their own record
@request.auth.id != "" && id = @request.auth.id
```

**createRule** (who can create users - REGISTRATION):
```javascript
// Allow anyone to register (empty rule means public access)
// Leave this EMPTY or use: @request.auth.id = ""
```
**IMPORTANT**: This rule must allow public access for registration to work. The empty rule means anyone can create a user account.

**updateRule** (who can update users):
```javascript
// Only allow users to update their own record
@request.auth.id != "" && id = @request.auth.id
```

**deleteRule** (who can delete users):
```javascript
// Don't allow users to delete themselves via API (handle in admin panel only)
// Leave EMPTY for no delete access
```

### 4. Email Verification (Optional but Recommended)

For production environments, enable email verification:

Navigate to: **Settings → Mail settings**

1. **Configure SMTP settings** with your email provider:
   - SMTP host
   - SMTP port
   - SMTP username
   - SMTP password
   - Sender email address

2. **Enable verification** in **Settings → Users**:
   - Check "Require email verification"
   - Customize the verification email template

**Note**: If email verification is enabled, users must verify their email before they can log in. Update the frontend to handle this flow with appropriate messaging.

### 5. Rate Limiting (Highly Recommended)

PocketBase has built-in rate limiting, but you should configure it for registration endpoints:

Navigate to: **Settings → Application**

**Recommended Rate Limits:**
- **Registration/Auth requests**: 5 per minute per IP
- **General API requests**: 100 per minute per user

This prevents abuse and brute-force attacks.

### 6. Additional Security Settings

#### A. CORS Configuration
Navigate to: **Settings → Application → Allowed origins**

Add your frontend URL (e.g., `http://localhost:5173` for development).

For production, add your actual domain (e.g., `https://readtrail.app`).

#### B. Token Security
Navigate to: **Settings → Application**

- **JWT secret**: Auto-generated (keep secure)
- **Token duration**: 7 days (default, adjust based on your security needs)
- **Token refresh threshold**: 3 days (default)

#### C. Admin Security
- **Change default admin password** immediately
- Use a strong password (16+ characters, mixed case, numbers, special chars)
- Enable 2FA if available in your PocketBase version

### 7. Data Privacy Rules

For other collections (books, settings, etc.), ensure they have proper access rules:

**books collection** example:
```javascript
// listRule & viewRule
@request.auth.id != "" && user = @request.auth.id

// createRule & updateRule
@request.auth.id != "" && user = @request.auth.id

// deleteRule
@request.auth.id != "" && user = @request.auth.id
```

This ensures users can only access their own data.

## Security Checklist

Before deploying to production, verify:

- [ ] Password requirements configured (min 8 chars, uppercase, lowercase, number)
- [ ] Users collection `createRule` allows public registration
- [ ] Users collection other rules restrict access to own records only
- [ ] SMTP configured for email verification (production)
- [ ] Email verification enabled (production)
- [ ] Rate limiting configured
- [ ] CORS configured with actual domain
- [ ] Admin password changed from default
- [ ] All data collections have proper user isolation rules
- [ ] JWT token duration appropriate for your use case
- [ ] HTTPS enabled (production)
- [ ] Regular backups configured

## Client-Side Security Features

The `Register.vue` component implements:

1. **Client-side validation** before submission:
   - Email format validation
   - Password strength requirements (8+ chars, uppercase, lowercase, number)
   - Password confirmation matching
   - Real-time visual feedback

2. **Password strength indicator** showing users how secure their password is

3. **CSRF protection** via PocketBase's built-in token system

4. **XSS prevention** through Vue's automatic HTML escaping

5. **Input sanitization** handled by PocketBase API layer

6. **Error handling** with user-friendly messages (no sensitive data leaked)

## Testing Registration

1. **Test with weak password**: Should fail with clear error message
2. **Test with mismatched passwords**: Should prevent submission
3. **Test with existing email**: Should show appropriate error
4. **Test with valid data**: Should create account and auto-login
5. **Test guest data migration**: Register after adding books as guest
6. **Test rate limiting**: Try multiple rapid registrations

## Troubleshooting

### "Failed to authenticate" after registration
- Check if email verification is required
- Verify SMTP settings if verification is enabled
- Check browser console for API errors

### "Email already exists" but user can't log in
- User may have registered but not verified email
- Check PocketBase admin panel for user status
- Manually verify the user or resend verification email

### Registration succeeds but no auto-login
- Check browser console for errors
- Verify `authManager.register()` includes auto-login
- Check JWT token is being stored in PocketBase authStore

## Production Deployment Notes

1. **Use HTTPS**: Always use HTTPS in production
2. **Environment variables**: Store PocketBase URL in environment variable
3. **Monitoring**: Set up logging and monitoring for failed registration attempts
4. **Backups**: Regular automated backups of PocketBase database
5. **Updates**: Keep PocketBase updated to latest stable version
6. **Security headers**: Configure proper security headers in your web server

## Additional Resources

- [PocketBase Authentication Docs](https://pocketbase.io/docs/authentication/)
- [PocketBase API Rules Guide](https://pocketbase.io/docs/api-rules/)
- [PocketBase Security Best Practices](https://pocketbase.io/docs/going-to-production/)

## Summary

The registration workflow is now secure with:
- Strong password requirements enforced on both client and server
- Proper access control rules in PocketBase
- Email validation and optional verification
- Rate limiting to prevent abuse
- User data isolation
- Guest data migration support
- Clear error messaging without leaking sensitive information

All security measures are layered - client-side for UX, server-side for actual security.
