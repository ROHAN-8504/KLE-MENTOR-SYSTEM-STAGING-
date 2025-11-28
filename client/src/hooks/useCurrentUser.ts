import { useAuth, useUser } from '@clerk/clerk-react';
import { useCallback, useEffect, useState } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { userState, pageLoadingState } from '../store/atoms';
import { userAPI, authAPI } from '../lib/api';
import type { User } from '../types';

export function useCurrentUser() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const [user, setUser] = useRecoilState(userState);
  const setPageLoading = useSetRecoilState(pageLoadingState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!isSignedIn) {
      setUser(null);
      setLoading(false);
      setPageLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();
      if (token) {
        const response = await userAPI.getCurrentUser();
        setUser(response.data.data as User);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user';
      setError(errorMessage);
      // User might need role selection
      if (errorMessage.includes('not found')) {
        setUser(null);
      }
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  }, [isSignedIn, getToken, setUser, setPageLoading]);

  useEffect(() => {
    if (isLoaded) {
      fetchUser();
    }
  }, [isLoaded, fetchUser]);

  const selectRole = async (role: 'mentor' | 'student' | 'admin', adminKey?: string) => {
    try {
      setLoading(true);
      const response = await authAPI.selectRole(role, adminKey);
      // The API returns { data: { user, redirectUrl } }
      setUser(response.data.data.user as User);
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to select role';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => fetchUser();

  return {
    user,
    clerkUser,
    isLoaded,
    isSignedIn,
    loading,
    error,
    selectRole,
    refetch,
    needsRoleSelection: isSignedIn && !user && !loading,
  };
}
