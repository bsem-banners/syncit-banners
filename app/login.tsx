import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { privacyPolicy } from '../data/privacyPolicy';
import { termsOfService } from '../data/termsOfService';

export default function LoginScreen() {
 const [showPassword, setShowPassword] = useState(false);
 const [showConfirmPassword, setShowConfirmPassword] = useState(false);
 const [isSignUp, setIsSignUp] = useState(false);
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [confirmPassword, setConfirmPassword] = useState('');
 const [loginLoading, setLoginLoading] = useState(false);
 const [showTerms, setShowTerms] = useState(false);
 const [showPrivacy, setShowPrivacy] = useState(false);

 const { signInWithEmail, signUpWithEmail, resetPassword, resendEmailVerification, user, userProfile, loading } = useAuth();

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

 const validateEmail = (email: string) => {
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   return emailRegex.test(email);
 };

 const handleAuth = async () => {
   if (!validateEmail(email)) {
     Alert.alert('Invalid Email', 'Please enter a valid email address');
     return;
   }

   if (password.length < 6) {
     Alert.alert('Invalid Password', 'Password must be at least 6 characters');
     return;
   }

   if (isSignUp && password !== confirmPassword) {
     Alert.alert('Password Mismatch', 'Passwords do not match');
     return;
   }

   setLoginLoading(true);
   try {
     if (isSignUp) {
       await signUpWithEmail(email, password);
       Alert.alert(
         'Verify Your Email',
         'A verification email from has been sent to your email address. Please verify your email before signing in.',
         [{ text: 'OK', onPress: () => setIsSignUp(false) }]
       );
     } else {
       await signInWithEmail(email, password);
     }
   } catch (err: any) {
     let errorMessage = 'Authentication failed';
     
     if (err.message === 'EMAIL_NOT_VERIFIED') {
       Alert.alert(
         'Email Not Verified',
         'Please verify your email address before signing in. Check your email for the verification link.',
         [
           { text: 'Cancel', style: 'cancel' },
           { 
             text: 'Resend Email', 
             onPress: async () => {
               try {
                 await resendEmailVerification();
                 Alert.alert('Verification Email Sent', 'Please check your email for the verification link.');
               } catch {
                 Alert.alert('Error', 'Failed to resend verification email.');
               }
             }
           }
         ]
       );
       return;
     }
     
     if (err.code === 'auth/user-not-found') {
       errorMessage = 'No account found with this email address';
     } else if (err.code === 'auth/wrong-password') {
       errorMessage = 'Incorrect password';
     } else if (err.code === 'auth/email-already-in-use') {
       errorMessage = 'An account with this email already exists';
     } else if (err.code === 'auth/weak-password') {
       errorMessage = 'Password is too weak';
     } else if (err.code === 'auth/invalid-credential') {
       errorMessage = 'Invalid email or password';
     } else if (err.code === 'auth/too-many-requests') {
       errorMessage = 'Too many failed attempts. Please try again later.';
     }
     
     Alert.alert('Error', errorMessage);
   } finally {
     setLoginLoading(false);
   }
 };

 const handleForgotPassword = async () => {
   if (!email) {
     Alert.alert('Email Required', 'Please enter your email address first');
     return;
   }

   try {
     await resetPassword(email);
     Alert.alert(
       'Password Reset Email Sent',
       'Check your email for instructions to reset your password'
     );
   } catch {
     Alert.alert('Error', 'Failed to send password reset email');
   }
 };

 return (
   <SafeAreaView style={styles.container}>
     {/* Fixed Header - Outside ScrollView */}
     <View style={styles.header}>
       <Text style={styles.headerTitle}>
         {isSignUp ? 'Create Account' : 'Welcome Back'}
       </Text>
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
           
           {/* Email Input */}
           <View style={styles.inputContainer}>
             <Text style={styles.inputLabel}>Email Address</Text>
             <TextInput
               style={styles.input}
               value={email}
               onChangeText={setEmail}
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
                 onChangeText={setPassword}
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
           
           {/* Confirm Password (Sign Up Only) */}
           {isSignUp && (
             <View style={styles.inputContainer}>
               <Text style={styles.inputLabel}>Confirm Password</Text>
               <View style={styles.passwordContainer}>
                 <TextInput
                   style={styles.passwordInput}
                   value={confirmPassword}
                   onChangeText={setConfirmPassword}
                   placeholder="Confirm your password"
                   placeholderTextColor="#9CA3AF"
                   secureTextEntry={!showConfirmPassword}
                   autoCapitalize="none"
                 />
                 <TouchableOpacity
                   style={styles.eyeButton}
                   onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                 >
                   <Text style={styles.eyeText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                 </TouchableOpacity>
               </View>
             </View>
           )}

           {/* Email Verification Notice for Sign Up */}
           {isSignUp && (
             <View style={styles.verificationNotice}>
               <Text style={styles.verificationText}>
                 📧 You&apos;ll receive a verification email from noreply@syncit-ead53.firebaseapp.com after creating your account. Please verify your email before signing in.
               </Text>
             </View>
           )}
           
           {/* Legal Text */}
           <View style={styles.legalContainer}>
             <Text style={styles.legalText}>By continuing, you agree to our</Text>
             <View style={styles.legalLinksContainer}>
               <TouchableOpacity onPress={() => setShowTerms(true)}>
                 <Text style={styles.legalLink}>Terms of Service</Text>
               </TouchableOpacity>
               <Text style={styles.legalText}> and </Text>
               <TouchableOpacity onPress={() => setShowPrivacy(true)}>
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
               <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
             </TouchableOpacity>
           )}
           
           {/* Switch Sign In/Up */}
           <View style={styles.switchContainer}>
             <Text style={styles.switchText}>
               {isSignUp ? 'Already have an account?' : "Don't have an account?"}
             </Text>
             <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
               <Text style={styles.switchLink}>
                 {isSignUp ? 'Sign In' : 'Sign Up'}
               </Text>
             </TouchableOpacity>
           </View>
         </View>
       </ScrollView>
     </KeyboardAvoidingView>

     {/* Terms of Service Modal */}
     <Modal
       visible={showTerms}
       animationType="slide"
       presentationStyle="pageSheet"
     >
       <SafeAreaView style={styles.modalContainer}>
         <View style={styles.modalHeader}>
           <Text style={styles.modalTitle}>Terms of Service</Text>
           <TouchableOpacity
             style={styles.closeButton}
             onPress={() => setShowTerms(false)}
           >
             <Text style={styles.closeButtonText}>Done</Text>
           </TouchableOpacity>
         </View>
         
         <ScrollView style={styles.modalContent}>
           <Text style={styles.documentText}>{termsOfService}</Text>
         </ScrollView>
       </SafeAreaView>
     </Modal>

     {/* Privacy Policy Modal */}
     <Modal
       visible={showPrivacy}
       animationType="slide"
       presentationStyle="pageSheet"
     >
       <SafeAreaView style={styles.modalContainer}>
         <View style={styles.modalHeader}>
           <Text style={styles.modalTitle}>Privacy Policy</Text>
           <TouchableOpacity
             style={styles.closeButton}
             onPress={() => setShowPrivacy(false)}
           >
             <Text style={styles.closeButtonText}>Done</Text>
           </TouchableOpacity>
         </View>
         
         <ScrollView style={styles.modalContent}>
           <Text style={styles.documentText}>{privacyPolicy}</Text>
         </ScrollView>
       </SafeAreaView>
     </Modal>
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
   position: 'relative',
   zIndex: 1,
 },
 headerTitle: {
   fontSize: 20,
   fontWeight: '600',
   color: 'white',
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
 modalContainer: {
   flex: 1,
   backgroundColor: '#F9FAFB',
 },
 modalHeader: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
   padding: 16,
   backgroundColor: '#3B82F6',
   borderBottomWidth: 1,
   borderBottomColor: 'rgba(255,255,255,0.1)',
 },
 modalTitle: {
   fontSize: 18,
   fontWeight: '600',
   color: 'white',
 },
 closeButton: {
   paddingHorizontal: 12,
   paddingVertical: 6,
   borderRadius: 16,
   backgroundColor: 'rgba(255,255,255,0.2)',
 },
 closeButtonText: {
   color: 'white',
   fontSize: 16,
   fontWeight: '500',
 },
 modalContent: {
   flex: 1,
   padding: 20,
 },
 documentText: {
   fontSize: 14,
   lineHeight: 22,
   color: '#374151',
 },
});