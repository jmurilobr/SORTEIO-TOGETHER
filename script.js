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
    return content
        .split(/[\n,]+/)
        .map(name => name.trim())
        .filter(name => name.length > 0);
}

function updateParticipantsCount() {
    participantsCount.textContent = participants.length;
    drawButton.disabled = participants.length === 0;
}

function updateLastWinners(winner) {
    lastWinnersList.unshift(winner);
    if (lastWinnersList.length > 2) {
        lastWinnersList.pop();
    }

    const items = lastWinners.children;
    for (let i = 0; i < items.length; i++) {
        items[i].textContent = lastWinnersList[i] || '-';
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
    const items = lastWinners.children;
    for (let i = 0; i < items.length; i++) {
        items[i].textContent = '-';
    }
} 