# 教师工作台小程序

这是一个微信小程序原生项目，面向体验版验证，默认不需要自建服务器。未填写 CloudBase 环境 ID 时，数据保存在本机小程序缓存；填写环境 ID 后，会尝试同步到 CloudBase 数据库。

## 已实现功能

- 微信登录入口：使用 `wx.getUserProfile` 获取教师头像和昵称
- 顶部栏：学年选择、今日日期、同步状态
- 班级管理：首页课程表、座位表、值日表、班委名单、花名册
- 家校：家长联系、课程表复制、今日待办与打开小程序期间的到点提示
- 课程表：周一到周五、第一节到第九节，支持科目、颜色、上下课时间编辑
- 座位表：讲台单列展示，学生座位支持新增、编辑、批量滑选、交换、清空所选
- 花名册：维护学生和家长信息，支持 CSV/Excel 字段映射导入，提供 PDF 云函数入口；未配置云函数时退化为复制导出数据

## 导入微信开发者工具

1. 打开微信开发者工具。
2. 选择导入项目，目录选择当前文件夹。
3. 如果只是体验界面，可继续使用 `project.config.json` 里的 `touristappid`。
4. 如果要测试微信登录、体验版和 CloudBase，请替换为你自己的小程序 AppID。

## 配置 CloudBase

1. 在微信开发者工具里开通云开发环境。
2. 复制环境 ID。
3. 打开 `miniprogram/app.js`，把 `CLOUD_ENV_ID` 改成你的环境 ID。
4. 在 CloudBase 数据库创建集合 `teacher_workspaces`。
5. 将 `cloudbase/database-rules.json` 中的规则配置到集合权限。

## PDF 导出说明

小程序前端不适合直接生成中文 PDF。当前前端会调用可选云函数 `exportRosterPdf`：

1. 进入 `cloudfunctions/exportRosterPdf` 安装依赖。
2. 如生成中文 PDF 出现乱码，把中文字体文件放到 `cloudfunctions/exportRosterPdf/fonts/NotoSansSC-Regular.otf`。
3. 在微信开发者工具中上传并部署该云函数。

如果你坚持完全不部署云函数，花名册按钮会把可导出的表格文本复制到剪贴板。

## Excel 导入说明

花名册支持 CSV 和 Excel 导入。CSV 在小程序本地读取；Excel 需要 CloudBase 云函数 `importRosterExcel`：

1. 进入 `cloudfunctions/importRosterExcel` 安装依赖。
2. 在微信开发者工具中上传并部署该云函数。
3. 在花名册点击“导入表格”，选择文件后填写字段所在列，例如姓名在 B 列就填 `B`，也可以填 `2`。
4. “学生姓名”是必填映射，其他字段可以留空。

## 建议补充功能

- 多班级切换：同一个教师管理多个班
- 学生标签：住宿、走读、需关注、请假频繁等
- 考勤与请假：和家长联系模块打通
- 作业追踪：按日期和科目记录提交状态
- 家长联系记录：电话、微信沟通、面谈记录可追溯
- 数据导入：从 Excel/CSV 批量导入花名册
