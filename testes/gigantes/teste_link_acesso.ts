// O convite de novo usuário leva sempre o endereço oficial (judicial.assessor.net.br), inclusive quando aberto de outro lugar. Rodar: npx tsx testes/gigantes/teste_link_acesso.ts
import { linkDeAcesso } from '../../src/utils/linkAcesso';
const t = (h: string | null, o: string) => { (globalThis as any).window = h ? { location: { hostname: h, origin: o } } : undefined; return linkDeAcesso(); };
const casos: [string | null, string, string][] = [
  ['judicial.assessor.net.br', 'https://judicial.assessor.net.br', 'https://judicial.assessor.net.br'],
  ['assessor-judicial.ai.studio', 'https://assessor-judicial.ai.studio', 'https://judicial.assessor.net.br'],
  ['localhost', 'http://localhost:3000', 'https://judicial.assessor.net.br'],
  ['ais-dev-x.us-east1.run.app', 'https://ais-dev-x.us-east1.run.app', 'https://judicial.assessor.net.br'],
  [null, '', 'https://judicial.assessor.net.br'],
];
let f = 0; for (const [h, o, e] of casos) { const r = t(h, o); console.log(r === e ? 'ok' : 'FALHA', h, '->', r); if (r !== e) f++; }
process.exit(f ? 1 : 0);
