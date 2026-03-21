import { getQueryClient } from '@/context/QueryProvider';
import { ExtendedUserContext } from '@/features/auth/models/User';
import { getUserContext, login, logout, refresh } from '@/features/auth/services/authApi';
import { LoginResponse, RefreshResponse } from '@/features/auth/types';
import * as SecureStore from 'expo-secure-store';
import { AppState, AppStateStatus, Platform } from 'react-native';

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthSessionSnapshot {
  user: ExtendedUserContext | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  requiresAssociation: boolean;
  isLoggingOut: boolean;
}

interface StoredTokensResult {
  tokens: AuthTokens;
  requiresAssociation: boolean;
}

/**
 * Web-safe storage wrapper.
 * Uses expo-secure-store on native and localStorage on web.
 */
const storage = {
  getItem: (key: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(localStorage.getItem(key))
      : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(localStorage.setItem(key, value))
      : SecureStore.setItemAsync(key, value),
  deleteItem: (key: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(localStorage.removeItem(key))
      : SecureStore.deleteItemAsync(key),
};

function decodeJWT(token: string): { exp?: number } | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function isTokenExpired(token: string | null, marginSeconds = 10): boolean {
  if (!token) return true;
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now + marginSeconds;
}

function getTokenExpirationTime(token: string | null): number | null {
  if (!token) return null;
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return null;
  const now = Math.floor(Date.now() / 1000);
  const secondsLeft = payload.exp - now;
  return Math.max(secondsLeft * 1000, 0);
}

function fingerprintToken(token?: string | null): string {
  if (!token) {
    return 'none';
  }

  let hash = 0;
  for (let i = 0; i < token.length; i += 1) {
    hash = (hash * 31 + token.charCodeAt(i)) | 0;
  }

  return Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
}

const WEB_REFRESH_STATE_KEY = 'auth:refresh_state:v1';

interface WebRefreshState {
  lockOwnerId?: string;
  lockExpiresAt?: number;
  lockNonce?: string;
  lastUsedRefreshTokenFingerprint?: string;
}

class AuthSessionService {
  private snapshot: AuthSessionSnapshot = {
    user: null,
    tokens: null,
    isLoading: true,
    requiresAssociation: false,
    isLoggingOut: false,
  };

  private listeners = new Set<() => void>();
  private refreshPromiseRef: Promise<void> | null = null;
  private refreshTimerRef: ReturnType<typeof setTimeout> | null = null;
  private tokensRef: AuthTokens | null = null;
  private initializePromise: Promise<void> | null = null;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private webVisibilityHandler: (() => void) | null = null;
  private webFocusHandler: (() => void) | null = null;
  private webOnlineHandler: (() => void) | null = null;
  private lifecycleListenersReady = false;
  private lastEnsureFreshSessionAt = 0;
  private readonly ensureFreshCooldownMs = 1500;
  private readonly ensureFreshMarginSeconds = 60;
  private refreshAttemptSeq = 0;
  private lastUsedRefreshTokenFingerprint: string | null = null;
  private readonly instanceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  private readonly webRefreshLockTtlMs = 8000;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  initialize = async (): Promise<void> => {
    if (!this.lifecycleListenersReady) {
      this.setupLifecycleListeners();
      this.lifecycleListenersReady = true;
    }

    if (this.initializePromise) {
      return this.initializePromise;
    }

    this.initializePromise = this.doInitialize().finally(() => {
      this.initializePromise = null;
    });

    return this.initializePromise;
  };

  signIn = async (username: string, password: string): Promise<void> => {
    const response = (await login(username, password)) as LoginResponse;

    if (!response.accessToken || typeof response.accessToken !== 'string') {
      throw new Error(response.message || 'Credenciales invalidas');
    }

    const newTokens: AuthTokens = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken || undefined,
    };

    await this.saveTokens(newTokens);

    const requiresAssociation = response.requiresAssociation || false;
    this.setState({ requiresAssociation });

    if (requiresAssociation) {
      await storage.setItem('requiresAssociation', 'true');
      this.setState({ user: null });
    } else {
      await storage.deleteItem('requiresAssociation');
      await this.loadUserContext();
    }
  };

  setAuthTokens = async (accessToken: string, refreshToken?: string): Promise<void> => {
    const newTokens: AuthTokens = {
      accessToken,
      refreshToken: refreshToken || undefined,
    };

    await this.saveTokens(newTokens);
    this.setState({ requiresAssociation: false });
    await storage.deleteItem('requiresAssociation');
    await this.loadUserContext();
  };

  signOut = async (): Promise<void> => {
    this.setState({ isLoggingOut: true });

    try {
      const currentRT = this.tokensRef?.refreshToken;
      if (currentRT) {
        await logout(currentRT);
      }
    } catch (error) {
      console.error('Error notifying logout to server:', error);
    } finally {
      this.teardownLifecycleListeners();
      this.lifecycleListenersReady = false;
      await this.clearStoredTokens();
      getQueryClient().clear();
      this.setState({ isLoggingOut: false });
    }
  };

  private async ensureFreshSession(reason: string): Promise<void> {
    const now = Date.now();
    if (now - this.lastEnsureFreshSessionAt < this.ensureFreshCooldownMs) {
      return;
    }
    this.lastEnsureFreshSessionAt = now;

    if (this.snapshot.isLoading || this.snapshot.requiresAssociation) {
      return;
    }

    const accessToken = this.tokensRef?.accessToken ?? null;
    if (!accessToken) {
      return;
    }

    if (this.refreshPromiseRef) {
      await this.refreshPromiseRef.catch(() => undefined);
      return;
    }

    if (isTokenExpired(accessToken, this.ensureFreshMarginSeconds)) {
      if (!this.tokensRef?.refreshToken) {
        await this.clearStoredTokens();
        return;
      }

      await this.refreshTokens(`ensure:${reason}`).catch((error) => {
        console.error(`[Auth] ensureFreshSession(${reason}) failed:`, error);
      });
      return;
    }

    if (!this.refreshTimerRef) {
      this.scheduleRefresh();
    }
  }

  private setupLifecycleListeners(): void {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
      }

      this.webVisibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          void this.ensureFreshSession('web:visibility');
        }
      };
      this.webFocusHandler = () => {
        void this.ensureFreshSession('web:focus');
      };
      this.webOnlineHandler = () => {
        void this.ensureFreshSession('web:online');
      };

      document.addEventListener('visibilitychange', this.webVisibilityHandler, false);
      window.addEventListener('focus', this.webFocusHandler, false);
      window.addEventListener('online', this.webOnlineHandler, false);
      return;
    }

    let previousState: AppStateStatus = AppState.currentState;
    this.appStateSubscription = AppState.addEventListener('change', (nextState) => {
      const becameActive =
        (previousState === 'inactive' || previousState === 'background') && nextState === 'active';
      previousState = nextState;

      if (becameActive) {
        void this.ensureFreshSession('native:active');
      }
    });
  }

  private teardownLifecycleListeners(): void {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && this.webFocusHandler) {
        window.removeEventListener('focus', this.webFocusHandler, false);
      }
      if (typeof window !== 'undefined' && this.webOnlineHandler) {
        window.removeEventListener('online', this.webOnlineHandler, false);
      }
      if (typeof document !== 'undefined' && this.webVisibilityHandler) {
        document.removeEventListener('visibilitychange', this.webVisibilityHandler, false);
      }

      this.webVisibilityHandler = null;
      this.webFocusHandler = null;
      this.webOnlineHandler = null;
      return;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  refreshTokens = async (trigger = 'manual'): Promise<void> => {
    if (this.refreshPromiseRef) {
      return this.refreshPromiseRef;
    }

    const currentRT = this.tokensRef?.refreshToken;
    if (!currentRT) {
      await this.clearStoredTokens();
      return;
    }

    const currentRefreshFingerprint = fingerprintToken(currentRT);
    this.syncLastUsedRefreshFingerprintFromWebState();

    if (this.lastUsedRefreshTokenFingerprint === currentRefreshFingerprint) {
      console.warn('[AuthRefresh] Refresh token reuse detected before request. Invalidating session.', {
        trigger,
        refreshTokenFingerprint: currentRefreshFingerprint,
      });
      await this.clearStoredTokens();
      throw new Error('Refresh token reuse detected. Session invalidated.');
    }

    if (!this.tryAcquireWebRefreshLock(trigger, currentRefreshFingerprint)) {
      setTimeout(() => {
        void this.ensureFreshSession('web:refresh-lock-wait');
      }, 900);
      return;
    }

    this.clearRefreshTimer();
    const attemptId = ++this.refreshAttemptSeq;

    this.refreshPromiseRef = (async () => {
      try {
        console.log('[AuthRefresh] Attempt started', {
          attemptId,
          trigger,
          refreshTokenFingerprint: currentRefreshFingerprint,
        });

        const response = (await refresh(currentRT)) as RefreshResponse;

        if (!response?.accessToken || typeof response.accessToken !== 'string') {
          throw new Error('Invalid accessToken in refresh response');
        }

        const nextRefreshToken = response.refreshToken;
        if (!nextRefreshToken || typeof nextRefreshToken !== 'string') {
          throw new Error('Invalid refreshToken in refresh response');
        }

        if (nextRefreshToken === currentRT) {
          throw new Error('Refresh token rotation failed: received the same refresh token');
        }

        this.lastUsedRefreshTokenFingerprint = currentRefreshFingerprint;
        this.persistLastUsedRefreshFingerprint(currentRefreshFingerprint);

        await this.saveTokens(
          {
            accessToken: response.accessToken,
            refreshToken: nextRefreshToken,
          },
          false
        );

        console.log('[AuthRefresh] Attempt succeeded', {
          attemptId,
          trigger,
          usedRefreshTokenFingerprint: currentRefreshFingerprint,
          nextRefreshTokenFingerprint: fingerprintToken(nextRefreshToken),
        });

        if (!this.snapshot.requiresAssociation) {
          await this.loadUserContext();
        }
      } catch (error) {
        console.error('Error refreshing tokens:', error, {
          attemptId,
          trigger,
          usedRefreshTokenFingerprint: currentRefreshFingerprint,
        });
        await this.clearStoredTokens();
        throw error;
      } finally {
        this.releaseWebRefreshLock();
        this.refreshPromiseRef = null;
        this.scheduleRefresh();
      }
    })();

    return this.refreshPromiseRef;
  };

  reloadUserContext = async (): Promise<void> => {
    await this.loadUserContext();
  };

  private async doInitialize(): Promise<void> {
    try {
      const storedData = await this.loadStoredTokens();

      if (!storedData) {
        this.setState({ isLoading: false });
        return;
      }

      const { tokens, requiresAssociation } = storedData;
      this.tokensRef = tokens;
      this.setState({ tokens, requiresAssociation });

      // No bloquear la UI en bootstrap por llamadas de red de contexto/refresh.
      this.setState({ isLoading: false });

      if (isTokenExpired(tokens.accessToken)) {
        if (tokens.refreshToken) {
          void this.refreshTokens('init:expired-token').catch((error) => {
            console.error('Error refreshing expired token on init:', error);
          });
        } else {
          await this.clearStoredTokens();
        }
        return;
      }

      this.scheduleRefresh();
      if (!requiresAssociation) {
        void this.loadUserContext();
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      await this.clearStoredTokens();
    } finally {
      this.setState({ isLoading: false });
    }
  }

  private async loadStoredTokens(): Promise<StoredTokensResult | null> {
    try {
      const accessToken = await storage.getItem('accessToken');
      const refreshToken = await storage.getItem('refreshToken');
      const requiresAssociationStr = await storage.getItem('requiresAssociation');
      const requiresAssociation = requiresAssociationStr === 'true';

      if (accessToken && (refreshToken || requiresAssociation)) {
        return {
          tokens: {
            accessToken,
            refreshToken: refreshToken ?? undefined,
          },
          requiresAssociation,
        };
      }

      return null;
    } catch (error) {
      console.error('Error loading stored tokens:', error);
      return null;
    }
  }

  private async saveTokens(newTokens: AuthTokens, schedule = true): Promise<void> {
    const accessToken = String(newTokens.accessToken);
    const refreshToken = newTokens.refreshToken ? String(newTokens.refreshToken) : null;

    if (!accessToken || accessToken === 'null' || accessToken === 'undefined') {
      throw new Error('Invalid accessToken: must be a non-empty string');
    }

    await storage.setItem('accessToken', accessToken);

    if (refreshToken && refreshToken !== 'null' && refreshToken !== 'undefined') {
      await storage.setItem('refreshToken', refreshToken);
    } else {
      await storage.deleteItem('refreshToken');
    }

    const saved: AuthTokens = {
      accessToken,
      refreshToken: refreshToken || undefined,
    };

    this.tokensRef = saved;
    this.setState({ tokens: saved });

    if (schedule) {
      this.scheduleRefresh();
    }
  }

  private async clearStoredTokens(): Promise<void> {
    try {
      await storage.deleteItem('accessToken');
      await storage.deleteItem('refreshToken');
      await storage.deleteItem('requiresAssociation');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }

    this.clearRefreshTimer();
    this.tokensRef = null;
    this.lastUsedRefreshTokenFingerprint = null;
    this.clearWebRefreshState();

    const queryClient = getQueryClient();
    queryClient.clear();

    this.setState({
      tokens: null,
      user: null,
      requiresAssociation: false,
    });
  }

  private async loadUserContext(): Promise<void> {
    const accessToken = this.tokensRef?.accessToken;
    if (!accessToken) {
      this.setState({ user: null });
      return;
    }

    try {
      const user = (await getUserContext(accessToken)) as ExtendedUserContext;
      this.setState({ user, requiresAssociation: false });

      const queryClient = getQueryClient();
      queryClient.setQueryData(['userContext', accessToken], user);
      queryClient.invalidateQueries({ queryKey: ['userContext'] });
    } catch (error) {
      console.error('Error loading user context:', error);
      this.setState({ user: null });
    }
  }

  private scheduleRefresh(): void {
    if (this.refreshPromiseRef) {
      return;
    }

    this.clearRefreshTimer();

    const accessToken = this.tokensRef?.accessToken;
    if (!accessToken) {
      return;
    }

    const expirationTime = getTokenExpirationTime(accessToken);
    if (!expirationTime) {
      return;
    }

    const refreshIn = Math.max(expirationTime - 5 * 60 * 1000, 0);

    this.refreshTimerRef = setTimeout(() => {
      if (Platform.OS === 'web' && typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        console.info('[AuthRefresh] Timer skipped while web tab is hidden. Refresh will run on focus/visibility.');
        return;
      }

      if (Platform.OS !== 'web' && AppState.currentState !== 'active') {
        console.info('[AuthRefresh] Timer skipped while app is not active. Refresh will run on app resume.');
        return;
      }

      this.refreshTokens('timer').catch((error) => {
        console.error('Auto-refresh failed:', error);
      });
    }, refreshIn);
  }

  private clearRefreshTimer(): void {
    if (!this.refreshTimerRef) {
      return;
    }

    clearTimeout(this.refreshTimerRef);
    this.refreshTimerRef = null;
  }

  private setState(patch: Partial<AuthSessionSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  }

  private readWebRefreshState(): WebRefreshState | null {
    if (Platform.OS !== 'web' || typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const rawState = localStorage.getItem(WEB_REFRESH_STATE_KEY);
      if (!rawState) {
        return null;
      }

      const parsed = JSON.parse(rawState) as WebRefreshState;
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  private writeWebRefreshState(state: WebRefreshState): void {
    if (Platform.OS !== 'web' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(WEB_REFRESH_STATE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage issues on best-effort diagnostics/locking.
    }
  }

  private tryAcquireWebRefreshLock(trigger: string, refreshTokenFingerprint: string): boolean {
    if (Platform.OS !== 'web' || typeof localStorage === 'undefined') {
      return true;
    }

    const now = Date.now();
    const state = this.readWebRefreshState();
    if (state?.lastUsedRefreshTokenFingerprint === refreshTokenFingerprint) {
      console.warn('[AuthRefresh] Reuse detected from persisted state before lock acquisition.', {
        trigger,
        refreshTokenFingerprint,
      });
      return false;
    }

    if (
      state?.lockOwnerId &&
      state.lockOwnerId !== this.instanceId &&
      typeof state.lockExpiresAt === 'number' &&
      state.lockExpiresAt > now
    ) {
      console.info('[AuthRefresh] Skipped refresh due to active web lock', {
        trigger,
        refreshTokenFingerprint,
        lockOwnerId: state.lockOwnerId,
        lockExpiresAt: state.lockExpiresAt,
      });
      return false;
    }

    const lockNonce = Math.random().toString(36).slice(2, 10);
    this.writeWebRefreshState({
      ...state,
      lockOwnerId: this.instanceId,
      lockExpiresAt: now + this.webRefreshLockTtlMs,
      lockNonce,
    });

    const confirmedState = this.readWebRefreshState();
    const lockAcquired =
      confirmedState?.lockOwnerId === this.instanceId && confirmedState?.lockNonce === lockNonce;

    if (!lockAcquired) {
      console.info('[AuthRefresh] Lost lock race after write-verify. Skipping attempt.', {
        trigger,
        refreshTokenFingerprint,
        confirmedLockOwnerId: confirmedState?.lockOwnerId,
      });
      return false;
    }

    return true;
  }

  private releaseWebRefreshLock(): void {
    if (Platform.OS !== 'web' || typeof localStorage === 'undefined') {
      return;
    }

    const state = this.readWebRefreshState();
    if (!state || state.lockOwnerId !== this.instanceId) {
      return;
    }

    const {
      lockOwnerId: _lockOwnerId,
      lockExpiresAt: _lockExpiresAt,
      lockNonce: _lockNonce,
      ...rest
    } = state;
    this.writeWebRefreshState(rest);
  }

  private persistLastUsedRefreshFingerprint(fingerprint: string): void {
    if (!fingerprint) {
      return;
    }

    const state = this.readWebRefreshState() ?? {};
    this.writeWebRefreshState({
      ...state,
      lastUsedRefreshTokenFingerprint: fingerprint,
    });
  }

  private syncLastUsedRefreshFingerprintFromWebState(): void {
    if (Platform.OS !== 'web') {
      return;
    }

    const state = this.readWebRefreshState();
    const persistedFingerprint = state?.lastUsedRefreshTokenFingerprint;
    if (!persistedFingerprint) {
      return;
    }

    this.lastUsedRefreshTokenFingerprint = persistedFingerprint;
  }

  private clearWebRefreshState(): void {
    if (Platform.OS !== 'web' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem(WEB_REFRESH_STATE_KEY);
    } catch {
      // Ignore storage issues when clearing best-effort state.
    }
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

type AuthServiceGlobal = typeof globalThis & {
  __internoAuthSessionService?: AuthSessionService;
};

const authServiceGlobal = globalThis as AuthServiceGlobal;

if (!authServiceGlobal.__internoAuthSessionService) {
  authServiceGlobal.__internoAuthSessionService = new AuthSessionService();
}

export const authSessionService = authServiceGlobal.__internoAuthSessionService;
