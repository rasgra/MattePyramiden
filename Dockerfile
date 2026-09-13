FROM mcr.microsoft.com/playwright:v1.47.2-jammy

WORKDIR /app

COPY package*.json /app/
RUN npm install && chmod a+w /app/node_modules

COPY . /app

EXPOSE 8000
CMD ["npx", "http-server", ".", "-p", "8000"]
