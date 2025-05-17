FROM node:18

WORKDIR /usr/src/api

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000
CMD ["node", "./Server.js"]