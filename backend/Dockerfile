FROM node:16

RUN apt-get update && apt-get install -y python3 python3-pip

WORKDIR /app

COPY node/package*.json ./node/
RUN cd node && npm install

COPY python/requirements.txt ./python/
RUN pip3 install -r python/requirements.txt

COPY . .

EXPOSE 4000

ENV NODE_ENV=production

WORKDIR /app/node
CMD ["npm", "start"]