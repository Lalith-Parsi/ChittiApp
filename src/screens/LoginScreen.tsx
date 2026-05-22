import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts, tnum } from '../lib/theme';

type Step = 'phone' | 'otp';

/** Indian 10-digit formatting → "9XXXX XXXXX". */
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 5) return d;
  return d.slice(0, 5) + ' ' + d.slice(5);
}

/** Lowercase "chitti" wordmark with a brass dot stamped over the second 'i'. */
function Wordmark({ size = 48, color, dotColor }: { size?: number; color?: string; dotColor?: string }) {
  return (
    <View style={{ position: 'relative', alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: size, ...fonts.bold, color, letterSpacing: -1, lineHeight: size * 1.05 }}>
        chitti
      </Text>
      <View
        style={{
          position: 'absolute',
          width: size * 0.14,
          height: size * 0.14,
          borderRadius: size * 0.07,
          backgroundColor: dotColor,
          right: size * 0.24,
          top: size * 0.1,
        }}
      />
    </View>
  );
}

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { enterDemoMode } = useAuth();

  const [step, setStep]                 = useState<Step>('phone');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [otp, setOtp]                   = useState('');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [secondsLeft, setSecondsLeft]   = useState(0);

  const otpRefs = useRef<Array<TextInput | null>>([]);

  const digits = phoneDisplay.replace(/\D/g, '');
  const isPhoneValid = digits.length === 10 && /^[6-9]/.test(digits);

  /** Countdown for OTP resend window. */
  useEffect(() => {
    if (step !== 'otp' || secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [step, secondsLeft]);

  const sendOTP = async () => {
    if (!isPhoneValid) {
      setError('Enter a 10-digit mobile number starting with 6–9.');
      return;
    }
    setLoading(true); setError('');
    try {
      const fullPhone = `+91${digits}`;
      // NOTE: RecaptchaVerifier is web-only. Phase 1 of the roadmap replaces
      // this with native Firebase Phone Auth on iOS + Android.
      const w = window as unknown as { recaptchaVerifier?: RecaptchaVerifier };
      if (!w.recaptchaVerifier) {
        w.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      }
      const result = await signInWithPhoneNumber(auth, fullPhone, w.recaptchaVerifier);
      setConfirmation(result);
      setStep('otp');
      setSecondsLeft(42);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to send OTP';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (code: string) => {
    if (!confirmation) return;
    if (code.length !== 6) return;
    setLoading(true); setError('');
    try {
      await confirmation.confirm(code);
    } catch {
      setError("That code didn't match. Try again or resend.");
      setOtp('');
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (next: string) => {
    const cleaned = next.replace(/\D/g, '').slice(0, 6);
    setOtp(cleaned);
    setError('');
    if (cleaned.length === 6) {
      void verifyOTP(cleaned);
    }
  };

  /* ───────────────────────── Phone step ───────────────────────── */
  if (step === 'phone') {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.phoneRoot}>
          <View style={styles.heroBlock}>
            <Wordmark size={48} color={colors.text} dotColor={colors.accent} />
            <Text style={styles.heroTitle}>Run a real chit fund from your phone.</Text>
            <Text style={styles.heroSub}>Every member sees the same numbers. The math is always right.</Text>
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.fieldLabel}>Your phone number</Text>
            <View style={[styles.field, !!error && styles.fieldError]}>
              <View style={styles.codeChip}>
                <Text style={[styles.codeChipFlag, { color: '#FF9933' }]}>●</Text>
                <Text style={[styles.codeChipFlag, { color: '#138808' }]}>●</Text>
                <Text style={[styles.codeChipText, tnum]}>+91</Text>
              </View>
              <View style={styles.codeDivider} />
              <TextInput
                style={[styles.phoneInput, tnum]}
                placeholder="98XXX XXXXX"
                placeholderTextColor={colors.textHint}
                value={phoneDisplay}
                onChangeText={(t) => { setPhoneDisplay(formatPhone(t)); setError(''); }}
                keyboardType="phone-pad"
                maxLength={11}
                autoFocus
              />
            </View>
            {!!error && <Text style={styles.inlineError}>{error}</Text>}
          </View>

          <View style={styles.bottomBlock}>
            <TouchableOpacity
              style={[styles.primaryBtn, (!isPhoneValid || loading) && styles.primaryBtnDisabled]}
              onPress={sendOTP}
              disabled={!isPhoneValid || loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={isDark ? '#07140D' : '#FAF7F0'} />
                : <Text style={styles.primaryBtnText}>Send OTP  →</Text>}
            </TouchableOpacity>
            <Text style={styles.legal}>
              By continuing you agree to our <Text style={styles.legalLink}>Terms</Text> and{' '}
              <Text style={styles.legalLink}>Privacy Policy</Text>. We'll send a one-time code to verify it's you.
            </Text>

            <View style={styles.demoDivider}>
              <View style={styles.demoLine} />
              <Text style={styles.demoOrText}>or</Text>
              <View style={styles.demoLine} />
            </View>
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={enterDemoMode}
              activeOpacity={0.85}
            >
              <Text style={styles.demoBtnText}>Preview without signing in  →</Text>
            </TouchableOpacity>
            <Text style={styles.demoHint}>
              Loads 3 sample chits so you can poke around. Nothing is saved.
            </Text>
          </View>

          {/* RecaptchaVerifier mounts here (web only). Phase 1 removes this entirely. */}
          <View nativeID="recaptcha-container" />
        </View>
      </KeyboardAvoidingView>
    );
  }

  /* ───────────────────────── OTP step ───────────────────────── */
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.otpRoot}>
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => { setStep('phone'); setOtp(''); setError(''); }}
        >
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.otpTitle}>Enter the 6-digit code</Text>
        <View style={styles.otpSubRow}>
          <Text style={styles.otpSubText}>We sent it to </Text>
          <Text style={[styles.otpSubPhone, tnum]}>+91 {phoneDisplay}</Text>
          <Text style={styles.otpSubDot}> · </Text>
          <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); }}>
            <Text style={styles.otpEditLink}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.otpBoxes}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.otpBox,
                otp.length === i && styles.otpBoxFocused,
                !!error && styles.otpBoxError,
              ]}
            >
              <Text style={[styles.otpBoxDigit, tnum, !!error && { color: colors.danger }]}>
                {otp[i] ?? ''}
              </Text>
            </View>
          ))}
          {/* Single hidden input drives all six boxes — the simple, reliable RN pattern. */}
          <TextInput
            ref={(r) => { otpRefs.current[0] = r; }}
            style={styles.otpHiddenInput}
            value={otp}
            onChangeText={handleOtpChange}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            caretHidden
          />
        </View>

        <View style={styles.otpStatusRow}>
          {loading && (
            <View style={styles.otpStatusInner}>
              <ActivityIndicator size="small" color={colors.textSub} />
              <Text style={styles.otpStatusText}>Verifying…</Text>
            </View>
          )}
          {!!error && (
            <Text style={[styles.otpStatusText, { color: colors.danger }]}>{error}</Text>
          )}
        </View>

        <View style={{ flex: 1 }} />

        <View style={styles.otpResendRow}>
          {secondsLeft > 0 ? (
            <Text style={styles.otpResendCountdown}>
              Resend code in{' '}
              <Text style={[styles.otpResendCountdownNum, tnum]}>
                0:{String(secondsLeft).padStart(2, '0')}
              </Text>
            </Text>
          ) : (
            <View style={styles.otpResendActions}>
              <Text style={styles.otpResendLabel}>Didn't get it?</Text>
              <TouchableOpacity onPress={sendOTP}>
                <Text style={styles.otpResendLink}>Resend</Text>
              </TouchableOpacity>
              <Text style={styles.otpResendDot}> · </Text>
              <TouchableOpacity>
                <Text style={styles.otpResendLink}>Call me instead</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    /* Phone step */
    phoneRoot: {
      flex: 1,
      paddingHorizontal: 28,
      paddingTop: 64,
      paddingBottom: 32,
      backgroundColor: c.bg,
    },
    heroBlock: { marginTop: 12 },
    heroTitle: {
      marginTop: 24,
      fontSize: 24,
      lineHeight: 30,
      ...fonts.semiBold,
      color: c.text,
      letterSpacing: -0.4,
      maxWidth: 300,
    },
    heroSub: {
      marginTop: 10,
      fontSize: 15,
      lineHeight: 22,
      ...fonts.regular,
      color: c.textSub,
      maxWidth: 300,
    },

    inputBlock: { marginTop: 44 },
    fieldLabel: {
      fontSize: 13,
      ...fonts.medium,
      color: c.textSub,
      letterSpacing: 0.15,
      marginBottom: 8,
      paddingLeft: 4,
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.inputBg,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    fieldError: { borderColor: c.danger },
    codeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.divider2,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
    },
    codeChipFlag:  { fontSize: 10, lineHeight: 10 },
    codeChipText:  { fontSize: 15, ...fonts.semiBold, color: c.text, marginLeft: 2 },
    codeDivider:   { width: 1, height: 28, backgroundColor: c.divider2 },
    phoneInput: {
      flex: 1,
      fontSize: 20,
      ...fonts.medium,
      color: c.text,
      letterSpacing: 0.5,
      paddingVertical: 8,
    },
    inlineError: {
      marginTop: 10,
      paddingLeft: 4,
      fontSize: 13,
      ...fonts.medium,
      color: c.danger,
    },

    bottomBlock: { marginTop: 'auto' },
    primaryBtn: {
      backgroundColor: c.primary,
      borderRadius: 14,
      paddingVertical: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnDisabled: { opacity: 0.4 },
    primaryBtnText: { fontSize: 16, ...fonts.semiBold, color: c.bg, letterSpacing: 0.2 },
    legal: {
      marginTop: 18,
      paddingHorizontal: 18,
      fontSize: 12,
      lineHeight: 18,
      ...fonts.regular,
      color: c.textMuted,
      textAlign: 'center',
    },
    legalLink: { color: c.textSub, textDecorationLine: 'underline' },

    /* Demo affordance */
    demoDivider: {
      marginTop: 20, marginBottom: 12,
      flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    demoLine: { flex: 1, height: 1, backgroundColor: c.border },
    demoOrText: { fontSize: 12, ...fonts.medium, color: c.textMuted },
    demoBtn: {
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1, borderColor: c.accent,
      backgroundColor: c.accentLight,
      alignItems: 'center',
    },
    demoBtnText: { fontSize: 15, ...fonts.semiBold, color: c.accent },
    demoHint: {
      marginTop: 8,
      fontSize: 11.5,
      ...fonts.regular,
      color: c.textMuted,
      textAlign: 'center',
    },

    /* OTP step */
    otpRoot: {
      flex: 1,
      paddingHorizontal: 28,
      paddingTop: 64,
      paddingBottom: 36,
      backgroundColor: c.bg,
    },
    backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
    backChevron: { fontSize: 24, lineHeight: 24, color: c.textSub },
    backText: { fontSize: 16, ...fonts.medium, color: c.textSub },

    otpTitle: {
      marginTop: 28,
      fontSize: 30,
      lineHeight: 34,
      ...fonts.bold,
      color: c.text,
      letterSpacing: -0.6,
    },
    otpSubRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    otpSubText:  { fontSize: 15, ...fonts.regular, color: c.textSub },
    otpSubPhone: { fontSize: 15, ...fonts.medium, color: c.text },
    otpSubDot:   { fontSize: 15, color: c.textMuted },
    otpEditLink: { fontSize: 15, ...fonts.semiBold, color: c.primary },

    otpBoxes: {
      marginTop: 36,
      flexDirection: 'row',
      justifyContent: 'space-between',
      position: 'relative',
    },
    otpBox: {
      width: 48,
      height: 60,
      borderRadius: 12,
      backgroundColor: c.inputBg,
      borderWidth: 1.5,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    otpBoxFocused: { borderColor: c.primary },
    otpBoxError:   { borderColor: c.danger },
    otpBoxDigit:   { fontSize: 28, ...fonts.medium, color: c.text },
    otpHiddenInput: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      opacity: 0,
    },

    otpStatusRow: { minHeight: 22, marginTop: 18 },
    otpStatusInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    otpStatusText: { fontSize: 13, ...fonts.medium, color: c.textSub },

    otpResendRow: { alignItems: 'center' },
    otpResendCountdown: { fontSize: 14, ...fonts.regular, color: c.textMuted },
    otpResendCountdownNum: { ...fonts.semiBold, color: c.textSub },
    otpResendActions: { flexDirection: 'row', alignItems: 'center' },
    otpResendLabel: { fontSize: 14, color: c.textSub, marginRight: 6 },
    otpResendLink: { fontSize: 14, ...fonts.semiBold, color: c.primary, paddingHorizontal: 4 },
    otpResendDot: { color: c.textMuted },
  });
}
