FROM node:18

WORKDIR /usr/src/search

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5001
CMD ["node", "./Server.js"]