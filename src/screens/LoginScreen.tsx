import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { GoogleAuthProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts } from '../lib/theme';

type Step = 'home' | 'phone' | 'otp';

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [step, setStep]                   = useState<Step>('home');
  const [phone, setPhone]                 = useState('');
  const [otp, setOtp]                     = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [confirmation, setConfirmation]   = useState<ConfirmationResult | null>(null);

  const signInWithGoogle = async () => {
    setLoading(true); setError('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e: any) {
      setError(e.message ?? 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async () => {
    if (phone.replace(/\D/g, '').length < 10) { setError('Enter a valid 10-digit phone number'); return; }
    setLoading(true); setError('');
    try {
      const fullPhone = `+91${phone.replace(/\D/g, '').slice(-10)}`;
      if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      }
      const result = await signInWithPhoneNumber(auth, fullPhone, (window as any).recaptchaVerifier);
      setConfirmation(result); setStep('otp');
    } catch (e: any) {
      setError(e.message ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!confirmation) return;
    if (otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setLoading(true); setError('');
    try {
      await confirmation.confirm(otp);
    } catch {
      setError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoBox}>
          <Ionicons name="people" size={48} color="#fff" />
        </View>
        <Text style={styles.appName}>Chitti Manager</Text>
        <Text style={styles.tagline}>Manage your chitti groups with ease</Text>

        {step === 'home' && (
          <View style={styles.card}>
            <TouchableOpacity style={styles.googleBtn} onPress={signInWithGoogle} disabled={loading}>
              <Ionicons name="logo-google" size={20} color="#fff" />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.orLine} />
            </View>
            <TouchableOpacity style={styles.phoneBtn} onPress={() => { setStep('phone'); setError(''); }} disabled={loading}>
              <Ionicons name="call-outline" size={20} color={colors.primary} />
              <Text style={styles.phoneBtnText}>Continue with Phone</Text>
            </TouchableOpacity>
            {loading && <ActivityIndicator style={{ marginTop: 16 }} color={colors.primary} />}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        )}

        {step === 'phone' && (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => { setStep('home'); setError(''); }} style={styles.backRow}>
              <Ionicons name="arrow-back" size={18} color={colors.primary} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.stepTitle}>Enter your phone number</Text>
            <Text style={styles.stepSub}>We'll send you a 6-digit OTP</Text>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}><Text style={styles.countryCodeText}>🇮🇳 +91</Text></View>
              <TextInput style={styles.phoneInput} placeholder="9876543210" value={phone} onChangeText={t => { setPhone(t); setError(''); }} keyboardType="phone-pad" maxLength={10} placeholderTextColor={colors.textHint} />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={[styles.googleBtn, { marginTop: 16 }]} onPress={sendOTP} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.googleBtnText}>Send OTP</Text>}
            </TouchableOpacity>
            <View nativeID="recaptcha-container" />
          </View>
        )}

        {step === 'otp' && (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => { setStep('phone'); setError(''); }} style={styles.backRow}>
              <Ionicons name="arrow-back" size={18} color={colors.primary} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.stepTitle}>Enter OTP</Text>
            <Text style={styles.stepSub}>Sent to +91 {phone}</Text>
            <TextInput style={[styles.phoneInput, styles.otpInput]} placeholder="• • • • • •" value={otp} onChangeText={t => { setOtp(t); setError(''); }} keyboardType="number-pad" maxLength={6} placeholderTextColor={colors.textHint} textAlign="center" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={[styles.googleBtn, { marginTop: 16 }]} onPress={verifyOTP} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.googleBtnText}>Verify & Sign In</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); setError(''); }} style={styles.resendRow}>
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', padding: 24 },
    logoBox:   { width: 88, height: 88, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    appName:   { fontSize: 32, ...fonts.extraBold, color: '#fff', marginBottom: 6 },
    tagline:   { fontSize: 15, ...fonts.regular, color: 'rgba(255,255,255,0.8)', marginBottom: 32, textAlign: 'center' },
    card: {
      backgroundColor: c.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 380,
      shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
    },
    googleBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: c.primary, borderRadius: 14, paddingVertical: 15 },
    googleBtnText: { color: '#fff', fontSize: 16, ...fonts.bold },
    orRow:  { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
    orLine: { flex: 1, height: 1, backgroundColor: c.border },
    orText: { fontSize: 13, ...fonts.regular, color: c.textMuted, marginHorizontal: 10 },
    phoneBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: c.primary, borderRadius: 14, paddingVertical: 15 },
    phoneBtnText: { color: c.primary, fontSize: 16, ...fonts.bold },
    backRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
    backText: { fontSize: 14, ...fonts.semiBold, color: c.primary },
    stepTitle: { fontSize: 20, ...fonts.extraBold, color: c.text, marginBottom: 4 },
    stepSub:   { fontSize: 14, ...fonts.regular, color: c.textMuted, marginBottom: 20 },
    phoneRow:      { flexDirection: 'row', gap: 8 },
    countryCode:   { borderWidth: 1.5, borderColor: c.inputBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 13, backgroundColor: c.inputBg, justifyContent: 'center' },
    countryCodeText: { fontSize: 15, ...fonts.semiBold, color: c.text },
    phoneInput:    { flex: 1, borderWidth: 1.5, borderColor: c.inputBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 13, fontSize: 16, ...fonts.regular, color: c.text, backgroundColor: c.inputBg },
    otpInput:      { flex: 0, fontSize: 28, ...fonts.bold, letterSpacing: 8, marginTop: 4 },
    resendRow:     { alignItems: 'center', marginTop: 14 },
    resendText:    { fontSize: 14, ...fonts.semiBold, color: c.primary },
    error:         { fontSize: 13, ...fonts.regular, color: c.danger, marginTop: 10, textAlign: 'center' },
  });
}
