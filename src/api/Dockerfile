FROM node:18

WORKDIR /usr/src/api

COPY src/api/package*.json ./
RUN npm install

COPY src/api ./
COPY src/shared ./shared

EXPOSE 5000
CMD ["node", "./Server.js"]