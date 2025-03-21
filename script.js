// Elementos do DOM
const fileInput = document.getElementById('fileInput');
const drawButton = document.getElementById('drawButton');
const resetButton = document.getElementById('resetButton');
const winnerName = document.getElementById('winnerName');
const resultInfo = document.querySelector('.result-info');

// Estado da aplicação
let participants = [];
let drawnParticipants = new Set();

// Verificar se estamos em um ambiente Electron
const isElectron = typeof require !== 'undefined';

// Manipuladores de eventos
fileInput.addEventListener('change', handleFileUpload);
drawButton.addEventListener('click', performDraw);
resetButton.addEventListener('click', resetApplication);

// Integração com Electron para abertura de arquivos
if (isElectron) {
    // Obtenha os módulos do Electron
    const { ipcRenderer } = require('electron');
    
    fileInput.addEventListener('click', (event) => {
        event.preventDefault();
        ipcRenderer.send('open-file-dialog');
    });

    ipcRenderer.on('file-data', (event, data) => {
        if (data.error) {
            console.error('Erro ao ler arquivo:', data.error);
            return;
        }
        
        const content = data.content;
        participants = parseParticipants(content);
        updateParticipantsCount();
    });
}

// Funções
function handleFileUpload(event) {
    // Se estamos no Electron, o processamento de arquivo é tratado pela API do Electron
    if (isElectron) return;

    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        const content = e.target.result;
        participants = parseParticipants(content);
        updateParticipantsCount();
    };

    reader.readAsText(file);
}

function parseParticipants(content) {
    // Normaliza a codificação para corrigir acentos e caracteres especiais
    function normalizeString(str) {
        // Correções específicas
        return str
            .replace(/Ã¢/g, 'â')
            .replace(/Ã³/g, 'ó')
            .replace(/Ã©/g, 'é')
            .replace(/Ã­/g, 'í')
            .replace(/Ãº/g, 'ú')
            .replace(/Ã£/g, 'ã')
            .replace(/Ãµ/g, 'õ')
            .replace(/Ã§/g, 'ç')
            .replace(/Ãª/g, 'ê')
            .replace(/Ã´/g, 'ô')
            .replace(/Ã /g, 'à')
            .replace(/Ã¡/g, 'á')
            .replace(/\u00c3\u00a3/g, 'ã')
            .replace(/\u00c3\u00b3/g, 'ó');
    }

    // Verificando se temos o formato do Google Forms CSV (detecção melhorada)
    const isGoogleFormsCSV = content.includes("Nome completo:") && content.includes("Qual sua Igreja, Distrito e Cidade?");
    
    console.log("Formato detectado:", isGoogleFormsCSV ? "Google Forms CSV" : "Formato Padrão");
    
    if (isGoogleFormsCSV) {
        try {
            // Dividir o conteúdo em linhas
            const lines = content.split('\n').filter(line => line.trim());
            console.log(`Encontradas ${lines.length} linhas no CSV`);
            
            if (lines.length <= 1) {
                console.error("CSV não contém dados suficientes");
                return [];
            }
            
            // Identificar índices das colunas no cabeçalho
            const headerLine = lines[0];
            // Criar regex para dividir o cabeçalho corretamente
            // Procuramos por vírgulas que não estão dentro de aspas duplas
            const headerValues = [];
            let tempHeader = headerLine;
            
            // Extrair os cabeçalhos usando regex
            // Esta regex captura campos CSV considerando que campos com vírgulas são envolvidos por aspas duplas
            const headerRegex = /"([^"]*)"|([^,]+)(?=,|$)/g;
            let match;
            while ((match = headerRegex.exec(headerLine)) !== null) {
                // O campo está no primeiro grupo de captura se estava entre aspas,
                // ou no segundo grupo se não estava
                const value = match[1] !== undefined ? match[1] : match[0];
                headerValues.push(value.trim());
            }
            
            console.log(`Cabeçalho processado com ${headerValues.length} colunas`);
            
            let nomeIndex = -1;
            let igrejaIndex = -1;
            
            // Encontrar os índices das colunas que precisamos
            for (let i = 0; i < headerValues.length; i++) {
                const header = headerValues[i];
                if (header.includes("Nome completo:")) {
                    nomeIndex = i;
                    console.log(`Coluna "Nome completo:" encontrada no índice ${i}`);
                } else if (header.includes("Qual sua Igreja, Distrito e Cidade?")) {
                    igrejaIndex = i;
                    console.log(`Coluna "Igreja" encontrada no índice ${i}`);
                }
            }
            
            if (nomeIndex === -1 || igrejaIndex === -1) {
                console.error("Colunas necessárias não encontradas nos cabeçalhos");
                return processLegacyFormat(content);
            }
            
            // Processar as linhas de dados (ignorando a linha 1 que é o cabeçalho)
            const participants = [];
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                
                try {
                    // Processar cada linha usando a mesma abordagem do cabeçalho
                    const rowValues = [];
                    const rowRegex = /"([^"]*)"|([^,]+)(?=,|$)/g;
                    let rowMatch;
                    
                    while ((rowMatch = rowRegex.exec(line)) !== null) {
                        const value = rowMatch[1] !== undefined ? rowMatch[1] : rowMatch[0];
                        rowValues.push(value.trim());
                    }
                    
                    if (rowValues.length > Math.max(nomeIndex, igrejaIndex)) {
                        let nome = rowValues[nomeIndex];
                        let igreja = rowValues[igrejaIndex];
                        
                        // Remover aspas extras
                        nome = nome.replace(/^"+|"+$/g, '').trim();
                        igreja = igreja.replace(/^"+|"+$/g, '').trim();
                        
                        // Normalizar textos
                        nome = normalizeString(nome);
                        igreja = normalizeString(igreja);
                        
                        if (nome && igreja) {
                            const participantName = `${nome} / ${igreja}`;
                            participants.push(participantName);
                            console.log(`Participante ${i}: ${participantName}`);
                        }
                    }
                } catch (rowError) {
                    console.error(`Erro ao processar linha ${i}:`, rowError);
                }
            }
            
            console.log(`Total de participantes processados: ${participants.length}`);
            return participants;
        } catch (error) {
            console.error("Erro ao processar CSV:", error);
            return processLegacyFormat(content);
        }
    } else {
        return processLegacyFormat(content);
    }
    
    // Função para processar o formato antigo da lista
    function processLegacyFormat(content) {
        // No formato antigo, cada linha é um participante
        const lines = content.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        // Processa cada linha como um participante
        return lines.map(line => normalizeString(line));
    }
}

