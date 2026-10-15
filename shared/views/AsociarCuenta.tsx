import { InputWithIcon } from "@/components/InputWithIcon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/features/auth/context/AuthContext";
import { authSessionService } from "@/features/auth/services/AuthSessionService";
import {
  useRequestVerificationToken,
  useVerifyAndAssociate,
} from "@/shared/users/useAsociarCuenta";
import { isAsociacionSesionExpirada } from "@/shared/users/userApi";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { KEYBOARD_BEHAVIOR } from '@/shared/ui/keyboard';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { computeMaskedChange } from '@/shared/utils/maskedInput';
const colors = Colors["light"];

type Step = "cuit" | "verify" | "success";

/** El backend vence el código a los 30 minutos */
const CODE_TTL_SECONDS = 30 * 60;

const CUIT_SEPARATORS = [
  { afterDigit: 2, char: '-' },
  { afterDigit: 10, char: '-' },
];

export default function AsociarCuenta() {
  const router = useRouter();
  const { setAuthTokens, reloadUserContext, signOut } = useAuth();

  // Estado del flujo
  const [step, setStep] = useState<Step>("cuit");
  const [cuit, setCuit] = useState("");
  const [cuitSelection, setCuitSelection] = useState<{ start: number; end: number } | undefined>();
  const [destinos, setDestinos] = useState<string[]>([]);
  const [verificationToken, setVerificationToken] = useState("");
  const [entorno] = useState("interno");

  // Timers y contadores
  const [timeRemaining, setTimeRemaining] = useState(CODE_TTL_SECONDS);
  const [tokenSentAt, setTokenSentAt] = useState<number | null>(null);

  // Mutations
  const requestVerificationMutation = useRequestVerificationToken();
  const verifyAndAssociateMutation = useVerifyAndAssociate();

  // Timer para el contador de tiempo
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (tokenSentAt && step === "verify") {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - tokenSentAt) / 1000);
        const remaining = CODE_TTL_SECONDS - elapsed;

        if (remaining <= 0) {
          setTimeRemaining(0);
          if (interval) clearInterval(interval);
          Alert.alert(
            "Tiempo expirado",
            "El código de verificación venció. Pedí uno nuevo.",
            [
              {
                text: "OK",
                onPress: () => {
                  setStep("cuit");
                  setVerificationToken("");
                  setTokenSentAt(null);
                },
              },
            ]
          );
        } else {
          setTimeRemaining(remaining);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [tokenSentAt, step]);

  // Sesión readonly vencida: no hay refresh token, hay que volver a iniciar sesión.
  const handleSesionExpirada = () => {
    Alert.alert("Sesión expirada", "Tu sesión expiró. Iniciá sesión nuevamente.");
    void signOut();
    // El RootNavigator redirige automáticamente al login
  };

  // Manejo de solicitud de códigos: solo se manda el CUIT. El servidor busca las cuentas
  // y manda un código distinto al email registrado de cada una.
  const handleRequestToken = async () => {
    if (!cuit || cuit.trim().length === 0) {
      Alert.alert("Error", "Por favor ingresa un CUIT válido");
      return;
    }
    Keyboard.dismiss();

    try {
      const data = await requestVerificationMutation.mutateAsync({
        cuit: cuit.trim(),
        entorno,
      });

      setDestinos(data.destinos ?? []);
      setTokenSentAt(Date.now());
      setTimeRemaining(CODE_TTL_SECONDS);
      setVerificationToken("");
      verifyAndAssociateMutation.reset();
      setStep("verify");
    } catch (error) {
      if (isAsociacionSesionExpirada(error)) {
        handleSesionExpirada();
      }
      // El resto de los errores se muestra en pantalla (requestVerificationMutation.error)
    }
  };

  // Manejo de verificación y asociación
  const handleVerifyAndAssociate = async () => {
    const tokenToSend = verificationToken.trim();

    if (!tokenToSend || tokenToSend.length === 0) {
      Alert.alert("Error", "Por favor ingresa el código de verificación");
      return;
    }

    try {
      const response = await verifyAndAssociateMutation.mutateAsync({
        token: tokenToSend,
        entorno,
      });

      if (!response?.success || response.requiresAssociation || !response.accessToken) {
        Alert.alert("Inicia sesion nuevamente");
        router.replace("/login");
        return;
      }

      await setAuthTokens(response.accessToken, response.refreshToken);
      await reloadUserContext();

      // Revalidar estado de sesión y contexto recién hidratado para evitar quedar colgado.
      let snapshot = authSessionService.getSnapshot();
      const hasContext = Boolean(snapshot.user?.user_context_id);

      if (!hasContext || snapshot.requiresAssociation) {
        await reloadUserContext();
        snapshot = authSessionService.getSnapshot();
      }

      if (!snapshot.tokens?.accessToken || !snapshot.user?.user_context_id || snapshot.requiresAssociation) {
        Alert.alert("Inicia sesion nuevamente");
        router.replace("/login");
        return;
      }

      router.replace("/(tabs)");
    } catch (error) {
      if (isAsociacionSesionExpirada(error)) {
        handleSesionExpirada();
        return;
      }
      // Código inválido/vencido u otro error: se muestra debajo (verifyAndAssociateMutation.error)
      setVerificationToken("");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (timeRemaining > 300) return colors.lightTint;
    if (timeRemaining > 60) return colors.warning;
    return colors.error;
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={KEYBOARD_BEHAVIOR}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.formSection}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <ThemedText style={styles.title}>Asociar Cuenta</ThemedText>
            <ThemedText style={styles.subtitle}>
              {step === "cuit" && "Ingresa tu CUIT y te enviaremos un código al email registrado"}
              {step === "verify" && "Ingresa el código de verificación"}
              {step === "success" && "¡Cuenta asociada correctamente!"}
            </ThemedText>
          </View>

          {/* Step: CUIT Input */}
          {step === "cuit" && (
            <ThemedView style={[glassStyles.card, styles.formContainer]}>
              <InputWithIcon
                variant="glass"
                placeholder="CUIT (ej: 20-12345678-1)"
                value={cuit}
                selection={cuitSelection}
                onChangeText={(text) => {
                  const { formatted, cursor } = computeMaskedChange(cuit, text, 11, CUIT_SEPARATORS);
                  setCuit(formatted);
                  requestVerificationMutation.reset();
                  setCuitSelection({ start: cursor, end: cursor });
                }}
                onSelectionChange={(e) => setCuitSelection(e.nativeEvent.selection)}
                keyboardType="numeric"
                hasError={!!requestVerificationMutation.isError}
              />

              {requestVerificationMutation.isError && (
                <View style={styles.errorContainer}>
                  <Feather name="alert-circle" size={16} color={colors.error} style={{ marginRight: 8 }} />
                  <ThemedText style={styles.errorText}>
                    {requestVerificationMutation.error instanceof Error
                      ? requestVerificationMutation.error.message
                      : "Intenta nuevamente"}
                  </ThemedText>
                </View>
              )}

              <Pressable
                style={[
                  styles.button,
                  glassStyles.button,
                  (!cuit || cuit.length === 0 || requestVerificationMutation.isPending) && styles.buttonDisabled,
                ]}
                onPress={handleRequestToken}
                disabled={requestVerificationMutation.isPending || cuit.length === 0}
              >
                {requestVerificationMutation.isPending ? (
                  <ActivityIndicator color={glassColors.text} size="small" />
                ) : (
                  <>
                    <Feather name="send" size={18} color={glassColors.text} style={{ marginRight: 8 }} />
                    <ThemedText style={styles.buttonText}>Enviar Código</ThemedText>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[glassStyles.buttonDanger, styles.buttonDanger]}
                onPress={async () => {
                  await signOut();
                  // No llamamos a router.replace — el RootNavigator redirige automáticamente
                }}
              >
                <Feather name="log-out" size={18} color={colors.error} style={{ marginRight: 8 }} />
                <ThemedText style={styles.buttonDangerText}>Cerrar Sesión</ThemedText>
              </Pressable>
            </ThemedView>
          )}

          {/* Step: Verification */}
          {step === "verify" && (
            <ThemedView style={[glassStyles.card, styles.formContainer]}>
              <View style={[glassStyles.fieldGlass, styles.timerContainer]}>
                <ThemedText style={[styles.timerText, { color: getTimerColor() }]}>
                  {formatTime(timeRemaining)}
                </ThemedText>
                <ThemedText style={styles.timerLabel}>Tiempo restante</ThemedText>
              </View>

              <View style={styles.sectionHeader}>
                <Feather name="shield" size={18} color={colors.lightTint} style={{ marginRight: 8 }} />
                <ThemedText style={styles.sectionTitle}>Código de Verificación</ThemedText>
              </View>
              <ThemedText style={styles.verifyHint}>
                {destinos.length > 1
                  ? "Enviamos un código distinto a cada email registrado de las cuentas de ese CUIT. Ingresá el que recibiste:\n"
                  : "Se ha enviado un código a "}
                {destinos.join("\n")}
                {"\nEl código vence en 30 minutos."}
              </ThemedText>

              <InputWithIcon
                variant="glass"
                placeholder="Código de 6 dígitos"
                value={verificationToken}
                onChangeText={setVerificationToken}
                keyboardType="numeric"
                hasError={!!verifyAndAssociateMutation.isError}
              />

              <Pressable
                style={[
                  styles.button,
                  (!verificationToken || verifyAndAssociateMutation.isPending) && styles.buttonDisabled,
                  glassStyles.button,
                ]}
                onPress={handleVerifyAndAssociate}
                disabled={!verificationToken || verifyAndAssociateMutation.isPending}
              >
                {verifyAndAssociateMutation.isPending ? (
                  <ActivityIndicator color={glassColors.text} size="small" />
                ) : (
                  <>
                    <Feather name="check" size={18} color={glassColors.text} style={{ marginRight: 8 }} />
                    <ThemedText style={styles.buttonText}>Verificar y Asociar</ThemedText>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[
                  glassStyles.buttonSecondary,
                  styles.buttonSecondary,
                  requestVerificationMutation.isPending && styles.buttonDisabled,
                ]}
                onPress={handleRequestToken}
                disabled={requestVerificationMutation.isPending}
              >
                {requestVerificationMutation.isPending ? (
                  <ActivityIndicator color={glassColors.text} size="small" />
                ) : (
                  <>
                    <Feather name="refresh-cw" size={18} color={colors.tint} style={{ marginRight: 8 }} />
                    <ThemedText style={styles.buttonTextSecondary}>Pedir código nuevo</ThemedText>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[glassStyles.buttonSecondary, styles.buttonSecondary]}
                onPress={() => {
                  requestVerificationMutation.reset();
                  verifyAndAssociateMutation.reset();
                  setStep("cuit");
                  setVerificationToken("");
                  setTokenSentAt(null);
                }}
              >
                <Feather name="arrow-left" size={18} color={colors.tint} style={{ marginRight: 8 }} />
                <ThemedText style={styles.buttonTextSecondary}>Cambiar CUIT</ThemedText>
              </Pressable>

              {requestVerificationMutation.isError && (
                <View style={styles.errorContainer}>
                  <Feather name="alert-circle" size={16} color={colors.error} style={{ marginRight: 8 }} />
                  <ThemedText style={styles.errorText}>
                    {requestVerificationMutation.error instanceof Error
                      ? requestVerificationMutation.error.message
                      : "Intenta nuevamente"}
                  </ThemedText>
                </View>
              )}

              {verifyAndAssociateMutation.isError && (
                <View style={styles.errorContainer}>
                  <Feather name="alert-circle" size={16} color={colors.error} style={{ marginRight: 8 }} />
                  <ThemedText style={styles.errorText}>
                    {verifyAndAssociateMutation.error instanceof Error
                      ? verifyAndAssociateMutation.error.message
                      : "Intenta nuevamente"}
                  </ThemedText>
                </View>
              )}
            </ThemedView>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <ThemedView style={[glassStyles.card, styles.formContainer]}>
              <View style={styles.successContainer}>
                <View style={styles.successIconContainer}>
                  <Feather name="check-circle" size={64} color={colors.success} />
                </View>
                <ThemedText style={styles.successTitle}>¡Bienvenido!</ThemedText>
                <ThemedText style={styles.successMessage}>
                  Tu cuenta ha sido asociada exitosamente. Serás redirigido a la
                  página principal en unos momentos.
                </ThemedText>
              </View>
              <ActivityIndicator color={colors.lightTint} size="large" />
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: "5%",
  },
  formSection: {
    backgroundColor: "transparent",
    flex: 1,
    paddingHorizontal: "5%",
  },
  headerContainer: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: "center",
    lineHeight: 20,
  },
  formContainer: {
    padding: 24,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  button: {
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: glassColors.text,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  buttonSecondary: {
    minHeight: 48,
  },
  buttonTextSecondary: {
    color: glassColors.text,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  buttonDanger: {
    minHeight: 48,
  },
  buttonDangerText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  timerContainer: {
    padding: 20,
    alignItems: "center",
  },
  timerText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  timerLabel: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  verifyHint: {
    fontSize: 14,
    color: colors.secondaryText,
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: "#fee",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
});
