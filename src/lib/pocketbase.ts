import PocketBase from 'pocketbase';

const POCKETBASE_URL =
  (import.meta.env.VITE_POCKETBASE_URL as string | undefined) ?? '';

export const pb = new PocketBase(POCKETBASE_URL || undefined);

export type PbUser = {
  id: string;
  email: string;
  username: string;
  nome_completo: string;
  escola_nome: string;
  verified: boolean;
};

export function getCurrentUser(): PbUser | null {
  if (!pb.authStore.isValid) return null;
  return pb.authStore.record as unknown as PbUser;
}
