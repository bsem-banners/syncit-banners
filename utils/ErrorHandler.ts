import crashlytics from '@react-native-firebase/crashlytics';
import { LogBox } from 'react-native';

interface ErrorContext {
  userId?: string;
  action?: string;
  screen?: string;
  groupId?: string;
  additionalData?: Record<string, any>;
}

export default class ErrorHandler {
  private static isInitialized = false;

  // Initialize error handling - call once in App.tsx
  static initialize() {
    if (this.isInitialized) return;
    
    // Enable crashlytics collection in production only
    crashlytics().setCrashlyticsCollectionEnabled(!__DEV__);
    
    if (!__DEV__) {
      LogBox.ignoreAllLogs(true);
      // Suppress console logs in production builds
      const noOp = () => {};
      console.log = console.info = console.warn = console.error = console.debug = noOp;
    }
    
    this.isInitialized = true;
  }

  // Log errors - development console + Crashlytics in production
  static logError(error: Error, context?: ErrorContext) {
    // Send to Crashlytics in production
    if (!__DEV__) {
      if (context) {
        // Set attributes for this error
        crashlytics().setAttribute('action', context.action || 'unknown');
        crashlytics().setAttribute('screen', context.screen || 'unknown');
        crashlytics().setAttribute('userId', context.userId || 'anonymous');
        if (context.groupId) {
          crashlytics().setAttribute('groupId', context.groupId);
        }
        if (context.additionalData) {
          Object.entries(context.additionalData).forEach(([key, value]) => {
            crashlytics().setAttribute(`data_${key}`, String(value));
          });
        }
      }
      crashlytics().recordError(error);
    }
    
    // Only show technical details in development
    if (__DEV__) {
      console.error('Error:', error.message, context);
      console.error('Stack:', error.stack);
    }
  }

  // Get user-friendly error messages - no Firebase jargon
  static getUserFriendlyMessage(error: any): string {
    const errorCode = error?.code || error;
    
    const errorMessages: Record<string, string> = {
      // Auth errors
      'auth/user-not-found': 'No account found with this email address.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'Invalid email or password. Please try again.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password must be at least 6 characters long.',
      'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
      'auth/network-request-failed': 'Please check your internet connection.',
      'auth/requires-recent-login': 'Please sign out and sign in again for security.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/operation-not-allowed': 'This operation is not allowed.',
      
      // Custom app errors
      'EMAIL_NOT_VERIFIED': 'Please verify your email address before signing in.',
      'PROFILE_INCOMPLETE': 'Please complete your profile setup.',
      'GROUP_NOT_FOUND': 'Group not found or no longer available.',
      'PERMISSION_DENIED': 'You don\'t have permission to perform this action.',
      'NETWORK_ERROR': 'Please check your internet connection.',
      
      // Firestore errors
      'firestore/permission-denied': 'Access denied. Please try again.',
      'firestore/unavailable': 'Service temporarily unavailable. Please try again later.',
      'firestore/deadline-exceeded': 'Request timed out. Please try again.',
      'firestore/not-found': 'Data not found.',
    };

    // Check for network/connection related errors
    if (error?.message) {
      const message = error.message.toLowerCase();
      if (message.includes('network') || message.includes('connection')) {
        return 'Please check your internet connection and try again.';
      }
      if (message.includes('timeout')) {
        return 'Request timed out. Please try again.';
      }
      if (message.includes('permission')) {
        return 'Access denied. Please check your permissions.';
      }
    }

    return errorMessages[errorCode] || 'Something went wrong. Please try again.';
  }

  // Log events - development console + Crashlytics breadcrumbs in production
  static logEvent(eventName: string, parameters?: Record<string, any>) {
    if (!__DEV__) {
      // Log as breadcrumb in Crashlytics for context
      crashlytics().log(`Event: ${eventName}`);
      if (parameters) {
        Object.entries(parameters).forEach(([key, value]) => {
          crashlytics().setAttribute(`event_${key}`, String(value));
        });
      }
    }
    
    if (__DEV__) {
      console.log('Event:', eventName, parameters);
    }
  }

  // Set user for Crashlytics tracking
  static setUser(userId: string, properties?: Record<string, string>) {
    if (!__DEV__) {
      crashlytics().setUserId(userId);
      if (properties) {
        Object.entries(properties).forEach(([key, value]) => {
          crashlytics().setAttribute(key, value);
        });
      }
    }
    
    if (__DEV__) {
      console.log('User set:', userId, properties);
    }
  }

  // Clear user from Crashlytics
  static clearUser() {
    if (!__DEV__) {
      crashlytics().setUserId('');
      // Clear user-specific attributes
      crashlytics().setAttribute('email', '');
      crashlytics().setAttribute('emailVerified', '');
    }
    
    if (__DEV__) {
      console.log('User cleared');
    }
  }

  // Silent error handling for non-critical operations
  static handleSilentError(error: any, context?: ErrorContext) {
    this.logError(error instanceof Error ? error : new Error(String(error)), context);
  }

  // Create standardized error for user-friendly messages
  static createUserFriendlyError(message: string, code?: string): Error {
    const error = new Error(message);
    if (code) {
      (error as any).code = code;
    }
    return error;
  }

  // Test crash function - REMOVE after verification
  static testCrash() {
    if (__DEV__) {
      console.log('Test crash called - this only works in production builds');
      return;
    }
    crashlytics().crash();
  }

  // Wrapper for async operations with error handling
  static async safeAsyncOperation<T>(
    operation: () => Promise<T>,
    context?: ErrorContext,
    logError: boolean = true
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      if (logError) {
        this.logError(error instanceof Error ? error : new Error(String(error)), context);
      }
      return null;
    }
  }
}