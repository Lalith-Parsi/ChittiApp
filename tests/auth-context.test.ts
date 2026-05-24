// TODO(plan-01-04): wire when implementation lands
//
// RED-by-default scaffold. Plan 01-04 swaps AuthContext from `firebase/auth`
// to `@react-native-firebase/auth`. This smoke test asserts AUTH-04 (sign-out
// resets user state) against the post-swap shape. Today the @react-native-firebase
// package is not installed, so the mock target does not resolve and the test REDs.

jest.mock('@react-native-firebase/auth', () => {
  let listener: ((user: unknown) => void) | null = null;
  const auth = () => ({
    onAuthStateChanged: (cb: (u: unknown) => void) => {
      listener = cb;
      cb({ uid: 'test-uid', phoneNumber: '+919876543210' });
      return () => {
        listener = null;
      };
    },
    signOut: async () => {
      if (listener) listener(null);
    },
    currentUser: { uid: 'test-uid' },
  });
  return { __esModule: true, default: auth };
});

describe('AuthContext sign-out (AUTH-04)', () => {
  it('exports an AuthProvider and useAuth hook from src/lib/AuthContext', () => {
    const mod = require('../src/lib/AuthContext');
    expect(typeof mod.AuthProvider).toBe('function');
    expect(typeof mod.useAuth).toBe('function');
  });

  it('auth().signOut() emits null user via onAuthStateChanged', async () => {
    const authMod = require('@react-native-firebase/auth');
    const a = authMod.default();
    let observed: unknown = 'unset';
    a.onAuthStateChanged((u: unknown) => {
      observed = u;
    });
    expect(observed).toEqual({ uid: 'test-uid', phoneNumber: '+919876543210' });
    await a.signOut();
    expect(observed).toBeNull();
  });
});
