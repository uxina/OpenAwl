# 贡献指南

## 提交规范

本项目采用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 提交格式

```
<类型>[可选作用域]: <描述>

[可选正文]

[可选脚注]
```

### 类型说明

| 类型 | 说明 | 版本影响 |
|------|------|---------|
| `feat` | 新功能 | MINOR |
| `fix` | Bug修复 | PATCH |
| `docs` | 文档变更 | 无 |
| `style` | 代码格式 | 无 |
| `refactor` | 重构 | PATCH |
| `perf` | 性能优化 | PATCH |
| `test` | 测试变更 | 无 |
| `chore` | 构建/工具变更 | 无 |

### 示例

```bash
feat(语音): 添加夜间阶段语音控制
fix(组队): 修复第二轮队长轮换错误
docs(readme): 更新安装说明
refactor(server): 重构Socket事件处理
```

## 开发流程

1. Fork 项目并创建特性分支
2. 开发并编写测试
3. 确保所有测试通过
4. 按规范提交
5. 提交 Pull Request

## 环境搭建

```bash
npm install
npm start
```

访问 `http://localhost:3000`
