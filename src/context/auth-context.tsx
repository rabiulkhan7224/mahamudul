
'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

// Define a User type for our local user object
interface LocalUser {
  id: string;
  fullName: string;
  email: string;
  password?: string; // Password is stored but not exposed in the context
}

type SubscriptionStatus = 'none' | 'pending' | 'active' | 'expired';

interface PendingSubscription {
    planId: number;
    requestDate: string; // ISO string
    otp: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isFirstLogin: boolean;
  user: Omit<LocalUser, 'password'> | null;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiry: Date | null;
  subscriptionStartDate: Date | null;
  subscribedPlanId: number | null;
  pendingSubscription: PendingSubscription | null;
  login: (email: string, pass: string) => Promise<void>;
  signup: (fullName: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  completeFirstLogin: () => void;
  activateSubscription: (otp: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to get users from localStorage
const getLocalUsers = (): LocalUser[] => {
  if (typeof window === 'undefined') return [];
  try {
    const users = localStorage.getItem('local-users');
    return users ? JSON.parse(users) : [];
  } catch (e) {
    return [];
  }
};

// Helper to get current user from localStorage
const getCurrentUser = (): Omit<LocalUser, 'password'> | null => {
    if (typeof window === 'undefined') return null;
    try {
        const user = localStorage.getItem('current-user');
        return user ? JSON.parse(user) : null;
    } catch(e) {
        return null;
    }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Omit<LocalUser, 'password'> | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Subscription state
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('none');
  const [subscriptionExpiry, setSubscriptionExpiry] = useState<Date | null>(null);
  const [subscriptionStartDate, setSubscriptionStartDate] = useState<Date | null>(null);
  const [subscribedPlanId, setSubscribedPlanId] = useState<number | null>(null);
  const [pendingSubscription, setPendingSubscription] = useState<PendingSubscription | null>(null);

  const loadUserAndSubscription = (loggedInUser: Omit<LocalUser, 'password'>) => {
    setUser(loggedInUser);
    
    // Check first login status
    const firstLoginFlag = localStorage.getItem(`isFirstLogin_${loggedInUser.id}`) === 'true';
    setIsFirstLogin(firstLoginFlag);
    
    // Check for pending subscription
    const pendingSubText = localStorage.getItem('pending_subscription');
    if (pendingSubText) {
        try {
          const parsedPendingSub = JSON.parse(pendingSubText);
          setPendingSubscription(parsedPendingSub);
          setSubscriptionStatus('pending');
          return; // Exit here as pending status is determined
        } catch (e) {
            console.error("Failed to parse pending subscription", e);
            setPendingSubscription(null);
        }
    } else {
        setPendingSubscription(null);
    }

    // Check for active subscription
    const expiryText = localStorage.getItem(`subscription_expiry_${loggedInUser.id}`);
    const startDateText = localStorage.getItem(`subscription_start_date_${loggedInUser.id}`);
    const planIdText = localStorage.getItem(`subscribed_plan_id_${loggedInUser.id}`);

    if (expiryText && planIdText) {
        const expiryDate = new Date(expiryText);
        if (expiryDate > new Date()) {
            setSubscriptionStatus('active');
            setSubscriptionExpiry(expiryDate);
            setSubscribedPlanId(Number(planIdText));
            if (startDateText) {
                setSubscriptionStartDate(new Date(startDateText));
            }
        } else {
            setSubscriptionStatus('expired');
            setSubscriptionExpiry(null);
            setSubscriptionStartDate(null);
            setSubscribedPlanId(null);
        }
    } else {
        setSubscriptionStatus('none');
    }
  };

  useEffect(() => {
    const loggedInUser = getCurrentUser();
    if (loggedInUser) {
        loadUserAndSubscription(loggedInUser);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const users = getLocalUsers();
        const foundUser = users.find(u => u.email === email && u.password === pass);

        if (foundUser) {
            const { password, ...userToStore } = foundUser;
            localStorage.setItem('current-user', JSON.stringify(userToStore));
            loadUserAndSubscription(userToStore);
            resolve();
        } else {
            reject(new Error('Invalid credentials'));
        }
    });
  };

  const signup = async (fullName: string, email: string, pass: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const users = getLocalUsers();
        if (users.some(u => u.email === email)) {
            return reject(new Error('Email already in use'));
        }

        const newUser: LocalUser = {
            id: `user_${Date.now()}`,
            fullName,
            email,
            password: pass,
        };

        users.push(newUser);
        localStorage.setItem('local-users', JSON.stringify(users));

        const profile = { ownerName: fullName, email: newUser.email, userId: newUser.id };
        localStorage.setItem('profile-settings', JSON.stringify(profile));
        
        const { password, ...userToStore } = newUser;
        localStorage.setItem('current-user', JSON.stringify(userToStore));
        localStorage.setItem(`isFirstLogin_${newUser.id}`, 'true');
        setUser(userToStore);
        setIsFirstLogin(true);
        setSubscriptionStatus('none');
        
        resolve();
    });
  };

  const logout = async (): Promise<void> => {
    localStorage.removeItem('current-user');
    setUser(null);
    setIsFirstLogin(false);
    setSubscriptionStatus('none');
    setSubscriptionExpiry(null);
    setSubscriptionStartDate(null);
    setSubscribedPlanId(null);
    setPendingSubscription(null);
  };
  
  const completeFirstLogin = () => {
    if (user) {
      localStorage.removeItem(`isFirstLogin_${user.id}`);
      setIsFirstLogin(false);
    }
  }

  const activateSubscription = async (otp: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!user || !pendingSubscription) {
          return reject(new Error("No pending subscription found."));
      }
      
      const storedPendingSubText = localStorage.getItem('pending_subscription');
      if (!storedPendingSubText) {
          return reject(new Error("No pending subscription found in storage."));
      }

      const storedPendingSub: PendingSubscription = JSON.parse(storedPendingSubText);

      // Verify OTP
      if (otp === storedPendingSub.otp) {
          const planId = storedPendingSub.planId;
          const plans = [
              { id: 1, durationDays: 30 },
              { id: 2, durationDays: 90 },
              { id: 3, durationDays: 180 },
          ];
          const plan = plans.find(p => p.id === planId);
          if (!plan) {
              return reject(new Error("Invalid plan ID."));
          }
          
          const startDate = new Date();
          const expiryDate = new Date(startDate);
          expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

          localStorage.setItem(`subscription_start_date_${user.id}`, startDate.toISOString());
          localStorage.setItem(`subscription_expiry_${user.id}`, expiryDate.toISOString());
          localStorage.setItem(`subscribed_plan_id_${user.id}`, String(planId));
          localStorage.removeItem('pending_subscription');

          loadUserAndSubscription(user); // Reload state
          resolve();
      } else {
          reject(new Error("Invalid OTP"));
      }
    });
  };

  const value: AuthContextType = { 
    isAuthenticated: !!user, 
    user, 
    isFirstLogin, 
    subscriptionStatus,
    subscriptionExpiry,
    subscriptionStartDate,
    subscribedPlanId,
    pendingSubscription,
    login, 
    signup, 
    logout, 
    completeFirstLogin,
    activateSubscription,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
