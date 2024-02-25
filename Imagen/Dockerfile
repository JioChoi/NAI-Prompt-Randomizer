FROM node:lts-iron

WORKDIR /app

RUN apt-get update && apt-get install -y git

RUN git clone https://github.com/JioChoi/NAI-Prompt-Randomizer.git /app
WORKDIR /app/Imagen

RUN npm install

EXPOSE 7860
CMD ["node", "index.js"]