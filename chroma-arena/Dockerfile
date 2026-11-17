FROM node:22-alpine

WORKDIR /app

# The client bundle is committed, so production does not need dev dependencies.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=8787
ENV CHROMA_DATA_DIR=/data

RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 8787

CMD ["node", "server/index.js"]
