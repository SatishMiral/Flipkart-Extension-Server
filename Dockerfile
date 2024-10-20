FROM node:20@sha256:fffa89e023a3351904c04284029105d9e2ac7020886d683775a298569591e5bb

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=C:\\Users\\ASUS\\.cache\\puppeteer\\chrome\\win64-130.0.6723.58\\chrome-win64\\chrome.exe \
    LANG=en_US.UTF-8

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
COPY . .
CMD ["node", "index.js"]