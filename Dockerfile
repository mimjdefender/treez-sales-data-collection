FROM mcr.microsoft.com/playwright:v1.43.1-focal

WORKDIR /app
COPY . .

RUN npm install

CMD ["node", "index.js"]