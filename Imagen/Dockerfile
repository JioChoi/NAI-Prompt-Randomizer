FROM node:lts-iron

WORKDIR /app

RUN apt-get update && apt-get install -y git



RUN npm install

EXPOSE 7860
CMD ["node", "/index.js"]