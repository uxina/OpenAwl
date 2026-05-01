# ============================================
# 阿瓦隆游戏服务器 - 生产环境 Dockerfile
# ============================================

# ---- 阶段1: 构建基础镜像 ----
# 使用官方镜像完整地址，避免镜像加速问题
FROM docker.io/library/node:18-alpine AS base

# 安装系统依赖（如果需要编译原生模块）
RUN apk add --no-cache dumb-init

# ---- 阶段2: 安装依赖 ----
FROM base AS dependencies

# 设置工作目录
WORKDIR /app

# 复制依赖配置文件（利用 Docker 缓存层）
COPY package*.json ./

# 安装生产环境依赖（仅安装 dependencies，不安装 devDependencies）
RUN npm ci --only=production && npm cache clean --force

# ---- 阶段3: 生产镜像 ----
FROM base AS production

# 创建非 root 用户（安全最佳实践）
# -S: 创建系统用户，-s /sbin/nologin: 禁止登录，-G node: 添加到 node 组
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs -s /sbin/nologin

# 设置工作目录
WORKDIR /app

# 复制已安装的依赖
COPY --from=dependencies /app/node_modules ./node_modules

# 复制项目文件（注意：.dockerignore 会排除不需要的文件）
COPY --chown=nodejs:nodejs . .

# 切换到非 root 用户
USER nodejs

# 暴露应用端口
EXPOSE 3000

# 健康检查：每 30 秒检查一次，超时 3 秒，连续 3 次失败才认为不健康
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# 使用 dumb-init 处理 PID 1 信号转发问题
ENTRYPOINT ["dumb-init", "--"]

# 启动命令
CMD ["node", "server.js"]
