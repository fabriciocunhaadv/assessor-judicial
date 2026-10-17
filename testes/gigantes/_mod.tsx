import React from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import { auth } from "../../src/lib/firebase";
import { gerenteGigantes } from "../../src/utils/gigantes/gerente";
(window as any).gerente = gerenteGigantes;
const nome = new URLSearchParams(location.search).get("m");
const base: any = { isOpen: true, onClose: () => {}, prompts: [], tickets: [] };
async function main() {
  const raiz = createRoot(document.getElementById("root")!);
  if (nome === "mesa") {
    (auth as any).currentUser = null;
    const { setNativeKeyAccessState } = await import("../../src/utils/apiKeyManager");
    setNativeKeyAccessState(true);
    const { HearingWorkbenchModal } = await import("../../src/components/HearingWorkbenchModal");
    const { SAMPLE_HEARINGS, saveLocalHearings } = await import("../../src/utils/hearingsDb");
    const h: any = { ...SAMPLE_HEARINGS[0], rawSourceText: "", uploadedPdfNames: [] };
    saveLocalHearings([h, ...SAMPLE_HEARINGS.slice(1)]);
    raiz.render(<HearingWorkbenchModal isOpen={true} onClose={() => {}} />);
  } else if (nome === "lupa") {
    const { MinuteAuditorModal } = await import("../../src/components/MinuteAuditorModal");
    raiz.render(<MinuteAuditorModal {...base} />);
  } else {
    const { TurboModuleModal } = await import("../../src/components/TurboModuleModal");
    raiz.render(<TurboModuleModal {...base} prompts={[{ id: "p1", title: "Sentença teste", promptText: "Redija a sentença.", category: "civel", scope: "judicial" } as any]} />);
  }
}
void main();
