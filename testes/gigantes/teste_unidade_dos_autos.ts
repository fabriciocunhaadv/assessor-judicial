// Aviso de unidade dos autos: acerta quando os autos são de outra comarca do usuário e não se confunde com "Fazenda Pública". Rodar: npx tsx testes/gigantes/teste_unidade_dos_autos.ts
import { detectarUnidadeDosAutos, unidadesParaAvisar } from '../../src/utils/unidadeDosAutos';
let f = 0; const ok = (c: boolean, n: string) => { console.log(c ? 'ok' : 'FALHA', n); if (!c) f++; };
const mc = { id: 'mc', name: 'Montes Claros / Vara Única' } as any, fn = { id: 'fn', name: 'Fazenda Nova / Vara Cível' } as any, mc2 = { id: 'mc2', name: 'Montes Claros / JEC' } as any;
const av = (t: string, ativa: string, us = [mc, fn]) => unidadesParaAvisar(detectarUnidadeDosAutos(t, us), ativa).map((u: any) => u.id).join(',');
ok(av('PODER JUDICIÁRIO Comarca de Fazenda Nova - Vara Cível. Processo 5012371-16.2024', 'mc') === 'fn', 'autos de Fazenda Nova com Montes Claros ativa: avisa Fazenda Nova');
ok(av('Comarca de Montes Claros de Goiás - Vara Única', 'mc') === '', 'autos da unidade ativa: não avisa');
ok(av('Comarca de Fazenda Nova. Petição. Ao final, em Montes Claros, 3 de março.', 'mc') === 'fn', 'cabeçalho de Fazenda Nova vence menção de passagem');
ok(av('Vara das Fazendas Públicas. Estado de Goiás. Processo sem comarca citada', 'mc') === '', 'Fazenda Pública não vira Fazenda Nova');
ok(av('Autor domiciliado em Fazenda Nova e réu em Montes Claros, ambos citados.', 'mc') === '' , 'duas comarcas empatadas e a ativa é uma delas: não decide');
ok(av('Autor domiciliado em Fazenda Nova e réu em Montes Claros.', 'xx') === 'mc,fn' || av('Autor domiciliado em Fazenda Nova e réu em Montes Claros.', 'xx') === 'fn,mc', 'empate sem a ativa: mostra as duas opções');
ok(av('Comarca de Montes Claros', 'mc', [mc, mc2, fn]) === '', 'duas varas da mesma comarca: não avisa');
ok(av('', 'mc') === '', 'sem texto: não avisa');
ok(av('FAZENDA NOVA', 'mc') === 'fn', 'sem acento/caixa alta');
process.exit(f ? 1 : 0);
