import { InputWithIcon } from "@/components/InputWithIcon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ScreenSkeleton } from "@/components/ui/ScreenSkeleton";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  useObtenerCuentasDisponibles,
  useRequestVerificationToken,
  useVerifyAndAssociate,
} from "@/shared/users/useAsociarCuenta";
import type { CuentaDisponibleDTO } from "@/shared/users/UserDTO";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

const colors = Colors["light"];

type Step = "cuit" | "select-cuenta" | "verify" | "success";

// Función para formatear CUIT como XX-XXXXXXXX-X
const formatCUIT = (value: string): string => {
  const numbersOnly = value.replace(/\D/g, "");
  const trimmed = numbersOnly.slice(0, 11);
  if (trimmed.length <= 2) return trimmed;
  if (trimmed.length <= 10) return `${trimmed.slice(0, 2)}-${trimmed.slice(2)}`;
  return `${trimmed.slice(0, 2)}-${trimmed.slice(2, 10)}-${trimmed.slice(10)}`;
};

export default function AsociarCuenta() {
  const router = useRouter();
  const { setAuthTokens, signOut } = useAuth();

  // Estado del flujo
  const [step, setStep] = useState<Step>("cuit");
  const [cuit, setCuit] = useState("");
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaDisponibleDTO | null>(null);
  const [verificationToken, setVerificationToken] = useState("");
  const [entorno] = useState("interno");
  const [noCuentasFound, setNoCuentasFound] = useState(false);

  // Timers y contadores
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [tokenSentAt, setTokenSentAt] = useState<number | null>(null);

  // Queries y Mutations
  const obtenerCuentasQuery = useObtenerCuentasDisponibles(cuit, entorno);
  const requestVerificationMutation = useRequestVerificationToken();
  const verifyAndAssociateMutation = useVerifyAndAssociate();

  // Helper para saber si realmente está buscando
  const isSearching = obtenerCuentasQuery.fetchStatus === "fetching";

  // Timer para el contador de tiempo
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (tokenSentAt && step === "verify") {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - tokenSentAt) / 1000);
        const remaining = 300 - elapsed;

        if (remaining <= 0) {
          setTimeRemaining(0);
          if (interval) clearInterval(interval);
          Alert.alert(
            "Tiempo expirado",
            "El token de verificación ha expirado. Por favor intenta de nuevo.",
            [
              {
                text: "OK",
                onPress: () => {
                  setStep("select-cuenta");
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

  // Manejo de búsqueda de CUIT
  const handleSearchCuit = async () => {
    if (!cuit || cuit.trim().length === 0) {
      Alert.alert("Error", "Por favor ingresa un CUIT válido");
      return;
    }
    Keyboard.dismiss();
    setNoCuentasFound(false);
    obtenerCuentasQuery.refetch();
  };

  // Cuando se cargan las cuentas
  useEffect(() => {
    if (obtenerCuentasQuery.isSuccess && obtenerCuentasQuery.data?.cuentas && step === "cuit") {
      if (obtenerCuentasQuery.data.cuentas.length > 0) {
        setNoCuentasFound(false);
        setStep("select-cuenta");
      } else {
        setNoCuentasFound(true);
      }
    }
  }, [obtenerCuentasQuery.isSuccess, obtenerCuentasQuery.data, step]);

  // Manejo de solicitud de token
  const handleRequestToken = async () => {
    if (!selectedCuenta) {
      Alert.alert("Error", "Por favor selecciona una cuenta");
      return;
    }

    try {
      const data = await requestVerificationMutation.mutateAsync({
        cuenta: selectedCuenta,
        entorno,
      });

      setTokenSentAt(Date.now());
      setTimeRemaining(1500);
      setVerificationToken("");
      setStep("verify");

      Alert.alert(
        "Token enviado",
        `Se ha enviado un código de verificación a: ${data.contact}`
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Intenta nuevamente");
    }
  };

  // Manejo de verificación y asociación
  const handleVerifyAndAssociate = async () => {
    const tokenToSend = verificationToken.trim();

    if (!tokenToSend || tokenToSend.length === 0) {
      Alert.alert("Error", "Por favor ingresa el código de verificación");
      return;
    }

    if (!selectedCuenta) {
      Alert.alert("Error", "No se encontró la cuenta seleccionada");
      return;
    }

    try {
      const response = await verifyAndAssociateMutation.mutateAsync({
        cuenta: selectedCuenta,
        token: tokenToSend,
        entorno,
      });

      await setAuthTokens(response.accessToken, response.refreshToken);
      setStep("success");

      setTimeout(() => {
        router.replace("/(tabs)");
      }, 2000);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Intenta nuevamente");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const maskContact = (contact: string) => {
    if (contact.includes("@")) {
      return contact.replace(/(.{2})(.*)(@.*)/, "$1***$3");
    }
    return contact.replace(/(.{3})(.*)(.{2})$/, "$1***$3");
  };

  const getTimerColor = () => {
    if (timeRemaining > 180) return colors.lightTint;
    if (timeRemaining > 60) return colors.warning;
    return colors.error;
  };

  // Error content memoizado
  const cuitErrorContent = useMemo(() => {
    if (!obtenerCuentasQuery.isError) return null;
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={16} color={colors.error} style={{ marginRight: 8 }} />
        <ThemedText style={styles.errorText}>
          {obtenerCuentasQuery.error instanceof Error
            ? obtenerCuentasQuery.error.message
            : "Intenta nuevamente"}
        </ThemedText>
      </View>
    );
  }, [obtenerCuentasQuery.isError, obtenerCuentasQuery.error]);

  // Si hay loading activo, mostrar skeleton
  if (isSearching) {
    return <ScreenSkeleton rows={4} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
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
              {step === "cuit" && "Ingresa tu CUIT para buscar cuentas disponibles"}
              {step === "select-cuenta" && "Selecciona la cuenta a asociar"}
              {step === "verify" && "Ingresa el código de verificación"}
              {step === "success" && "¡Cuenta asociada correctamente!"}
            </ThemedText>
          </View>

          {/* Step: CUIT Input */}
          {step === "cuit" && (
            <ThemedView style={styles.formContainer}>
              <InputWithIcon
                icon="�"
                placeholder="CUIT (ej: 20-12345678-1)"
                value={cuit}
                onChangeText={(value) => {
                  setCuit(formatCUIT(value));
                  setNoCuentasFound(false);
                }}
                keyboardType="numeric"
                hasError={!!obtenerCuentasQuery.isError}
              />

              {cuitErrorContent}

              {/* Mensaje cuando no se encontraron cuentas */}
              {noCuentasFound && (
                <View style={styles.warningContainer}>
                  <Feather name="alert-triangle" size={18} color={colors.warning} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.warningTitle}>No se encontraron cuentas</ThemedText>
                    <ThemedText style={styles.warningText}>
                      No hay cuentas disponibles para el CUIT ingresado. Verifica que el número sea correcto e intenta nuevamente.
                    </ThemedText>
                  </View>
                </View>
              )}

              <Pressable
                style={[
                  styles.button,
                  (!cuit || cuit.length === 0) && styles.buttonDisabled,
                ]}
                onPress={handleSearchCuit}
                disabled={isSearching || cuit.length === 0}
              >
                <Feather name="search" size={18} color={colors.componentBackground} style={{ marginRight: 8 }} />
                <ThemedText style={styles.buttonText}>Buscar Cuentas</ThemedText>
              </Pressable>

              <Pressable
                style={styles.buttonDanger}
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

          {/* Step: Select Cuenta */}
          {step === "select-cuenta" && (
            <ThemedView style={styles.formContainer}>
              <View style={styles.sectionHeader}>
                <Feather name="users" size={18} color={colors.lightTint} style={{ marginRight: 8 }} />
                <ThemedText style={styles.sectionTitle}>Cuentas Disponibles</ThemedText>
              </View>

              {obtenerCuentasQuery.data?.cuentas && obtenerCuentasQuery.data.cuentas.length > 0 ? (
                <FlatList
                  data={obtenerCuentasQuery.data.cuentas}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <Pressable
                      style={[
                        styles.cuentaCard,
                        selectedCuenta?.id === item.id && styles.selectedCard,
                      ]}
                      onPress={() => setSelectedCuenta(item)}
                    >
                      <View style={styles.cuentaContent}>
                        <ThemedText style={styles.cuentaName}>
                          {item.nombre || "Cuenta"} {item.apellido || ""}
                        </ThemedText>
                        <ThemedText style={styles.cuentaDetail}>
                          CUIT: {item.cuit || "N/A"}
                        </ThemedText>
                        <ThemedText style={styles.cuentaDetail}>
                          Tipo: {item.tabla_origen}
                        </ThemedText>
                        <ThemedText style={styles.cuentaDetail}>
                          Entorno: {item.entorno}
                        </ThemedText>
                        <ThemedText style={styles.cuentaDetail}>
                          Contacto: {maskContact(item.contact)}
                        </ThemedText>
                      </View>
                      {selectedCuenta?.id === item.id && (
                        <Feather name="check-circle" size={24} color={colors.lightTint} />
                      )}
                    </Pressable>
                  )}
                />
              ) : (
                <View style={styles.warningContainer}>
                  <Feather name="alert-triangle" size={18} color={colors.warning} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.warningTitle}>Sin cuentas disponibles</ThemedText>
                    <ThemedText style={styles.warningText}>
                      No se encontraron cuentas para este CUIT. Verifica el número e intenta nuevamente.
                    </ThemedText>
                  </View>
                </View>
              )}

              {obtenerCuentasQuery.data?.cuentas && obtenerCuentasQuery.data.cuentas.length > 0 && (
                <Pressable
                  style={[
                    styles.button,
                    (!selectedCuenta || requestVerificationMutation.isPending) && styles.buttonDisabled,
                  ]}
                  onPress={handleRequestToken}
                  disabled={!selectedCuenta || requestVerificationMutation.isPending}
                >
                  {requestVerificationMutation.isPending ? (
                    <ActivityIndicator color={colors.componentBackground} size="small" />
                  ) : (
                    <>
                      <Feather name="send" size={18} color={colors.componentBackground} style={{ marginRight: 8 }} />
                      <ThemedText style={styles.buttonText}>Enviar Código</ThemedText>
                    </>
                  )}
                </Pressable>
              )}

              <Pressable
                style={styles.buttonSecondary}
                onPress={() => {
                  setStep("cuit");
                  setCuit("");
                  setSelectedCuenta(null);
                  setNoCuentasFound(false);
                }}
              >
                <Feather name="arrow-left" size={18} color={colors.tint} style={{ marginRight: 8 }} />
                <ThemedText style={styles.buttonTextSecondary}>Volver</ThemedText>
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
            </ThemedView>
          )}

          {/* Step: Verification */}
          {step === "verify" && (
            <ThemedView style={styles.formContainer}>
              <View style={styles.timerContainer}>
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
                Se ha enviado un código a{" "}
                {selectedCuenta && maskContact(selectedCuenta.contact)}
              </ThemedText>

              <InputWithIcon
                icon="🔐"
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
                ]}
                onPress={handleVerifyAndAssociate}
                disabled={!verificationToken || verifyAndAssociateMutation.isPending}
              >
                {verifyAndAssociateMutation.isPending ? (
                  <ActivityIndicator color={colors.componentBackground} size="small" />
                ) : (
                  <>
                    <Feather name="check" size={18} color={colors.componentBackground} style={{ marginRight: 8 }} />
                    <ThemedText style={styles.buttonText}>Verificar y Asociar</ThemedText>
                  </>
                )}
              </Pressable>

              <Pressable
                style={styles.buttonSecondary}
                onPress={() => {
                  setStep("select-cuenta");
                  setVerificationToken("");
                  setTokenSentAt(null);
                }}
              >
                <Feather name="arrow-left" size={18} color={colors.tint} style={{ marginRight: 8 }} />
                <ThemedText style={styles.buttonTextSecondary}>Cambiar Cuenta</ThemedText>
              </Pressable>

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
            <ThemedView style={styles.formContainer}>
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
    backgroundColor: colors.componentBackground,
    borderRadius: 16,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.lightTint,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 48,
    elevation: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: colors.secondaryText,
    opacity: 0.5,
  },
  buttonText: {
    color: colors.componentBackground,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  buttonSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderColor: colors.tint,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  buttonTextSecondary: {
    color: colors.tint,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  buttonDanger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderColor: colors.error,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  buttonDangerText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  cuentaCard: {
    borderWidth: 1,
    borderColor: "#e0e3e7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedCard: {
    borderColor: colors.lightTint,
    borderWidth: 2,
    backgroundColor: "#e8f0fe",
  },
  cuentaContent: {
    flex: 1,
  },
  cuentaName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  cuentaDetail: {
    fontSize: 13,
    color: colors.secondaryText,
    marginBottom: 2,
  },
  timerContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  timerText: {
    fontSize: 48,
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
  warningContainer: {
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  warningTitle: {
    color: "#E65100",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  warningText: {
    color: "#BF360C",
    fontSize: 13,
    lineHeight: 18,
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
