# syntax=docker/dockerfile:1

# ---------- 依赖 ----------
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# sharp 走官方预编译二进制，slim(glibc) 上开箱即用，不需要装编译链
RUN npm ci --omit=dev --ignore-scripts && cp -R node_modules /prod_modules \
 && npm ci --ignore-scripts

# ---------- 构建 ----------
FROM node:24-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- 运行 ----------
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/data

RUN groupadd -g 1001 app && useradd -u 1001 -g app -m app \
 && mkdir -p /data && chown -R app:app /data

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# standalone 产物自带精简过的 node_modules，static 和 public 要单独拷
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
# sharp 是原生模块，不在 standalone 的追踪范围里，从生产依赖里补进来
COPY --from=deps --chown=app:app /prod_modules/sharp ./node_modules/sharp
COPY --from=deps --chown=app:app /prod_modules/@img ./node_modules/@img

# 以 root 启动只是为了对齐挂载目录的属主，entrypoint 会立刻降到 app 再跑 node。
# 想跳过这一步就在 compose 里加 user: "1000:1000"。
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
