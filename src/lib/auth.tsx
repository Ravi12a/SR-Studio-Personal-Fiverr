import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as fbSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
  user: User | null;
  userRole: 'admin' | 'buyer' | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'buyer' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth state changed", currentUser?.email);
      setUser(currentUser);
      
      if (currentUser) {
        const userEmail = currentUser.email?.toLowerCase().trim();
        const isAdminEmail = userEmail === 'gyantid830@gmail.com';
        
        // Optimistically set role to avoid redirect kicks
        const optimisticRole = isAdminEmail ? 'admin' : 'buyer';
        setUserRole(optimisticRole);
        setLoading(false); // Make sure UI doesn't hang

        // Fetch or create user document asynchronously
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            let fetchedRole = userDoc.data().role as 'admin' | 'buyer' | 'client';
            
            // Upgrade legacy 'client' to 'buyer'
            if (fetchedRole === 'client') {
              fetchedRole = 'buyer';
              try {
                await setDoc(userDocRef, { role: 'buyer' }, { merge: true });
              } catch (e) {
                console.error("Could not upgrade legacy role", e);
              }
            }

            if (isAdminEmail && fetchedRole !== 'admin') {
              fetchedRole = 'admin';
              try {
                await setDoc(userDocRef, { role: 'admin' }, { merge: true });
              } catch (e) {
                console.error("Could not update role strictly in DB", e);
              }
            }
            // Update with actual DB role if it differs (e.g. they aren't admin by email but got admin granted in DB)
            if (fetchedRole !== optimisticRole) {
               setUserRole(fetchedRole);
            }
          } else {
            // New user, create document
            try {
              await setDoc(userDocRef, {
                email: currentUser.email,
                name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                role: optimisticRole,
                createdAt: serverTimestamp(),
              });
            } catch (e) {
              console.error("Failed to create user doc", e);
            }
          }
        } catch (error: any) {
          // Suppress offline errors since we already optimistically set the role
          if (error.code !== 'unavailable' && !error.message?.includes('offline')) {
            console.error("Error fetching user document", error);
          } else {
            console.warn("Firestore offline - continuing with optimistic role.");
          }
        }
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userEmail = result.user.email?.toLowerCase().trim();
      if (userEmail === 'gyantid830@gmail.com') {
        window.location.href = '/admin'; // Force redirect to admin dashboard
      } else {
        window.location.href = '/dashboard'; // Force redirect to buyer dashboard
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        console.error("Error signing in with Google", error);
      }
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
