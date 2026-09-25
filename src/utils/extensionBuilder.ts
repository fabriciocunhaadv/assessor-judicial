import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const downloadExtension = async () => {
  const zip = new JSZip();

  // 1. manifest.json (V3 with all_urls for Background CORS bypass)
  const manifest = {
    manifest_version: 3,
    name: "Assessor IA Conecta",
    version: "2.0",
    description: "Integração oficial do PROJUDI com o Assessor Judicial IA. Selecione os documentos e envie com um clique.",
    permissions: ["activeTab", "scripting", "storage", "unlimitedStorage"],
    host_permissions: [
      "<all_urls>"
    ],
    background: {
      service_worker: "background.js"
    },
    action: {
      default_popup: "popup.html",
      default_title: "Assessor IA Conecta"
    },
    content_scripts: [
      {
        matches: ["*://*.jus.br/*"],
        js: ["content.js"],
        all_frames: true
      },
      {
        matches: [`${window.location.origin}/*`],
        js: ["receiver.js"]
      }
    ]
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // 2. popup.html
  const popupHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; width: 250px; padding: 16px; margin: 0; background: #0f172a; color: #f8fafc; }
    h3 { margin-top: 0; color: #818cf8; font-size: 16px; display: flex; align-items: center; gap: 8px; }
    p { font-size: 12px; color: #94a3b8; line-height: 1.4; }
    .btn { display: block; width: 100%; padding: 10px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; text-align: center; text-decoration: none; margin-top: 12px; }
    .btn:hover { background: #4338ca; }
  </style>
</head>
<body>
  <h3>⚡ Assessor Conecta</h3>
  <p>Esta extensão está ativa e monitorando o PROJUDI.</p>
  <p>Abra qualquer processo no PROJUDI e clique na nova aba "⚡ Assessor IA (Avançado)" para selecionar e enviar os documentos.</p>
  <a href="${window.location.origin}" target="_blank" class="btn">Abrir Sistema</a>
</body>
</html>`;
  zip.file("popup.html", popupHtml.trim());

  // 3. background.js (Fetches URLs to bypass CORS)
  const backgroundJs = `
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'FETCH_DOCUMENT') {
        fetch(request.url, { credentials: 'omit' })
            .then(async (response) => {
                const blob = await response.blob();
                if (blob.size === 0) {
                    throw new Error('Blob is 0 bytes');
                }
                const reader = new FileReader();
                reader.onloadend = () => {
                    sendResponse({ success: true, base64: reader.result });
                };
                reader.onerror = () => {
                    sendResponse({ success: false, error: 'Failed to read blob' });
                };
                reader.readAsDataURL(blob);
            })
            .catch(error => {
                console.error('Fetch error:', error);
                sendResponse({ success: false, error: error.toString() });
            });
        return true; // Indicates async response
    }
});
`;
  zip.file("background.js", backgroundJs.trim());

  // 4. content.js (PROJUDI Scraper & Injected UI)
  const contentJs = `
function injectAssessorTab() {
  if (document.getElementById('assessor-ia-tab')) return;

  const tabsContainerVariants = [
      document.querySelector('.abas'),
      document.querySelector('#tabs'),
      document.querySelector('.tab-menu'),
      document.querySelector('ul[role="tablist"]')
  ];
  
  let container = null;
  for (const el of tabsContainerVariants) {
     if (el) { container = el; break; }
  }

  let elementFound = null;
  if (!container) {
    const allLinks = document.querySelectorAll('a');
    for (const a of allLinks) {
       if (a.innerText.includes('Movimentações') || a.innerText.includes('Processo') || a.innerText.includes('Árvore')) {
          const el = a.parentElement?.parentElement;
          elementFound = el;
          break;
       }
    }
  }

  if (!container && elementFound) {
      container = elementFound.parentElement;
  }

  if (!container) {
     container = document.createElement('div');
     container.style.position = 'fixed';
     container.style.bottom = '20px';
     container.style.right = '20px';
     container.style.zIndex = '99999';
     document.body.appendChild(container);
  }

  const newTab = document.createElement(elementFound ? elementFound.tagName : 'div');
  newTab.id = 'assessor-ia-tab';
  if (elementFound) newTab.className = elementFound.className; 
  if (elementFound && elementFound.style) newTab.style.cssText = elementFound.style.cssText; 
  
  newTab.style.cursor = 'pointer';
  newTab.style.background = '#e0e7ff';
  newTab.style.border = '1px solid #c7d2fe';
  newTab.style.borderRadius = '4px';
  newTab.style.marginLeft = '10px';
  newTab.style.padding = '8px 12px';
  newTab.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';

  newTab.innerHTML = '<span style="color: #4f46e5; font-weight: bold;">⚡ Assessor IA (Avançado)</span>';

  newTab.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const text = document.body.innerText;
    const processMatch = text.match(/\\d{7}-\\d{2}\\.\\d{4}\\.\\d{1,2}\\.\\d{2}\\.\\d{4}/);
    const processNumber = processMatch ? processMatch[0] : '';
    
    let documentsScraped = [];
    let count = 1;
    const allLinks = document.querySelectorAll('a');
    
    allLinks.forEach(link => {
        const linkText = link.innerText.trim();
        let href = link.href || '';
        const title = link.getAttribute('title') || '';
        const onclick = link.getAttribute('onclick') || '';
        
        if (href.startsWith('javascript:')) {
            const match = onclick.match(/['"](.*?\\.do.*?)['"]/);
            if (match) {
                href = window.location.origin + (match[1].startsWith('/') ? '' : '/') + match[1];
            } else {
               const match2 = href.match(/['"](.*?\\.do.*?)['"]/);
               if (match2) {
                   href = window.location.origin + (match2[1].startsWith('/') ? '' : '/') + match2[1];
               }
            }
        }
        
        if (
            linkText.toLowerCase().endsWith('.pdf') || 
            linkText.toLowerCase().endsWith('.html') || 
            linkText.toLowerCase().endsWith('.p7s') ||
            href.toLowerCase().includes('download') ||
            href.toLowerCase().includes('arquivo') ||
            href.toLowerCase().includes('documento') ||
            title.toLowerCase().includes('visualizar documento') ||
            title.toLowerCase().includes('baixar')
        ) {
            if (linkText.toLowerCase().includes('novo documento') || linkText.toLowerCase().includes('incluir')) return;
            if (href.startsWith('javascript:') && !href.includes('.do')) return; 
            
            let parent = link.parentElement;
            let eventoLocal = 'Documento Avulso';
            
            while(parent && parent.tagName !== 'BODY') {
               const pt = parent.innerText.trim();
               if (/^\\d+\\s*[-–]/i.test(pt) || /^Mov\\.?/i.test(pt) || /^Evento/i.test(pt)) {
                   eventoLocal = pt.split('\\n')[0].substring(0, 100).trim();
                   break;
               }
               parent = parent.parentElement;
            }
            
            let fileNameToUse = linkText;
            if (!fileNameToUse || fileNameToUse.length < 3) {
                 fileNameToUse = 'documento_' + count + '.pdf';
            }
            if (fileNameToUse.length > 80) fileNameToUse = fileNameToUse.substring(0, 80) + '.pdf';
            if (!fileNameToUse.toLowerCase().endsWith('.pdf') && !fileNameToUse.toLowerCase().endsWith('.html')) {
                fileNameToUse += '.pdf';
            }
            
            const isDuplicate = documentsScraped.some(d => 
                 (d.url === href && href !== '' && !href.includes('javascript:')) || 
                 (d.fileName === fileNameToUse && d.evento === eventoLocal)
            );
            
            if (!isDuplicate && href) {
                documentsScraped.push({
                    id: 'ext_doc_' + count,
                    evento: eventoLocal,
                    descricao: linkText || 'Arquivo em anexo',
                    fileName: fileNameToUse,
                    url: href,
                    selected: true
                });
                count++;
            }
        }
    });

    if (documentsScraped.length === 0) {
        alert("Nenhum arquivo ou movimentação encontrada nesta página. Abra a aba 'Movimentações' e tente novamente.");
        return;
    }

    renderInjectedModal(documentsScraped, processNumber);
  };
  
  container.appendChild(newTab);
}

function renderInjectedModal(documents, processNumber) {
    let overlay = document.getElementById('assessor-modal-overlay');
    if (overlay) overlay.remove();
    
    overlay = document.createElement('div');
    overlay.id = 'assessor-modal-overlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 100000; display: flex; align-items: center; justify-content: center; font-family: sans-serif;';
    
    const modal = document.createElement('div');
    modal.style.cssText = 'background: white; width: 800px; max-width: 90%; max-height: 90vh; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);';
    
    const header = document.createElement('div');
    header.style.cssText = 'padding: 20px; border-bottom: 1px solid #e5e7eb; background: #f8fafc; display: flex; justify-content: space-between; align-items: center;';
    
    const headerHTML = "<div style=\\"display: flex; align-items: center; gap: 12px;\\">" +
       "<div style=\\"background: #e0e7ff; padding: 10px; border-radius: 8px; color: #4f46e5; font-weight: bold; font-size: 20px;\\">⚡</div>" +
       "<div>" +
         "<h2 style=\\"margin: 0; font-size: 18px; color: #0f172a;\\">Assessor Judicial IA</h2>" +
         "<p style=\\"margin: 4px 0 0; font-size: 13px; color: #64748b;\\">Processo: " + processNumber + " - Selecione os arquivos para análise</p>" +
       "</div>" +
    "</div>";
    
    header.innerHTML = headerHTML;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✖';
    closeBtn.style.cssText = 'background: transparent; border: none; font-size: 18px; cursor: pointer; color: #64748b; padding: 8px;';
    closeBtn.onclick = () => overlay.remove();
    header.appendChild(closeBtn);
    
    const body = document.createElement('div');
    body.style.cssText = 'padding: 20px; flex: 1; overflow-y: auto; background: white;';
    
    const table = document.createElement('table');
    table.style.cssText = 'width: 100%; border-collapse: collapse; text-align: left;';
    table.innerHTML = "<thead>" +
        "<tr>" +
          "<th style=\\"padding: 12px; border-bottom: 2px solid #e5e7eb; width: 40px;\\"><input type=\\"checkbox\\" id=\\"selectAllDocs\\" checked></th>" +
          "<th style=\\"padding: 12px; border-bottom: 2px solid #e5e7eb; color: #475569; font-size: 13px; text-transform: uppercase;\\">Evento / Movimentação</th>" +
          "<th style=\\"padding: 12px; border-bottom: 2px solid #e5e7eb; color: #475569; font-size: 13px; text-transform: uppercase;\\">Arquivo</th>" +
        "</tr>" +
      "</thead>" +
      "<tbody id=\\"assessor-docs-tbody\\"></tbody>";
      
    body.appendChild(table);
    
    const footer = document.createElement('div');
    footer.style.cssText = 'padding: 20px; border-top: 1px solid #e5e7eb; background: #f8fafc; display: flex; justify-content: space-between; align-items: center;';
    
    const statusText = document.createElement('span');
    statusText.style.cssText = 'font-size: 14px; color: #64748b; font-weight: 500;';
    statusText.id = 'assessor-status-text';
    statusText.innerText = documents.length + " arquivos selecionados";
    
    const actionContainer = document.createElement('div');
    actionContainer.style.cssText = 'display: flex; gap: 12px;';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = 'Cancelar';
    cancelBtn.style.cssText = 'padding: 10px 20px; border: 1px solid #cbd5e1; background: white; color: #475569; border-radius: 8px; cursor: pointer; font-weight: 500;';
    cancelBtn.onclick = () => overlay.remove();
    
    const submitBtn = document.createElement('button');
    submitBtn.innerText = 'Importar Selecionados ➔';
    submitBtn.style.cssText = 'padding: 10px 24px; border: none; background: #4f46e5; color: white; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);';
    
    actionContainer.appendChild(cancelBtn);
    actionContainer.appendChild(submitBtn);
    
    footer.appendChild(statusText);
    footer.appendChild(actionContainer);
    
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const tbody = document.getElementById('assessor-docs-tbody');
    documents.forEach((doc, idx) => {
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom: 1px solid #f1f5f9;';
        tr.innerHTML = "<td style=\\"padding: 12px;\\"><input type=\\"checkbox\\" class=\\"doc-checkbox\\" data-idx=\\"" + idx + "\\" checked></td>" +
          "<td style=\\"padding: 12px; font-size: 14px; color: #1e293b; font-weight: 500;\\">" + doc.evento + "</td>" +
          "<td style=\\"padding: 12px; font-size: 13px; color: #64748b;\\">" + doc.fileName + "</td>";
        tbody.appendChild(tr);
    });
    
    const selectAll = document.getElementById('selectAllDocs');
    const checkboxes = document.querySelectorAll('.doc-checkbox');
    
    selectAll.onchange = (e) => {
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        updateStatus();
    };
    
    checkboxes.forEach(cb => {
        cb.onchange = () => updateStatus();
    });
    
    function updateStatus() {
        const selected = document.querySelectorAll('.doc-checkbox:checked').length;
        statusText.innerText = selected + " arquivos selecionados";
        submitBtn.disabled = selected === 0;
        submitBtn.style.opacity = selected === 0 ? '0.5' : '1';
    }
    
    submitBtn.onclick = async () => {
        const selectedIndexes = Array.from(document.querySelectorAll('.doc-checkbox:checked')).map(cb => parseInt(cb.dataset.idx));
        const selectedDocs = selectedIndexes.map(idx => documents[idx]);
        
        if (selectedDocs.length === 0) return;
        
        cancelBtn.style.display = 'none';
        submitBtn.disabled = true;
        
        let completed = 0;
        for (const doc of selectedDocs) {
            submitBtn.innerText = "Baixando " + (completed + 1) + "/" + selectedDocs.length + "...";
            
            try {
                const response = await new Promise((resolve) => {
                     chrome.runtime.sendMessage({ type: 'FETCH_DOCUMENT', url: doc.url }, (res) => {
                         resolve(res);
                     });
                });
                
                if (response && response.success) {
                    doc.base64 = response.base64;
                } else {
                    console.error("Background fetch failed for", doc.url, response?.error);
                    const res = await fetch(doc.url, { credentials: 'omit' });
                    const blob = await res.blob();
                    if (blob.size > 0) {
                        const base64 = await new Promise(r => {
                            const reader = new FileReader();
                            reader.onloadend = () => r(reader.result);
                            reader.readAsDataURL(blob);
                        });
                        doc.base64 = base64;
                    }
                }
            } catch (err) {
                console.error("Error downloading", doc.fileName, err);
            }
            completed++;
        }
        
        submitBtn.innerText = 'Salvando e Abrindo Assessor IA...';
        
        chrome.storage.local.set({
            projudiPayload: { processNumber, documents: selectedDocs }
        }, () => {
            const target = window.location.origin + "/?import_ext=true";
            window.open(target, '_blank');
            overlay.remove();
        });
    };
}

setInterval(injectAssessorTab, 1500);
`;
  zip.file("content.js", contentJs.trim());

  // 5. receiver.js
  const receiverJs = `
if (window.location.search.includes('import_ext=true')) {
  chrome.storage.local.get(['projudiPayload'], (result) => {
     if (result.projudiPayload) {
        window.postMessage({ type: 'ASSESSOR_EXT_DATA', payload: result.projudiPayload }, '*');
        chrome.storage.local.remove('projudiPayload');
     }
  });
}
`;
  zip.file("receiver.js", receiverJs.trim());

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, "assessor-ia-conecta-extensao.zip");
};
