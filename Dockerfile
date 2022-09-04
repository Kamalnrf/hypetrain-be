FROM node:18-alpine
WORKDIR /home/node/code
COPY . .
RUN npm install 
RUN npm run build
CMD ["npm", "start"]