function updateParticipantsCount() {
    // Apenas habilita/desabilita o botão conforme necessário
    drawButton.disabled = participants.length === 0;
    
    // Atualize a mensagem de status
    if (participants.length > 0) {
        resultInfo.textContent = "Lista carregada com sucesso!";
    } else {
        resultInfo.textContent = "Aguardando sorteio...";
    }
}

function performDraw() {
    if (participants.length === 0) return;

    // Limpar a mensagem de status imediatamente ao iniciar o sorteio
    resultInfo.textContent = "";

    const availableParticipants = participants.filter(p => !drawnParticipants.has(p));
    
    if (availableParticipants.length === 0) {
        resultInfo.textContent = 'Todos os participantes já foram sorteados!';
        return;
    }

    // Animação de sorteio
    let counter = 0;
    const duration = 2000; // 2 segundos
    const interval = 50; // Atualiza a cada 50ms
    const steps = duration / interval;

    const animation = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * availableParticipants.length);
        winnerName.textContent = availableParticipants[randomIndex];
        counter++;

        if (counter >= steps) {
            clearInterval(animation);
            const winner = availableParticipants[Math.floor(Math.random() * availableParticipants.length)];
            winnerName.textContent = winner;
            drawnParticipants.add(winner);
            
            // Mantém a mensagem limpa após o sorteio
            resultInfo.textContent = "";
        }
    }, interval);
}

function resetApplication() {
    participants = [];
    drawnParticipants.clear();
    fileInput.value = '';
    winnerName.textContent = '?';
    resultInfo.textContent = 'Aguardando sorteio...';
    updateParticipantsCount();
} 