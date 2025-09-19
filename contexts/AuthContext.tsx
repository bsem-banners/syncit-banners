import {
  User,
  UserCredential,
  createUserWithEmailAndPassword,
  deleteUser,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../config/firebase';
import ErrorHandler from '../utils/ErrorHandler';

interface UserProfile {
  name: string;
  phone: string;
  countryCode: string;
  initials: string;
  profileCompleted: boolean;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  authSuccess: string | null;
  clearAuthError: () => void;
  clearAuthSuccess: () => void;
  signUpWithEmail: (email: string, password: string) => Promise<UserCredential | null>;
  signInWithEmail: (email: string, password: string) => Promise<UserCredential | null>;
  signOut: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  saveUserProfile: (profileData: UserProfile) => Promise<boolean>;
  getUserProfile: () => Promise<UserProfile | null>;
  resendEmailVerification: () => Promise<boolean>;
  checkEmailVerified: () => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);
  const clearAuthSuccess = () => setAuthSuccess(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user || user.emailVerified) {
          setUser(user);
          
          if (user) {
            // Set user for Crashlytics tracking
            ErrorHandler.setUser(user.uid, {
              email: user.email || 'unknown',
              emailVerified: user.emailVerified.toString()
            });
            
            try {
              const docRef = doc(db, 'users', user.uid);
              const docSnap = await getDoc(docRef);
              
              if (docSnap.exists()) {
                setUserProfile(docSnap.data() as UserProfile);
              } else {
                setUserProfile(null);
              }
            } catch (error) {
              ErrorHandler.handleSilentError(error, {
                action: 'load_user_profile',
                screen: 'auth_state_change',
                userId: user.uid
              });
              setUserProfile(null);
            }
          } else {
            // Clear user from Crashlytics when signed out
            ErrorHandler.clearUser();
            setUserProfile(null);
          }
        } else {
          setUser(null);
          setUserProfile(null);
          ErrorHandler.clearUser();
          await firebaseSignOut(auth);
        }
      } catch (error) {
        ErrorHandler.handleSilentError(error, {
          action: 'auth_state_change',
          screen: 'app'
        });
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const signUpWithEmail = async (email: string, password: string): Promise<UserCredential | null> => {
    try {
      clearAuthError();
      clearAuthSuccess();
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await sendEmailVerification(userCredential.user);
      await firebaseSignOut(auth);
      
      setAuthSuccess('Account created! Please check your email and verify your address before signing in.');
      
      ErrorHandler.logEvent('user_signup_success', {
        user_id: userCredential.user.uid,
        email: email
      });
      
      return userCredential;
    } catch (error) {
      ErrorHandler.logError(error instanceof Error ? error : new Error(String(error)), {
        action: 'user_signup',
        screen: 'auth'
      });
      
      setAuthError(ErrorHandler.getUserFriendlyMessage(error));
      return null;
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<UserCredential | null> => {
    try {
      clearAuthError();
      clearAuthSuccess();
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (!userCredential.user.emailVerified) {
        ErrorHandler.logError(new Error('EMAIL_NOT_VERIFIED'), {
          action: 'email_not_verified',
          screen: 'auth',
          userId: userCredential.user.uid
        });
        
        setAuthError('Please verify your email address before signing in.');
        await firebaseSignOut(auth);
        return null;
      }
      
      // User will be set in onAuthStateChanged, which will call ErrorHandler.setUser
      ErrorHandler.logEvent('user_signin_success', {
        user_id: userCredential.user.uid
      });
      
      return userCredential;
    } catch (error) {
      ErrorHandler.logError(error instanceof Error ? error : new Error(String(error)), {
        action: 'user_signin',
        screen: 'auth'
      });
      
      setAuthError(ErrorHandler.getUserFriendlyMessage(error));
      return null;
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      clearAuthError();
      clearAuthSuccess();
      
      await sendPasswordResetEmail(auth, email);
      
      setAuthSuccess('Password reset email sent! Please check your inbox.');
      
      ErrorHandler.logEvent('password_reset_success', {
        email: email
      });
      
      return true;
    } catch (error) {
      ErrorHandler.logError(error instanceof Error ? error : new Error(String(error)), {
        action: 'password_reset',
        screen: 'auth'
      });
      
      setAuthError(ErrorHandler.getUserFriendlyMessage(error));
      return false;
    }
  };

  const resendEmailVerification = async (): Promise<boolean> => {
    try {
      clearAuthError();
      clearAuthSuccess();
      
      if (user && !user.emailVerified) {
        await sendEmailVerification(user);
        
        setAuthSuccess('Verification email sent! Please check your inbox.');
        
        ErrorHandler.logEvent('resend_verification_success', {
          user_id: user.uid
        });
        
        return true;
      }
      return false;
    } catch (error) {
      ErrorHandler.logError(error instanceof Error ? error : new Error(String(error)), {
        action: 'resend_email_verification',
        screen: 'auth',
        userId: user?.uid
      });
      
      setAuthError(ErrorHandler.getUserFriendlyMessage(error));
      return false;
    }
  };

  const checkEmailVerified = async (): Promise<boolean> => {
    try {
      if (user) {
        await reload(user);
        return user.emailVerified;
      }
      return false;
    } catch (error) {
      ErrorHandler.handleSilentError(error, {
        action: 'check_email_verified',
        screen: 'auth',
        userId: user?.uid
      });
      return false;
    }
  };
  
  const saveUserProfile = async (profileData: UserProfile): Promise<boolean> => {
    try {
      clearAuthError();
      clearAuthSuccess();
      
      if (user) {
        await updateProfile(user, {
          displayName: profileData.name,
        });

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          ...profileData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        setUserProfile(profileData);
        
        // Update Crashlytics user attributes with profile info
        ErrorHandler.setUser(user.uid, {
          email: user.email || 'unknown',
          emailVerified: user.emailVerified.toString(),
          name: profileData.name,
          profileCompleted: profileData.profileCompleted.toString()
        });
        
        ErrorHandler.logEvent('profile_saved_success', {
          user_id: user.uid,
          profile_completed: profileData.profileCompleted
        });
        
        return true;
      }
      return false;
    } catch (error) {
      ErrorHandler.logError(error instanceof Error ? error : new Error(String(error)), {
        action: 'save_user_profile',
        screen: 'profile_setup',
        userId: user?.uid
      });
      
      setAuthError(ErrorHandler.getUserFriendlyMessage(error));
      return false;
    }
  };

  const signOut = async (): Promise<boolean> => {
    try {
      const userId = user?.uid;
      await firebaseSignOut(auth);
      
      ErrorHandler.logEvent('user_signout_success', {
        user_id: userId
      });
      
      // ErrorHandler.clearUser will be called in onAuthStateChanged
      return true;
    } catch (error) {
      ErrorHandler.logError(error instanceof Error ? error : new Error(String(error)), {
        action: 'user_signout',
        screen: 'app',
        userId: user?.uid
      });
      
      setAuthError(ErrorHandler.getUserFriendlyMessage(error));
      return false;
    }
  };

  const getUserProfile = async (): Promise<UserProfile | null> => {
    try {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          return docSnap.data() as UserProfile;
        } else {
          ErrorHandler.handleSilentError(
            new Error('No profile found for user'),
            {
              action: 'get_user_profile_not_found',
              screen: 'app',
              userId: user.uid
            }
          );
          return null;
        }
      }
      return null;
    } catch (error) {
      ErrorHandler.handleSilentError(error, {
        action: 'get_user_profile',
        screen: 'app',
        userId: user?.uid
      });
      return null;
    }
  };

  const deleteAccount = async (): Promise<boolean> => {
    try {
      clearAuthError();
      clearAuthSuccess();
      
      if (!user) {
        setAuthError('No user account to delete.');
        return false;
      }

      const userId = user.uid;

      await deleteDoc(doc(db, 'users', userId));
      await deleteUser(user);

      setUser(null);
      setUserProfile(null);

      ErrorHandler.logEvent('user_account_deleted', {
        user_id: userId
      });

      // Clear user from Crashlytics
      ErrorHandler.clearUser();

      setAuthSuccess('Your account has been permanently deleted.');
      return true;
    } catch (error) {
      ErrorHandler.logError(error instanceof Error ? error : new Error(String(error)), {
        action: 'delete_account',
        screen: 'settings',
        userId: user?.uid
      });
      
      setAuthError(ErrorHandler.getUserFriendlyMessage(error));
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      authError,
      authSuccess,
      clearAuthError,
      clearAuthSuccess,
      signUpWithEmail,
      signInWithEmail,
      signOut,
      resetPassword,
      saveUserProfile,
      getUserProfile,
      resendEmailVerification,
      checkEmailVerified,
      deleteAccount
    }}>
      {children}
    </AuthContext.Provider>
  );
};