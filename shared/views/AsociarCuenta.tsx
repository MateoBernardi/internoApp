import { Colors } from "@/constants/theme";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  useObtenerCuentasDisponibles,
  useRequestVerificationToken,
  useVerifyAndAssociate,
} from "@/shared/users/useAssociarCuenta";
import type { CuentaDisponibleDTO } from "@/shared/users/UserDTO";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Step = "cuit" | "select-cuenta" | "verify" | "success";

// Función para formatear CUIT como XX-XXXXXXXX-X
const formatCUIT = (value: string): string => {
  // Solo acepta números
  const numbersOnly = value.replace(/\D/g, "");
  
  // Si tiene más de 11 dígitos, corta
  const trimmed = numbersOnly.slice(0, 11);
  
  // Aplica el formato XX-XXXXXXXX-X
  if (trimmed.length <= 2) {
    return trimmed;
  }
  if (trimmed.length <= 10) {
    return `${trimmed.slice(0, 2)}-${trimmed.slice(2)}`;
  }
  return `${trimmed.slice(0, 2)}-${trimmed.slice(2, 10)}-${trimmed.slice(10)}`;
};

export default function AsociarCuenta() {
  const router = useRouter();
  const { signIn, signOut } = useAuth();

  // Estado del flujo
  const [step, setStep] = useState<Step>("cuit");
  const [cuit, setCuit] = useState("");
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaDisponibleDTO | null>(null);
  const [verificationToken, setVerificationToken] = useState("");
  const [entorno] = useState("interno");

  // Timers y contadores
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutos
  const [tokenSentAt, setTokenSentAt] = useState<number | null>(null);

  // Queries y Mutations
  const obtenerCuentasQuery = useObtenerCuentasDisponibles(cuit, entorno);
  const requestVerificationMutation = useRequestVerificationToken();
  const verifyAndAssociateMutation = useVerifyAndAssociate();

  // Helper para saber si realmente está buscando
  const isSearching = obtenerCuentasQuery.fetchStatus === 'fetching';

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

    obtenerCuentasQuery.refetch();
  };

  // Cuando se cargan las cuentas
  useEffect(() => {
    if (
      obtenerCuentasQuery.isSuccess &&
      obtenerCuentasQuery.data?.cuentas &&
      obtenerCuentasQuery.data.cuentas.length > 0 &&
      step === "cuit"
    ) {
      setStep("select-cuenta");
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
      Alert.alert(
        "Error",
        error.message || "No se pudo enviar el token de verificación"
      );
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
      console.log('Enviando token para verificar:', tokenToSend);
      const response = await verifyAndAssociateMutation.mutateAsync({
        cuenta: selectedCuenta,
        token: tokenToSend,
        entorno,
      });

      // Guardar los nuevos tokens
      await SecureStore.setItemAsync("accessToken", response.accessToken);
      if (response.refreshToken) {
        await SecureStore.setItemAsync("refreshToken", response.refreshToken);
      }

      // Actualizar el contexto de autenticación
      await signIn(response.accessToken, response.refreshToken || "");

      setStep("success");

      // Redirigir después de 2 segundos
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 2000);
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo asociar la cuenta");
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
    if (timeRemaining > 180) return Colors.light.tint || "#007AFF"; // Verde
    if (timeRemaining > 60) return Colors.light.warning || "#FF9800"; // Naranja
    return Colors.light.error || "#FF3B30"; // Rojo
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Asociar Cuenta</Text>
          <Text style={styles.subtitle}>
            {step === "cuit" && "Ingresa tu CUIT para buscar cuentas disponibles"}
            {step === "select-cuenta" && "Selecciona la cuenta a asociar"}
            {step === "verify" && "Ingresa el código de verificación"}
            {step === "success" && "¡Cuenta asociada correctamente!"}
          </Text>
        </View>

        {/* Step: CUIT Input */}
        {step === "cuit" && (
          <View style={styles.step}>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu CUIT (ej: 20-123456789-1)"
              value={cuit}
              onChangeText={(value) => setCuit(formatCUIT(value))}
              keyboardType="numeric"
              editable={!isSearching}
            />

            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                isSearching && styles.disabledButton,
              ]}
              onPress={handleSearchCuit}
              disabled={isSearching || cuit.length === 0}
            >
              {isSearching ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.buttonText}>Buscando...</Text>
                </>
              ) : (
                <Text style={styles.buttonText}>Buscar Cuentas</Text>
              )}
            </TouchableOpacity>

            {obtenerCuentasQuery.isError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                  {obtenerCuentasQuery.error instanceof Error
                    ? obtenerCuentasQuery.error.message
                    : "Error al buscar cuentas"}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={async () => {
                await signOut();
                router.replace("/login");
              }}
            >
              <Text style={styles.dangerButtonText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step: Select Cuenta */}
        {step === "select-cuenta" && (
          <View style={styles.step}>
            <Text style={styles.sectionTitle}>Cuentas Disponibles</Text>
            {obtenerCuentasQuery.data?.cuentas && obtenerCuentasQuery.data.cuentas.length > 0 ? (
              <FlatList
                data={obtenerCuentasQuery.data.cuentas}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.cuentaCard,
                    selectedCuenta?.id === item.id && styles.selectedCard,
                  ]}
                  onPress={() => setSelectedCuenta(item)}
                >
                  <View style={styles.cuentaContent}>
                    <Text style={styles.cuentaName}>
                      {item.nombre || "Cuenta"} {item.apellido || ""}
                    </Text>
                    <Text style={styles.cuentaDetail}>
                      CUIT: {item.cuit || "N/A"}
                    </Text>
                    <Text style={styles.cuentaDetail}>
                      Tipo: {item.tabla_origen}
                    </Text>
                    <Text style={styles.cuentaDetail}>
                      Entorno: {item.entorno}
                    </Text>
                    <Text style={styles.cuentaDetail}>
                      Contacto: {maskContact(item.contact)}
                    </Text>
                  </View>
                  {selectedCuenta?.id === item.id && (
                    <Text style={styles.selectedBadge}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No se encontraron cuentas para este CUIT
                </Text>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => {
                    setStep("cuit");
                    setCuit("");
                    setSelectedCuenta(null);
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Intentar otro CUIT</Text>
                </TouchableOpacity>
              </View>
            )}

            {obtenerCuentasQuery.data?.cuentas && obtenerCuentasQuery.data.cuentas.length > 0 && (
              <>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.primaryButton,
                    (!selectedCuenta || requestVerificationMutation.isPending) &&
                      styles.disabledButton,
                  ]}
                  onPress={handleRequestToken}
                  disabled={
                    !selectedCuenta || requestVerificationMutation.isPending
                  }
                >
                  {requestVerificationMutation.isPending ? (
                    <>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.buttonText}>Enviando...</Text>
                    </>
                  ) : (
                    <Text style={styles.buttonText}>Enviar Código</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => {
                    setStep("cuit");
                    setCuit("");
                    setSelectedCuenta(null);
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Volver</Text>
                </TouchableOpacity>
              </>
            )}

            {requestVerificationMutation.isError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                  {requestVerificationMutation.error instanceof Error
                    ? requestVerificationMutation.error.message
                    : "Error al enviar el código"}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Step: Verification */}
        {step === "verify" && (
          <View style={styles.step}>
            <View style={styles.timerContainer}>
              <Text style={[styles.timerText, { color: getTimerColor() }]}>
                {formatTime(timeRemaining)}
              </Text>
              <Text style={styles.timerLabel}>Tiempo restante</Text>
            </View>

            <Text style={styles.sectionTitle}>Código de Verificación</Text>
            <Text style={styles.verifyHint}>
              Se ha enviado un código a{" "}
              {selectedCuenta && maskContact(selectedCuenta.contact)}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Ingresa el código de 6 dígitos"
              value={verificationToken}
              onChangeText={setVerificationToken}
              keyboardType="numeric"
              editable={!verifyAndAssociateMutation.isPending}
              maxLength={6}
            />

            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                (!verificationToken ||
                  verifyAndAssociateMutation.isPending) &&
                  styles.disabledButton,
              ]}
              onPress={handleVerifyAndAssociate}
              disabled={
                !verificationToken || verifyAndAssociateMutation.isPending
              }
            >
              {verifyAndAssociateMutation.isPending ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.buttonText}>Verificando...</Text>
                </>
              ) : (
                <Text style={styles.buttonText}>Verificar y Asociar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => {
                setStep("select-cuenta");
                setVerificationToken("");
                setTokenSentAt(null);
              }}
            >
              <Text style={styles.secondaryButtonText}>Cambiar Cuenta</Text>
            </TouchableOpacity>

            {verifyAndAssociateMutation.isError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                  {verifyAndAssociateMutation.error instanceof Error
                    ? verifyAndAssociateMutation.error.message
                    : "Error al verificar"}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <View style={styles.successContainer}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>¡Bienvenido!</Text>
            <Text style={styles.successMessage}>
              Tu cuenta ha sido asociada exitosamente. Serás redirigido a la
              página principal en unos momentos.
            </Text>
            <ActivityIndicator color={Colors.light.tint} size="large" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  step: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#f9f9f9",
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    flexDirection: "row",
    gap: 8,
  },
  primaryButton: {
    backgroundColor: Colors.light.tint || "#007AFF",
  },
  secondaryButton: {
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  dangerButton: {
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: Colors.light.error || "#ff4444",
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#1a1a1a",
    fontSize: 16,
    fontWeight: "600",
  },
  dangerButtonText: {
    color: Colors.light.error || "#ff4444",
    fontSize: 16,
    fontWeight: "600",
  },
  cuentaCard: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedCard: {
    borderColor: Colors.light.tint || "#007AFF",
    borderWidth: 2,
    backgroundColor: "#f0f8ff",
  },
  cuentaContent: {
    flex: 1,
  },
  cuentaName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  cuentaDetail: {
    fontSize: 13,
    color: "#666",
    marginBottom: 2,
  },
  selectedBadge: {
    fontSize: 24,
    color: Colors.light.tint || "#007AFF",
    marginLeft: 8,
  },
  timerContainer: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  timerText: {
    fontSize: 48,
    fontWeight: "bold",
    color: Colors.light.tint || "#007AFF",
    marginBottom: 8,
  },
  timerLabel: {
    fontSize: 14,
    color: "#666",
  },
  verifyHint: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: "#ffe0e0",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 14,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 40,
  },
  successIcon: {
    fontSize: 80,
    marginBottom: 20,
    color: Colors.light.tint || "#007AFF",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
});
