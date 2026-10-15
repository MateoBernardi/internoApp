import { useAuth } from '@/features/auth/context/AuthContext';
import { useMutation } from "@tanstack/react-query";
import {
  requestVerificationToken,
  verifyAndAssociateAccount,
} from "./userApi";

/**
 * Hook para solicitar los códigos de verificación (solo con el CUIT)
 */
export function useRequestVerificationToken() {
  const { tokens } = useAuth();

  return useMutation({
    mutationFn: async ({
      cuit,
      entorno,
    }: {
      cuit: string;
      entorno: string;
    }) => {
      const token = tokens?.accessToken;
      if (!token) {
        throw new Error("No hay token de acceso");
      }
      return requestVerificationToken(token, cuit, entorno);
    },
  });
}

/**
 * Hook para verificar el código y completar la asociación
 */
export function useVerifyAndAssociate() {
  const { tokens } = useAuth();

  return useMutation({
    mutationFn: async ({
      token,
      entorno,
    }: {
      token: string;
      entorno: string;
    }) => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error("No hay token de acceso");
      }
      return verifyAndAssociateAccount(accessToken, token, entorno);
    },
  });
}
