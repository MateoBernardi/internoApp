import { useAuth } from '@/features/auth/context/AuthContext';
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  obtenerCuentasDisponibles,
  requestVerificationToken,
  verifyAndAssociateAccount,
} from "./userApi";
import type { CuentaDisponibleDTO } from "./UserDTO";

/**
 * Hook para obtener cuentas disponibles por CUIT
 */
export function useObtenerCuentasDisponibles(cuit: string, entorno: string) {
  const { tokens } = useAuth();

  return useQuery({
    queryKey: ["obtenerCuentas", cuit, entorno],
    queryFn: async () => {
      const token = tokens?.accessToken;
      if (!token) {
        throw new Error("No hay token de acceso");
      }
      return obtenerCuentasDisponibles(token, cuit, entorno);
    },
    enabled: false,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
}

/**
 * Hook para solicitar el token de verificación
 */
export function useRequestVerificationToken() {
  const { tokens } = useAuth();

  return useMutation({
    mutationFn: async ({
      cuenta,
      entorno,
    }: {
      cuenta: CuentaDisponibleDTO;
      entorno: string;
    }) => {
      const token = tokens?.accessToken;
      if (!token) {
        throw new Error("No hay token de acceso");
      }
      return requestVerificationToken(token, cuenta, entorno);
    },
  });
}

/**
 * Hook para verificar el token y completar la asociación
 */
export function useVerifyAndAssociate() {
  const { tokens } = useAuth();

  return useMutation({
    mutationFn: async ({
      cuenta,
      token,
      entorno,
    }: {
      cuenta: CuentaDisponibleDTO;
      token: string;
      entorno: string;
    }) => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error("No hay token de acceso");
      }
      return verifyAndAssociateAccount(accessToken, cuenta, token, entorno);
    },
  });
}
