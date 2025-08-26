// contexts/AuthContext.tsx
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
  signUpWithEmail: (email: string, password: string) => Promise<UserCredential>;
  signInWithEmail: (email: string, password: string) => Promise<UserCredential>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  saveUserProfile: (profileData: UserProfile) => Promise<void>;
  getUserProfile: () => Promise<UserProfile | null>;
  resendEmailVerification: () => Promise<void>;
  checkEmailVerified: () => Promise<boolean>;
  deleteAccount: () => Promise<void>;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Only set user if email is verified OR if user is null
      if (!user || user.emailVerified) {
        setUser(user);
        
        // Load profile when user signs in
        if (user) {
          try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              setUserProfile(docSnap.data() as UserProfile);
            } else {
              setUserProfile(null);
            }
          } catch (error) {
            console.error('Error loading profile:', error);
            setUserProfile(null);
          }
        } else {
          setUserProfile(null);
        }
      } else {
        // User exists but email not verified - sign them out
        setUser(null);
        setUserProfile(null);
        await firebaseSignOut(auth);
      }
      
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Send email verification immediately after signup
      await sendEmailVerification(userCredential.user);
      
      // Sign out the user immediately after creating account
      await firebaseSignOut(auth);
      
      return userCredential;
    } catch (error) {
      console.error('Email sign-up failed:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        throw new Error('EMAIL_NOT_VERIFIED');
      }
      
      return userCredential;
    } catch (error) {
      console.error('Email sign-in failed:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  };

  const resendEmailVerification = async () => {
    try {
      if (user && !user.emailVerified) {
        await sendEmailVerification(user);
      }
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      throw error;
    }
  };

  const checkEmailVerified = async () => {
    try {
      if (user) {
        await reload(user);
        return user.emailVerified;
      }
      return false;
    } catch (error) {
      console.error('Failed to check email verification:', error);
      return false;
    }
  };
  
  const saveUserProfile = async (profileData: UserProfile) => {
    try {
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
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
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
          console.log('No profile found for user');
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting profile:', error);
      throw error;
    }
  };

  const deleteAccount = async () => {
    try {
      if (!user) {
        throw new Error('No user to delete');
      }

      const userId = user.uid;

      // Delete user profile from Firestore
      await deleteDoc(doc(db, 'users', userId));
      console.log('User profile deleted from Firestore');

      // Delete all groups created by this user
      // Note: This would ideally be done with a Cloud Function for better performance
      // For now, we'll let the GroupContext handle group cleanup

      // Delete the Firebase Auth user account
      await deleteUser(user);
      console.log('User account deleted from Firebase Auth');

      // Clear local state
      setUser(null);
      setUserProfile(null);

    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
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