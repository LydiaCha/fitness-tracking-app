import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { UserProfile, DEFAULT_PROFILE, loadUserProfile, getEffectiveMacros } from '@/constants/userProfile';
import { logger } from '@/utils/logger';

interface ProfileCtx {
  profile:        UserProfile;
  /** Resolved macro targets — null targets replaced with formula values. Always use this. */
  effectiveMacros: { calories: number; protein: number; carbs: number; fat: number };
  /** Optimistically update the in-memory profile (e.g. after a save). */
  updateProfile:  (p: UserProfile) => void;
  /** Re-read profile from storage (e.g. after an external change). */
  refreshProfile: () => Promise<void>;
}

const DEFAULT_EFFECTIVE_MACROS = getEffectiveMacros(DEFAULT_PROFILE);

const UserProfileContext = createContext<ProfileCtx>({
  profile:        DEFAULT_PROFILE,
  effectiveMacros: DEFAULT_EFFECTIVE_MACROS,
  updateProfile:  () => {},
  refreshProfile: async () => {},
});

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  const refreshProfile = useCallback(async () => {
    try {
      const p = await loadUserProfile();
      setProfile(p);
    } catch (e) {
      logger.error('storage', 'refreshProfile', 'Failed to load user profile', { error: String(e) });
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const effectiveMacros = useMemo(() => getEffectiveMacros(profile), [profile]);

  const ctx = useMemo(
    () => ({ profile, effectiveMacros, updateProfile: setProfile, refreshProfile }),
    [profile, effectiveMacros, refreshProfile],
  );

  return (
    <UserProfileContext.Provider value={ctx}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile(): ProfileCtx {
  return useContext(UserProfileContext);
}
