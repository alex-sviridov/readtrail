# Test Coverage for Password Change Feature

This document outlines the test coverage for the password change functionality added to the settings page.

## Test Files Created

### 1. Auth Service Tests (`src/services/__tests__/auth.spec.js`)

Comprehensive tests for the `AuthManager` class and `authManager` singleton:

#### Login Tests
- ✓ Should login with email and password
- ✓ Should throw error on invalid credentials

#### Registration Tests
- ✓ Should register a new user and auto-login
- ✓ Should include additional data when provided
- ✓ Should throw error on registration failure

#### Logout Tests
- ✓ Should clear auth and all localStorage data
- ✓ Should only clear readtrail-prefixed keys

#### Authentication State Tests
- ✓ Should return correct authentication status
- ✓ Should return current user record
- ✓ Should identify guest users correctly

#### Token Refresh Tests
- ✓ Should refresh authentication token successfully
- ✓ Should return false on refresh failure

#### **Password Change Tests** (New Feature)
- ✓ Should change password for authenticated user
- ✓ Should throw error when no user is authenticated
- ✓ Should throw error on incorrect old password
- ✓ Should handle password confirmation mismatch error from backend
- ✓ Should adapt PocketBase errors

#### Singleton Tests
- ✓ Should export a singleton instance
- ✓ Should have guest user enabled based on environment

**Total: 20 tests**

---

### 2. SettingsAccount Component Tests (`src/views/__tests__/SettingsAccount.spec.js`)

Tests for the account settings page component with password change form:

#### Guest Mode Tests
- ✓ Should display guest mode message
- ✓ Should show sign in and create account buttons
- ✓ Should not display password change form in guest mode
- ✓ Should not display sign out button in guest mode

#### Authenticated Mode Tests
- ✓ Should display user email
- ✓ Should display account status
- ✓ Should display password change form
- ✓ Should have all password input fields
- ✓ Should display sign out button

#### **Password Change Functionality Tests** (New Feature)
- ✓ Should submit password change with valid data
- ✓ Should clear form after successful password change
- ✓ Should show error when passwords do not match
- ✓ Should show error when password is too short
- ✓ Should show error when new password is same as old password
- ✓ Should display error from backend
- ✓ Should disable form during password change
- ✓ Should show cancel button when form has data
- ✓ Should clear form when cancel is clicked
- ✓ Should clear error message when cancel is clicked

#### Sign Out Tests
- ✓ Should call logout and redirect on sign out

#### Accessibility Tests
- ✓ Should have proper labels for all inputs
- ✓ Should have required attributes on password inputs
- ✓ Should have minlength attribute on new password inputs

**Total: 23 tests**

---

### 3. Settings Component Tests (`src/views/__tests__/Settings.spec.js`)

Updated tests for the main settings page with tab navigation:

#### Rendering Tests
- ✓ Should render the settings page with title and description
- ✓ Should render tab navigation
- ✓ Should highlight active tab
- ✓ Should render child route content

#### Tab Navigation Tests
- ✓ Should navigate to application settings tab
- ✓ Should highlight correct tab based on route
- ✓ Should redirect /settings to /settings/account

#### Accessibility Tests
- ✓ Should have proper navigation labels
- ✓ Should have proper tab structure

**Total: 9 tests**

---

### 4. SettingsApplication Component Tests (`src/views/__tests__/SettingsApplication.spec.js`)

Tests for the application settings tab:

#### Rendering Tests
- ✓ Should render display settings section
- ✓ Should render all settings items
- ✓ Should render toggle switches for each setting

#### Toggle Switch Tests
- ✓ Should display toggle switch in correct state based on store value
- ✓ Should toggle showBookInfo when clicked
- ✓ Should toggle allowUnfinishedReading when clicked
- ✓ Should toggle allowScoring when clicked
- ✓ Should update toggle visual state when value changes

#### Store Integration Tests
- ✓ Should reflect store changes in the UI
- ✓ Should call updateSetting on toggle

#### Accessibility Tests
- ✓ Should have proper ARIA attributes on toggle switches
- ✓ Should have focus ring styles on toggle switches

**Total: 12 tests**

---

## Summary

- **Total Test Files**: 4
- **Total Tests**: 64
- **New Feature Coverage**: Password change functionality is fully tested
  - Service layer (auth.js): 5 tests
  - Component layer (SettingsAccount.vue): 10 tests
  - Integration: Form validation, error handling, loading states, and user feedback

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test -- --watch

# Run tests with coverage
npm run test -- --coverage

# Run specific test file
npm test auth.spec.js
npm test SettingsAccount.spec.js
```

## Test Coverage Areas

### Password Change Feature

1. **Client-side Validation**
   - Password match verification
   - Minimum length validation
   - New password differs from old password

2. **Backend Integration**
   - Successful password change
   - Error handling for invalid credentials
   - PocketBase error adaptation

3. **User Experience**
   - Form state management
   - Loading states
   - Success/error messages
   - Form reset after success
   - Cancel functionality

4. **Security**
   - Authentication requirement
   - Password field types
   - Form disabling during submission

5. **Accessibility**
   - Proper labels
   - Required attributes
   - Input constraints
