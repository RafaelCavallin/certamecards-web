import { createConfirmedCandidate } from './api-client';
import type { Candidate } from './api-client';
import { expectOk, openApi } from './api-session';

const ROOT_ADMIN = {
  email: process.env['E2E_ADMIN_EMAIL'] ?? 'admin-raiz@teste.certamecards.local',
  password: process.env['E2E_ADMIN_PASSWORD'] ?? 'senha-teste-1234',
};
export async function createAdmin(displayName?: string): Promise<Candidate> {
  const admin = await createConfirmedCandidate(displayName);
  const api = await openApi(ROOT_ADMIN);
  try {
    await expectOk(await api.post('/api/admin/admins', { data: { email: admin.email } }), 'conceder papel de administrador');
  } finally {
    await api.dispose();
  }
  return admin;
}
