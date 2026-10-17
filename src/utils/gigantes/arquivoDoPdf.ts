// Recupera o arquivo PDF original (para o OCR das páginas sem texto) a partir do que o app guardou na memória.
export async function arquivoDoPdf(p: { file?: File; previewUrl?: string; name: string }): Promise<File | null> {
  try {
    if (p.file) return p.file;
    if (!p.previewUrl) return null;
    const blob = await (await fetch(p.previewUrl)).blob();
    return new File([blob], p.name, { type: "application/pdf" });
  } catch { return null; }
}
