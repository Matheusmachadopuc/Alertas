FROM node:20-alpine
WORKDIR /app
# Copia os arquivos de dependências
COPY package*.json ./
RUN npm install
# Copia o restante do código
COPY . .
EXPOSE 3000
CMD ["node", "documentacao.js"]
