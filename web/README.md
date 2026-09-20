# 学生发展优势测评 · 网站

React + TypeScript + Vinext，沿用旧项目成熟技术栈，独立实现 Student-Only 流程。

## 当前可用

首页 → Hello 称呼 → 正式 72 题 → 第一部分完成。包含三阶段导航、数据库自动保存、刷新恢复、返回改答、保存失败重试和并发更新保护。

评分公式尚待用户确认。没有 scoring 实现、发展画像或假报告；后续个人信息、学生报告、下载及导师接口尚未实施。当前仅供本地预览，不作为完整产品发布。

## 本地运行

Node.js >= 22.13。运行 npm ci，随后 npm run build，按顺序应用 drizzle/ 下尚未应用的本地迁移，再运行 npm run dev -- --port 5186。

首次应用迁移：

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_black_falcon.sql
```

生产部署需要 Cloudflare Worker 与 D1，绑定名称为 DB；尚未创建远程部署或使用任何凭证。

## 数据与保存

data/question-bank.json 是运行时唯一题库。仓库上级 source/ 保存用户确认的原始 Excel，上级 scripts/import_question_bank.py 可重新导入。

匿名会话由 HttpOnly Cookie 识别，数据库只保存该随机令牌的哈希。每次写入校验题号、整数选项、题库版本和修订号。保存失败不会显示成功；较旧标签页写入返回冲突。

回答保存在 D1；同一浏览器保留 Cookie 后可继续。当前没有账户或跨设备恢复。清除 Cookie 后无法自动找回原会话。当前预览数据库位于忽略提交的 .wrangler/state/。

## 验证

- npx tsc --noEmit --incremental false
- npm run build
- node scripts/verify-assessment.mjs
- node scripts/verify-keyboard.mjs

浏览器测试使用 Playwright 与 Chrome；本工作区由工具运行环境提供 Playwright，其他环境需先安装该测试依赖。测试生成的数据是独立匿名会话，不覆盖用户回答。截图在 outputs/，不提交。

无 AI 调用、家长流程、专业推荐或自动生成的导师 Prompt。用户提供的 Prompt V3 原文仅保存在仓库上级 docs/，未接入运行时。
