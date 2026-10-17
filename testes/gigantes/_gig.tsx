import React from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import { GigantesPanel } from "../../src/components/GigantesPanel";
import { gerenteGigantes } from "../../src/utils/gigantes/gerente";
(window as any).gerente = gerenteGigantes;
const config = { promptText: "Prompt de teste da sentença", promptTitle: "Sentença de teste", promptId: "p1", promptCategory: "civel", promptScope: "judicial", actType: "sentenca", unitId: "montes_claros", unitName: "Comarca de Teste / Vara Única", userUid: "teste-uid", userName: "Teste", userEmail: "t@t.com", processNumber: "" };
createRoot(document.getElementById("root")!).render(<GigantesPanel config={config as any} onVerHistorico={() => { (window as any).__viuHistorico = true; }} />);
