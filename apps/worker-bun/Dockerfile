FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json .
RUN bun install

COPY src ./src
COPY engines ./engines

CMD ["bun", "src/index.ts"]
EXPOSE 8001
