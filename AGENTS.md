# Diretrizes do Assessor Judicial

## Regras Permanentes de Desenvolvimento

1. **Atualização Contínua do Modo Treinamento e do Manual:**
   - Toda vez que uma nova funcionalidade, ferramenta de IA, componente, modal ou fluxo for adicionado ou alterado no sistema, o **Manual do Sistema** (`SystemManualModal.tsx`) e o **Modo Treinamento / Tour Guiado** (`SystemTour.tsx`) DEVEM ser atualizados proativamente, independente de solicitação expressa do usuário.
   - O `changelog` dentro do Manual do Sistema deve registrar as mudanças e novos recursos entregues.

2. **Formatação de Textos de Autos e Decisões Judiciais:**
   - Preservar a formatação rica (negritos, itálicos, sublinhados e cabeçalhos) em texto contínuo corrido, sem separação artificial de páginas.
   - Filtrar e remover ruídos de digitalização judicial (assinaturas laterais de certificados digitais, carimbos de protocolo, numeração de folhas e cabeçalhos/rodapés repetitivos de tribunais).

3. **Minuta Paradigma (Espelho Estrutural do Juiz):**
   - Suportar a clonagem estrutural de decisões anteriores do magistrado via botão `⚡ Injetar no Prompt`, mantendo rigorosamente estilo, ordem de tópicos, capitulação e formato do dispositivo.

4. **Proibição Absoluta de Sobrescrita de Dados e Injeção de Padrões:**
   - É **TERMINANTEMENTE PROIBIDO** substituir, sobrescrever, resetar ou reinicializar qualquer dado inserido ou editado por usuários (teses jurídicas, cadernos vinculantes, minutas paradigmas, guias do PROJUDI, agenda/calendário de prazos, prompts personalizados, membros da equipe, lotações/varas judiciais, configurações de gabinete, histórico de análises, logs ou perfis) por informações ou modelos padrão do sistema.
   - Em qualquer manutenção, atualização de código, sincronização ou migração, os dados reais existentes salvos no Firestore, no cache local ou no estado do usuário devem ser preservados integralmente.
   - É proibido executar rotinas de seed/auto-inicialização que alterem ou restaurem dados padrão em ambientes de produção, no gabinete principal ou em gabinetes secundários.

5. **Desenvolvimento Estritamente Conservador e Cirúrgico:**
   - **Não toque no que está funcionando:** Ao pedir uma nova funcionalidade ou correção, é PROIBIDO refatorar, reestruturar, limpar ou alterar qualquer outro componente, motor ou fluxo que não seja o alvo direto do pedido.
   - **Edições Cirúrgicas:** Use ferramentas de edição de forma isolada. Nunca substitua um arquivo inteiro se puder apenas editar as linhas necessárias.
   - **Preservação de Lógica:** Nunca remova bibliotecas, variáveis de estado ou blocos de código sem autorização expressa, mesmo que pareçam não estar sendo usados.
