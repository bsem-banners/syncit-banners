import * as Sentry from '@sentry/react-native';
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
    
    // Initialize Sentry - automatically disabled in development
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN, // Add this to your .env file
      debug: __DEV__,
      environment: __DEV__ ? 'development' : 'production',
    });
    
    if (!__DEV__) {
      LogBox.ignoreAllLogs(true);
      // Suppress console logs in production builds
      const noOp = () => {};
      console.log = console.info = console.warn = console.error = console.debug = noOp;
    }
    
    this.isInitialized = true;
  }

  // Log errors - development console + Sentry in production
  static logError(error: Error, context?: ErrorContext) {
    // Send to Sentry in production
    if (!__DEV__) {
      if (context) {
        // Set tags and context for this error
        Sentry.setTag('action', context.action || 'unknown');
        Sentry.setTag('screen', context.screen || 'unknown');
        Sentry.setTag('userId', context.userId || 'anonymous');
        
        if (context.groupId) {
          Sentry.setTag('groupId', context.groupId);
        }
        
        if (context.additionalData) {
          Sentry.setContext('additional_data', context.additionalData);
        }
      }
      Sentry.captureException(error);
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

  // Log events - development console + Sentry breadcrumbs in production
  static logEvent(eventName: string, parameters?: Record<string, any>) {
    if (!__DEV__) {
      // Add breadcrumb in Sentry for context
      Sentry.addBreadcrumb({
        message: eventName,
        level: 'info',
        data: parameters,
      });
    }
    
    if (__DEV__) {
      console.log('Event:', eventName, parameters);
    }
  }

  // Set user for Sentry tracking
  static setUser(userId: string, properties?: Record<string, string>) {
    if (!__DEV__) {
      Sentry.setUser({
        id: userId,
        ...properties,
      });
    }
    
    if (__DEV__) {
      console.log('User set:', userId, properties);
    }
  }

  // Clear user from Sentry
  static clearUser() {
    if (!__DEV__) {
      Sentry.setUser(null);
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
    Sentry.captureException(new Error('Test crash'));
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