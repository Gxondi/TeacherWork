# CloudBase 数据集合

## teacher_workspaces

体验版阶段推荐先用一个集合保存整份工作台数据，降低集合数量和权限配置成本。

字段：

- `schoolYear`: 学年，例如 `2026-2027`
- `classId`: 班级 ID
- `className`: 班级名称
- `ownerOpenid`: 当前教师 openid，用于查询时显式隔离
- `payload`: 工作台数据，包含课程表、座位、值日、班委、花名册、待办
- `_openid`: CloudBase 自动写入，用于数据库权限隔离
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

建议权限：

```json
{
  "read": "auth.openid == doc._openid",
  "write": "auth.openid == doc._openid"
}
```

后续如果要多人协作同一个班级，再拆成 `classes`、`students`、`schedules`、`todos` 等集合，并加入班级成员表。
