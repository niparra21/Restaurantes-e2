FROM node:18

WORKDIR /usr/src/search

COPY src/search/package*.json ./
RUN npm install

COPY src/search ./
COPY src/shared ./shared

EXPOSE 5001
CMD ["node", "./Server.js"]