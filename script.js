// Elementos do DOM
const fileInput = document.getElementById('fileInput');
const participantsCount = document.getElementById('participantsCount');
const drawButton = document.getElementById('drawButton');
const resetButton = document.getElementById('resetButton');
const winnerName = document.getElementById('winnerName');
const resultInfo = document.querySelector('.result-info');
const lastWinners = document.getElementById('lastWinners');

// Estado da aplicação
let participants = [];
let drawnParticipants = new Set();
let lastWinnersList = [];

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
    try {
        // Verificar se o conteúdo parece ser um CSV do Google Forms
        if (content.includes("Carimbo de data/hora") && content.includes("Nome completo:")) {
            // Processar como CSV no novo formato do Google Forms
            const lines = content.split('\n').filter(line => line.trim().length > 0);
            
            // Primeira linha contém os cabeçalhos
            const headers = parseCSVLine(lines[0]);
            
            // Encontrar os índices das colunas necessárias
            const nomeIndex = headers.findIndex(h => h.includes("Nome completo:"));
            const igrejaCidadeIndex = headers.findIndex(h => h.includes("Qual sua Igreja, Distrito e Cidade?"));
            
            if (nomeIndex === -1 || igrejaCidadeIndex === -1) {
                throw new Error("Formato de CSV inválido: colunas necessárias não encontradas");
            }
            
            // Processar as linhas de dados (pular o cabeçalho)
            return lines.slice(1).map(line => {
                const columns = parseCSVLine(line);
                if (columns.length <= Math.max(nomeIndex, igrejaCidadeIndex)) {
                    return null; // Linha inválida
                }
                
                // Combinar nome e igreja/cidade
                let nome = corrigirAcentuacao(columns[nomeIndex]);
                let igrejaCidade = corrigirAcentuacao(columns[igrejaCidadeIndex]);
                
                return `${nome} / ${igrejaCidade}`;
            }).filter(entry => entry !== null);
        } else {
            // Formato antigo - processar como antes
            return content
                .split(/[\n,]+/)
                .map(name => name.trim())
                .filter(name => name.length > 0);
        }
    } catch (error) {
        console.error("Erro ao processar participantes:", error);
        // Em caso de erro, retornar array vazio
        return [];
    }
}

// Função para processar linha de CSV respeitando aspas
function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    
    // Adicionar o último valor
    result.push(current);
    
    return result;
}

// Função para corrigir problemas de acentuação
function corrigirAcentuacao(texto) {
    if (!texto) return "";
    
    return texto
        .replace(/Ã£/g, 'ã')
        .replace(/Ã¡/g, 'á')
        .replace(/Ã©/g, 'é')
        .replace(/Ã­/g, 'í')
        .replace(/Ã³/g, 'ó')
        .replace(/Ãº/g, 'ú')
        .replace(/Ã§/g, 'ç')
        .replace(/Ãµ/g, 'õ')
        .replace(/Ã¢/g, 'â')
        .replace(/Ãª/g, 'ê')
        .replace(/Ã´/g, 'ô')
        .replace(/Ã/g, 'Á')
        .replace(/Ã‰/g, 'É')
        .replace(/Ã"/g, 'Ó')
        .replace(/Ãš/g, 'Ú')
        .replace(/Ã‡/g, 'Ç')
        .replace(/Ã"/g, 'Õ')
        .replace(/Ã‚/g, 'Â')
        .replace(/ÃŠ/g, 'Ê')
        .replace(/Ã"/g, 'Ô')
        .replace(/Ã³/g, 'ó')
        .replace(/Ã¢/g, 'â');
}

function updateParticipantsCount() {
    participantsCount.textContent = participants.length;
    drawButton.disabled = participants.length === 0;
}

function updateLastWinners(winner) {
    lastWinnersList.unshift(winner);
    if (lastWinnersList.length > 3) {
        lastWinnersList.pop();
    }

    // Limpar elementos existentes
    lastWinners.innerHTML = '';
    
    // Criar novos elementos para cada vencedor
    lastWinnersList.forEach(winnerText => {
        const div = document.createElement('div');
        div.className = 'last-winner-item';
        div.textContent = winnerText;
        lastWinners.appendChild(div);
    });
    
    // Se não houver vencedores ainda, exibir um placeholder
    if (lastWinnersList.length === 0) {
        const div = document.createElement('div');
        div.className = 'last-winner-item';
        div.textContent = '-';
        lastWinners.appendChild(div);
    }
}

function performDraw() {
    if (participants.length === 0) return;

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

    // Desabilitar botão durante o sorteio
    drawButton.disabled = true;

    const animation = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * availableParticipants.length);
        winnerName.textContent = availableParticipants[randomIndex];
        counter++;

        if (counter >= steps) {
            clearInterval(animation);
            const winner = availableParticipants[Math.floor(Math.random() * availableParticipants.length)];
            winnerName.textContent = winner;
            drawnParticipants.add(winner);
            resultInfo.textContent = `Participantes restantes: ${availableParticipants.length - 1}`;
            updateLastWinners(winner);
            
            // Reabilitar botão após o sorteio
            drawButton.disabled = false;
        }
    }, interval);
}

function resetApplication() {
    participants = [];
    drawnParticipants.clear();
    lastWinnersList = [];
    fileInput.value = '';
    winnerName.textContent = '?';
    resultInfo.textContent = 'Aguardando sorteio...';
    updateParticipantsCount();
    
    // Resetar últimos sorteados
    lastWinners.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'last-winner-item';
    div.textContent = '-';
    lastWinners.appendChild(div);
} 