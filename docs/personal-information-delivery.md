# 测评后流程交付与验证

2026-09-21。用户明确要求不修改评分；进一步确认先生成包含四项个人信息与原始作答记录的报告，注明维度结果尚未提供。

## 页面

- 测评完成页：主按钮“继续补充个人信息”，回看回答为次级文字按钮。
- 个人信息：每屏一项，01/04 至 04/04。只收集年级、优势学科、成就经历、成就原因；自由输入，无示例或预设课程。
- 个人信息完成页：进入“生成我的发展报告”，三阶段进度同步更新。
- 学生报告：称呼标题、四项原文、可展开的 72 道原始作答。说明“维度结果尚未提供”，无分数汇总和推断。
- Hello：保留原有称呼字段，允许空值通过，以满足无称呼场景。后续没有第二个姓名输入框。

## 数据与称呼

D1 的 assessment_drafts.preferred_name 是称呼的唯一持久化位置。HttpOnly 会话 cookie 关联该学生记录。后续使用 session.preferredName，未设置时报告标题为“你的发展报告”。

personal_information 列保存结构化对象，四个字段分别是 grade、strengthSubjects、achievementExperience、achievementReason。没有复制 preferredName。生成报告时将同一会话的 preferredName 与四项数据组合为 studentContext。

current_profile_step（0–3）、completed_profile_steps（0–4）、updated_at 同记录保存。后者区分已完成空项与尚未填写项，不强制编造经历。

## 保存与恢复

- 停止输入约 700 毫秒后保存草稿；中文组合输入结束后再保存。
- 继续/返回会等待队列保存完成才切换。每项完成立即记录进度。
- 保存失败保留输入并允许继续按钮重试；正在保存或失败时提醒不要直接关闭。
- 乐观修订号阻止其他标签页的旧数据覆盖；保存操作按顺序执行。
- 刷新和重新进入时从第一项未完成信息继续。前两项完成后恢复第三项。
- 四项完成后可回看修改；报告生成重新读取已保存的会话，刷新报告也重新构建。

## 报告读取

createStudentReport 将同一会话的 personalInformation 与 preferredName 组成 studentContext，并从唯一题库对照 session.answers 读取题目原文和选项标签。assessmentResults、dimensionResults 显式为 null。它没有平均分、反向计分、阈值或画像计算。

## 验证

- TypeScript 检查与生产构建通过。
- 独立 API 测试：小雨/空称呼两种会话；逐题保存72题；提前进入信息阶段拒绝；四项保存后重新读取一致；第二项后恢复第三项；旧修订拒绝；没有新增姓名字段；作答不变；报告读取全部四项及72道答案，两个结果字段为 null。
- 浏览器独立测试会话：测评完成 → 四步信息 → 报告完整通过；填完两项刷新恢复第三项；多学科自由输入；多行中文经历返回后保留；原因独立保存；72项记录展开；报告刷新后仍可读取。
- 手机尺寸 390×844：实际观察输入界面与报告，没有横向溢出，按钮可操作，长内容可滚动。中文文本输入和换行保存正常。
- 限制：使用桌面浏览器模拟手机尺寸，未进行 iOS/Android 真机软键盘和真实输入法组合候选测试，不声称已覆盖真机键盘遮挡。
- 用户的 localhost 会话仅刷新展示，未填入测试资料；浏览器测试使用独立 IPv6 来源会话，API 使用独立 cookie。

运行数据测试：在 web 目录执行 `node scripts/verify-personal-information.mjs`，需要本地预览服务。脚本只创建独立测试会话，不改动现有用户记录。

## 本次文件

- web/components/student-experience.tsx
- web/components/personal-information.tsx（新增）
- web/components/student-report.tsx（新增）
- web/app/globals.css
- web/lib/assessment-session.ts
- web/lib/student-report.ts（新增）
- web/app/api/session/route.ts
- web/db/schema.ts
- web/drizzle/0001_swift_ted_forrester.sql（新增迁移）
- web/drizzle/meta/0001_snapshot.json、_journal.json
- web/scripts/verify-personal-information.mjs（新增）
- README.md、本说明文档

题库、题目文字、维度映射、反向计分、评分、Development Profile 计算、导师 Prompt 与 AI 集成均未新增或修改。旧项目未改动。
