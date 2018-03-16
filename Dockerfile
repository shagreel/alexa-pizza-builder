FROM node:wheezy

COPY package.json *.js go ./
RUN npm install -g nodemon
RUN npm install

RUN apt-get update && apt-get install zip unzip

RUN curl -O https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip
RUN unzip -o ngrok-stable-linux-amd64.zip

CMD /go
