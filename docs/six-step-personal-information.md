# 六项个人信息更新

本次只扩展个人信息、保存恢复及两份成果的数据读取。正式题库、scoring、维度名称、维度结果及其生成限制均不改变。

## 1. 最终顺序

1. 你现在几年级？——自由输入
2. 你比较有优势的学科是什么？——自由输入，可多个
3. 有没有一件你做过的事情，让你特别有成就感？——多行文本
4. 是什么让你觉得特别有成就感？——多行文本
5. 你目前主要考虑哪些升学国家或地区？——自由输入，可多个或“还没确定”
6. 还有什么信息想让我们知道？——较大多行文本，明确提示可留空

内部进度为 01/06 至 06/06。顶部仍为完成测评、补充个人信息、生成发展报告、导师分析资料。

## 2–3. 保存位置和单一数据源

D1 的 assessment_drafts.personal_information 中保存六个独立属性：

```
{
  grade,
  strengthSubjects,
  achievementExperience,
  achievementReason,
  targetRegions,
  additionalContext
}
```

preferredName 仍只持久化在原有 preferred_name 列；报告按会话组合 studentContext，不重复存储姓名，不重复询问。

新增字段沿用同一个 API、700ms 草稿自动保存、继续/返回前保存、修订号冲突保护。current_profile_step 与 completed_profile_steps 的范围扩展到六项。

兼容旧记录：读取时只为缺少的新字段补空字符串，保留原内容；第一次保存时写回六字段对象。无需重建表或修改已执行迁移。原先四项完成的记录从第五项继续；旧 #report / #counselor 链接在六项未完成时进入个人信息。

## 4. 必填与可跳过

延续现有开放填写规则，六项均不强制非空；第六项明确提示可以留空。点击继续会记录该项已完成，即使值为空。Hello 称呼仍可不填，后续使用“你”。未增加成绩格式、课程体系、国家列表或数量限制。

## 5. 学生报告

StudentReportData.studentContext 直接读取同一份 personalInformation。网页和 Markdown 的“真实经历中的我”显示 targetRegions 与 additionalContext 原文，补充信息标注“学生主动补充的信息（未经核实）”。

两个新增字段不参与测评/维度计算，也不加入既有经历词语关联规则，不根据国家推荐大学或替学生确定地区。

## 6. 导师资料

同一个 StudentReportData 分支进入：

```
counselorPackage.educationPreferences.targetRegions
counselorPackage.additionalContext
```

导出资料的使用说明明确：地区用于后续研究范围，多地区分别考虑；“还没确定”或空值保持跨地区探索。补充信息属于学生自述，不能升级为经核实成绩或事实。正式 V3 模板未修改；原有真实维度结果缺失时禁止生成资料的规则不变。

## 测试结果

- A 多地区：美国、英国、香港，经独立 API 和浏览器填写保存通过。
- B 未确定：还没确定，经独立 API 与浏览器保存通过，报告保持原文。
- C 其他信息空白：API 与浏览器均能完成六项并进入下一阶段。
- D IB 示例：完整字符串保存、重新读取、报告展示及测试导师包字段检查通过。
- E 恢复：浏览器刷新后第六项内容仍在；返回第五项可读取之前保存的多个地区；旧四项记录能继续第五项。
- F 导师包：使用既有明确标记的维度测试数据检验，两项信息按独立字段传入；空补充信息不阻止生成测试包。真实学生仍受已有维度结果可用性限制，没有绕过或新增评分。
- 类型检查与生产构建通过。没有改动正式题库或维度结果。

## 7. 本次文件

- web/lib/assessment-session.ts：六字段定义、空值及进度范围
- web/app/api/session/route.ts：旧记录兼容、新记录六字段存储、保存范围
- web/components/personal-information.tsx：六个问题与输入控件
- web/components/student-experience.tsx：六项完成与恢复入口
- web/lib/student-report.ts：六项完成检查
- web/components/student-report.tsx：展示新增背景信息
- web/lib/student-report-markdown.ts：学生报告导出
- web/lib/counselor-package.ts：新增资料字段及背景使用说明
- web/lib/development-profile.ts：排除两个新增背景字段，保持原有分析输入范围
- web/lib/testing-report.ts、web/components/report-testing.tsx：六项测试资料
- web/scripts/verify-personal-information.mjs、web/scripts/verify-report-artifacts.ts：新增字段验证
- README.md、本说明文档
