import { useAuth } from '@/contexts/AuthContext';
import ErrorHandler from '@/utils/ErrorHandler';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const { 
    signInWithEmail, 
    signUpWithEmail, 
    resetPassword, 
    user, 
    userProfile, 
    loading,
    authError,
    authSuccess,
    clearAuthError,
    clearAuthSuccess
  } = useAuth();

  // Redirect authenticated users immediately
  useFocusEffect(
    React.useCallback(() => {
      if (!loading && user) {
        if (userProfile?.profileCompleted) {
          router.replace('/groups');
        } else {
          router.replace('/profile-setup');
        }
      }
    }, [user, userProfile?.profileCompleted, loading])
  );

  // Don't render the screen if user is authenticated
  if (!loading && user) {
    return null;
  }
  
  const handleAuth = async () => {
    if (!email || password.length < 6) return;
    
    setLoginLoading(true);
    
    try {
      const result = isSignUp 
        ? await signUpWithEmail(email, password)
        : await signInWithEmail(email, password);
        
      if (result && !isSignUp) {
        // Success - navigation handled by useFocusEffect
      } else if (result && isSignUp) {
        // Clear form after successful signup
        setIsSignUp(false);
        setEmail('');
        setPassword('');
      }
    } catch (error) {
      // This shouldn't happen since AuthContext handles all errors now
      ErrorHandler.handleSilentError(error, {
        action: 'unexpected_auth_error',
        screen: 'auth'
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      clearAuthError();
      clearAuthSuccess();
      return;
    }

    await resetPassword(email);
  };

  const clearMessages = () => {
    clearAuthError();
    clearAuthSuccess();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </Text>
        
        {/* Crashlytics Test Button - REMOVE AFTER TESTING */}
        {__DEV__ && (
          <TouchableOpacity 
            style={styles.testCrashButton}
            onPress={() => ErrorHandler.testCrash()}
          >
            <Text style={styles.testCrashButtonText}>Test Crash</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title}>
              {isSignUp ? 'Join SynciT' : 'Sign in to your account'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp 
                ? 'Create an account to start coordinating with friends & family.'
                : 'Enter your email and password to continue'
              }
            </Text>

            {/* Error Display */}
            {authError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{authError}</Text>
                <TouchableOpacity onPress={clearAuthError} style={styles.messageDismiss}>
                  <Text style={styles.errorDismissText}>×</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Success Message Display */}
            {authSuccess && (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{authSuccess}</Text>
                <TouchableOpacity onPress={clearAuthSuccess} style={styles.messageDismiss}>
                  <Text style={styles.successDismissText}>×</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  clearMessages();
                }}
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    clearMessages();
                  }}
                  placeholder={isSignUp ? "Create a password (min 6 characters)" : "Enter your password"}
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View> 
            </View>

            {/* Email Verification Notice for Sign Up */}
            {isSignUp && (
              <View style={styles.verificationNotice}>
                <Text style={styles.verificationText}>
                  You will receive a verification email after creating your account. Please verify your email before signing in.
                </Text>
              </View>
            )}
            
            {/* Legal Text */}
            <View style={styles.legalContainer}>
              <Text style={styles.legalText}>By continuing, you agree to our</Text>
              <View style={styles.legalLinksContainer}>
                <TouchableOpacity onPress={() => router.push('/terms-of-service' as any)}>
                  <Text style={styles.legalLink}>Terms of Service</Text>
                </TouchableOpacity>
                <Text style={styles.legalText}> and </Text>
                <TouchableOpacity onPress={() => router.push('/privacy-policy' as any)}>
                  <Text style={styles.legalLink}>Privacy Policy</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Auth Button */}
            <TouchableOpacity 
              style={[
                styles.authButton, 
                (!email || password.length < 6 || loginLoading) && styles.authButtonDisabled
              ]}
              onPress={handleAuth}
              disabled={!email || password.length < 6 || loginLoading}
            >
              <Text style={styles.authButtonText}>
                {loginLoading 
                  ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
                  : (isSignUp ? 'Create Account' : 'Sign In')
                }
              </Text>
            </TouchableOpacity>
            
            {/* Forgot Password */}
            {!isSignUp && (
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>
                  {email ? 'Send Reset Email' : 'Enter email above to reset password'}
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Switch Sign In/Up */}
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </Text>
              <TouchableOpacity onPress={() => {
                setIsSignUp(!isSignUp);
                clearMessages();
              }}>
                <Text style={styles.switchLink}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  testCrashButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#B91C1C',
  },
  testCrashButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    flex: 1,
  },
  errorDismissText: {
    color: '#DC2626',
    fontSize: 18,
    fontWeight: 'bold',
  },
  successContainer: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  successText: {
    color: '#059669',
    fontSize: 14,
    flex: 1,
  },
  successDismissText: {
    color: '#059669',
    fontSize: 18,
    fontWeight: 'bold',
  },
  messageDismiss: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  eyeButton: {
    padding: 12,
  },
  eyeText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  verificationNotice: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  verificationText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  legalContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  legalText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  legalLinksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  legalLink: {
    fontSize: 12,
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  authButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    marginTop: 8,
  },
  authButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  authButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#3B82F6',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 20,
  },
  switchText: {
    color: '#6B7280',
    fontSize: 14,
  },
  switchLink: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});