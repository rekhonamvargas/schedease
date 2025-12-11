# SchedEase Security Features

## Overview
This document outlines the security measures implemented in the SchedEase application to protect user data and prevent unauthorized access.

## Security Features Implemented

### 1. Password Hashing
- **Library**: bcryptjs
- **Implementation**: All passwords are hashed using bcrypt with 10 salt rounds before storage
- **Location**: `src/utils/security.js`
- **Usage**:
  - Signup: Passwords are hashed before saving to localStorage
  - Login: Plain text passwords are compared against hashed versions using bcrypt.compare()

### 2. Developer Tools Protection
The application includes multiple layers of protection against unauthorized modifications via browser developer tools:

#### Keyboard Shortcuts Disabled
- F12 (Open DevTools)
- Ctrl+Shift+I (Open DevTools)
- Ctrl+Shift+J (Open Console)
- Ctrl+U (View Source)
- Right-click context menu disabled in production

#### Active Detection
- Monitors browser window dimensions to detect when DevTools are open
- Periodic debugger checks to detect active debugging sessions
- Runs only in production mode to avoid hindering development

### 3. Sensitive Data Protection

#### Console Log Management
- All console.log, console.debug, and console.info statements are disabled in production
- console.error and console.warn remain active for critical issues
- Sensitive data is automatically redacted in development logs using `sanitizeForLogging()`

#### Sanitization
The `sanitizeForLogging()` function automatically redacts:
- password
- token
- secret
- apiKey
- api_key
- authorization

### 4. Secure Storage
- Created `secureStorage` wrapper that uses base64 encoding for sensitive localStorage items
- Automatic cleanup of sensitive data on logout via `clearSensitiveData()`
- Session storage is cleared on page unload

### 5. CSS Security Classes
Security-related CSS classes are available in `src/security.css`:

- `.no-select` - Prevents text selection
- `.no-copy` - Prevents copying from sensitive areas
- `.no-drag` - Prevents dragging of elements
- `.visually-hidden` - Hides content visually but keeps it accessible for screen readers
- `.sensitive-data` - Can be blurred when dev tools are detected

### 6. Environment Configuration
Separate environment files for development and production:

- `.env.development` - Relaxed security for development
- `.env.production` - Strict security settings for production

## Security Functions

### `hashPassword(password)`
Hashes a plain text password using bcrypt.
```javascript
const hashedPassword = await hashPassword('myPassword123');
```

### `verifyPassword(password, hashedPassword)`
Verifies a plain text password against a hashed password.
```javascript
const isValid = await verifyPassword('myPassword123', hashedPassword);
```

### `sanitizeForLogging(obj)`
Sanitizes objects by redacting sensitive fields.
```javascript
console.log('User data:', sanitizeForLogging({ email: 'user@test.com', password: 'secret' }));
// Output: { email: 'user@test.com', password: '[REDACTED]' }
```

### `clearSensitiveData()`
Clears all sensitive data from localStorage (called on logout).
```javascript
clearSensitiveData();
```

### `protectDevTools()`
Enables all dev tools protection measures (automatically called on app init).

### `initSecurity()`
Initializes all security measures (called in App.js).

## Usage in Components

### Login Component
```javascript
import { verifyPassword, sanitizeForLogging } from '../../utils/security';

// In handleSubmit:
const isValidPassword = await verifyPassword(values.password, user.password);
```

### Signup Component
```javascript
import { hashPassword, sanitizeForLogging } from '../../utils/security';

// In handleSubmit:
const hashedPassword = await hashPassword(values.password);
```

### Sidebar Component (Logout)
```javascript
import { clearSensitiveData } from '../utils/security';

// In logout handler:
clearSensitiveData();
localStorage.removeItem("token");
```

## Production Build

When building for production, ensure:
1. Set `NODE_ENV=production`
2. Use `.env.production` configuration
3. All console logs will be automatically disabled
4. DevTools protection will be enabled

Build command:
```bash
npm run build
```

## Important Notes

⚠️ **Security Considerations**:
1. The current implementation stores user data in localStorage (for demo purposes)
2. For production use, implement a proper backend with:
   - Secure authentication endpoints
   - JWT token management
   - HTTPS encryption
   - Database for user storage
   - Rate limiting
   - CSRF protection

⚠️ **Development vs Production**:
- Security features are relaxed in development mode
- Full protection is enabled in production builds
- Use environment variables to control security behavior

## Best Practices

1. **Never commit** sensitive data (API keys, passwords) to version control
2. **Always use HTTPS** in production
3. **Implement rate limiting** on authentication endpoints
4. **Use secure session management** with proper token expiration
5. **Regular security audits** and dependency updates
6. **Implement proper backend authentication** before production deployment

## Dependencies

- `bcryptjs`: ^2.x.x - Password hashing

## Updates and Maintenance

Regular security maintenance tasks:
- Update dependencies regularly: `npm audit fix`
- Review and update security policies
- Monitor for security vulnerabilities
- Keep bcryptjs and other security packages up to date

---

For questions or security concerns, please contact the development team.
