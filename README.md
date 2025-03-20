# Sorteador Together

Aplicativo de sorteio com interface moderna para sortear nomes a partir de uma lista.

## Recursos

- Carregamento de lista de participantes via arquivo (.txt ou .csv)
- Interface limpa e moderna
- Animação durante o sorteio
- Histórico dos últimos 2 sorteados
- Prevenção de sorteios duplicados

## Compilação para Executável

### Pré-requisitos

- Node.js (versão 14.x ou superior)
- npm (geralmente vem com o Node.js)

### Instalação

1. Clone ou baixe este repositório
2. No diretório do projeto, abra um terminal ou prompt de comando
3. Instale as dependências:

```bash
npm install
```

### Execução para Desenvolvimento

Para executar o aplicativo em modo de desenvolvimento:

```bash
npm start
```

### Compilação para Executável

Para compilar o aplicativo para um executável do Windows:

```bash
npm run build
```

O executável será gerado na pasta `dist`.

## Uso

1. Abra o aplicativo
2. Carregue um arquivo com nomes (separados por vírgula ou nova linha)
3. Clique em "Sortear" para realizar o sorteio
4. Use o botão "Limpar" para reiniciar o processo 