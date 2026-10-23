// O convite de novo usuário leva o endereço do servidor em que o super admin está (Studio ou reserva); fora deles usa o principal. Rodar: npx tsx testes/gigantes/teste_link_acesso.ts
import { linkDeAcesso } from '../../src/utils/linkAcesso';
const t = (h: string | null, o: string) => { (globalThis as any).window = h ? { location: { hostname: h, origin: o } } : undefined; return linkDeAcesso(); };
const casos: [string | null, string, string][] = [
  ['assessor-judicial.ai.studio', 'https://assessor-judicial.ai.studio', 'https://assessor-judicial.ai.studio'],
  ['judicial.assessor.net.br', 'https://judicial.assessor.net.br', 'https://judicial.assessor.net.br'],
  ['localhost', 'http://localhost:3000', 'https://assessor-judicial.ai.studio'],
  ['ais-dev-x.us-east1.run.app', 'https://ais-dev-x.us-east1.run.app', 'https://assessor-judicial.ai.studio'],
  [null, '', 'https://assessor-judicial.ai.studio'],
];
let f = 0; for (const [h, o, e] of casos) { const r = t(h, o); console.log(r === e ? 'ok' : 'FALHA', h, '->', r); if (r !== e) f++; }
process.exit(f ? 1 : 0);
