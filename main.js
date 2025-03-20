const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

let mainWindow;

function createWindow() {
  // Cria a janela do navegador
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    resizable: true,
    webPreferences: {
      nodeIntegration: true, 
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false
    },
    icon: path.join(__dirname, 'icon.ico')
  });

  // Remove a barra de menu
  mainWindow.setMenu(null);

  // Carrega o arquivo index.html como arquivo local absoluto
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Abre o DevTools se estiver em desenvolvimento
  // mainWindow.webContents.openDevTools();

  // Encerra o aplicativo quando todas as janelas estiverem fechadas
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Inicializa a aplicação quando o Electron estiver pronto
app.whenReady().then(createWindow);

// Encerra quando todas as janelas estiverem fechadas
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

// Escuta por solicitações para abrir o seletor de arquivos
ipcMain.on('open-file-dialog', (event) => {
  dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    defaultPath: 'C:\\', // Inicia no "Meu Computador"
    filters: [
      { name: 'Arquivos de Texto', extensions: ['txt', 'csv'] }
    ]
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      fs.readFile(result.filePaths[0], 'utf-8', (err, data) => {
        if (err) {
          event.reply('file-data', { error: err.message });
          return;
        }
        event.reply('file-data', { 
          path: result.filePaths[0],
          content: data
        });
      });
    }
  }).catch(err => {
    event.reply('file-data', { error: err.message });
  });
}); 