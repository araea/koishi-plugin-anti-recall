# koishi-plugin-anti-recall

[![npm](https://img.shields.io/npm/v/koishi-plugin-anti-recall?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-anti-recall)

## 介绍

anti-recall 是一个 Koishi 插件，用于防止指定的群组或用户撤回消息，并将撤回的消息转发到其他群组或用户。

## 安装

```
前往 Koishi 插件市场添加该插件即可
```

## 配置项

```
anti-recall 插件目前没有任何配置项
```


## 数据表

anti-recall 插件使用了一个名为 `anti_recall_table` 的数据表，用于存储防撤回监听对象的信息。

该表的各字段如下：

- `id`： 自增的主键值，用于唯一标识一条记录。
- `targetId`： 防撤回监听对象的 ID，可以是群组 ID 或用户 ID。
- `isSendToTriggerGuild`： 是否将撤回的消息发送回触发撤回事件的群组或用户，默认为 `false`。
- `forwardedGuildIds`： 转发撤回消息的群组 ID 列表，默认为空。
- `forwardedUserIds`： 转发撤回消息的用户 ID 列表，默认为空。
- `bypassedUserIds`： 不监听撤回消息的用户 ID 列表，默认为空。

## 指令

anti-recall 插件提供了以下指令，用于管理防撤回监听对象：

- `antiRecall`：查看 antiRecall 帮助。
- `antiRecall.add <targetId:string> [isSendToTriggerGuild:boolean] [forwardedGuildId:string] [forwardedUserId:string] [bypassedUserId:string]`：添加防撤回监听对象。
  - `targetId` 参数可以是一个或多个用逗号分隔的群组 ID 或用户 ID，也可以使用 `~` 代表当前会话的群组 ID 或用户 ID。其他参数可选，用于设置是否将撤回消息发送回触发群组或用户，以及转发和忽略的群组或用户列表。
- `antiRecall.delete <targetId:string>`：删除防撤回监听对象。
  - `targetId` 参数同上。
- `antiRecall.set <targetId:string> [isSendToTriggerGuild:boolean] [forwardedGuildId:string] [forwardedUserId:string] [bypassedUserId:string]`：设置防撤回监听对象的属性。
  - `targetId` 参数同上，其他参数可选，用于修改是否将撤回消息发送回触发群组或用户，以及转发和忽略的群组或用户列表。
- `antiRecall.list`：查看启用的对象 ID 列表

## 事件

anti-recall 插件监听了 `message-deleted` 事件，用于检测指定的群组或用户是否有撤回消息，并将撤回的消息内容和相关信息转发到其他群组或用户。

## 示例

假设有以下场景：

- 群 A 的 ID 是 123456
- 群 B 的 ID 是 234567
- 用户 C 的 ID 是 345678
- 用户 D 的 ID 是 456789

如果想要监听群 A 和用户 C 的撤回消息，并将其转发到群 B 和用户 D，并且不监听用户 D 在群 A 的撤回消息，则可以使用以下指令：

```bash
antiRecall.add 123456,345678 true 234567 456789 456789
```

这样，当群 A 或用户 C 中有人（除了用户 D）撤回消息时，就会将该消息内容和相关信息发送到群 A、群 B 和用户 D 中。

## 致谢

* [Koishi](https://koishi.chat/)：机器人框架

## License

MIT License © 2023