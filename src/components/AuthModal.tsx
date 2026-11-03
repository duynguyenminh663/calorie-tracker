import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { defaultAuthService, GUEST_USER } from '../services/authService';
import { UserProfile } from '../types';

interface AuthModalProps {
  visible: boolean;
  currentUser: UserProfile;
  onClose: () => void;
  onUserChange: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  visible,
  currentUser,
  onClose,
  onUserChange,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isGuest = currentUser.provider === 'guest';

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const res = await defaultAuthService.signInWithGoogle();
      if (res.success && res.user) {
        onUserChange(res.user);
        onClose();
      } else {
        setErrorMessage(res.error || 'Đăng nhập Google thất bại');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const res = await defaultAuthService.signInWithApple();
      if (res.success && res.user) {
        onUserChange(res.user);
        onClose();
      } else {
        setErrorMessage(res.error || 'Đăng nhập Apple/iCloud thất bại');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (!emailInput.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ email');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const res = await defaultAuthService.signInWithEmail(emailInput, passwordInput);
      if (res.success && res.user) {
        onUserChange(res.user);
        setEmailInput('');
        setPasswordInput('');
        onClose();
      } else {
        setErrorMessage(res.error || 'Đăng nhập Email thất bại');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await defaultAuthService.signOut();
    onUserChange(GUEST_USER);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      testID="auth-modal"
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalContent}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>
                  {isGuest ? 'Đăng nhập tài khoản' : 'Thông tin tài khoản'}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} testID="close-auth-modal">
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {!isGuest ? (
                /* Already Signed In View */
                <View style={styles.profileBox}>
                  <View style={styles.avatarPill}>
                    <Text style={styles.avatarText}>
                      {currentUser.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.profileName}>{currentUser.name}</Text>
                  <Text style={styles.profileEmail}>{currentUser.email || 'Tài khoản liên kết'}</Text>
                  <View style={styles.providerBadge}>
                    <Text style={styles.providerBadgeText}>
                      Đăng nhập qua: {currentUser.provider.toUpperCase()}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.signOutBtn}
                    onPress={handleSignOut}
                    testID="signout-btn"
                    activeOpacity={0.8}
                  >
                    <Text style={styles.signOutBtnText}>Đăng xuất</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Login Options View */
                <View style={styles.loginForm}>
                  <Text style={styles.subtitle}>
                    Đăng nhập để đồng bộ dinh dưỡng, hoặc tiếp tục dùng offline không cần mạng.
                  </Text>

                  {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                  {/* Social Buttons: Google & Apple */}
                  <TouchableOpacity
                    style={[styles.socialBtn, styles.googleBtn]}
                    onPress={handleGoogleSignIn}
                    disabled={isSubmitting}
                    testID="signin-google-btn"
                    activeOpacity={0.8}
                  >
                    <Text style={styles.socialIcon}>🌐</Text>
                    <Text style={styles.googleBtnText}>Tiếp tục với Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.socialBtn, styles.appleBtn]}
                    onPress={handleAppleSignIn}
                    disabled={isSubmitting}
                    testID="signin-apple-btn"
                    activeOpacity={0.8}
                  >
                    <Text style={styles.socialIcon}></Text>
                    <Text style={styles.appleBtnText}>Đăng nhập với Apple / iCloud</Text>
                  </TouchableOpacity>

                  {/* Divider */}
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>HOẶC EMAIL</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Email Inputs */}
                  <TextInput
                    style={styles.input}
                    value={emailInput}
                    onChangeText={setEmailInput}
                    placeholder="Địa chỉ Email (vidu@gmail.com)"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    testID="auth-email-input"
                  />

                  <TextInput
                    style={styles.input}
                    value={passwordInput}
                    onChangeText={setPasswordInput}
                    placeholder="Mật khẩu"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    testID="auth-password-input"
                  />

                  <TouchableOpacity
                    style={styles.emailSubmitBtn}
                    onPress={handleEmailSignIn}
                    disabled={isSubmitting}
                    testID="signin-email-btn"
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emailSubmitBtnText}>Đăng nhập bằng Email</Text>
                  </TouchableOpacity>

                  {/* Guest Continue */}
                  <TouchableOpacity
                    style={styles.guestBtn}
                    onPress={onClose}
                    testID="continue-guest-btn"
                    activeOpacity={0.7}
                  >
                    <Text style={styles.guestBtnText}>Dùng chế độ Khách (Offline)</Text>
                  </TouchableOpacity>
                </View>
              )}
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 18,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginBottom: 12,
    fontWeight: '600',
  },
  loginForm: {
    gap: 10,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  socialIcon: {
    fontSize: 16,
  },
  googleBtn: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  appleBtn: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  appleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  emailSubmitBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  emailSubmitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  guestBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  guestBtnText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  profileBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatarPill: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  providerBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  providerBadgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  signOutBtn: {
    marginTop: 24,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  signOutBtnText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default AuthModal;
