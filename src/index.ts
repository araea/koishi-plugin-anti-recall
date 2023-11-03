import { Context, Schema, Session } from 'koishi'

export const name = 'anti-recall'
export const usage = `## 数据表

anti-recall 插件使用了一个名为 \`anti_recall_table\` 的数据表，用于存储防撤回监听对象的信息。

该表的各字段如下：

- \`id\`: 自增的主键值，用于唯一标识一条记录。
- \`targetId\`: 防撤回监听对象的 ID，可以是群组 ID 或用户 ID。
- \`isSendToTriggerGuild\`: 是否将撤回的消息发送回触发撤回事件的群组或用户，默认为 \`false\`。
- \`forwardedGuildIds\`: 转发撤回消息的群组 ID 列表，默认为空。
- \`forwardedUserIds\`: 转发撤回消息的用户 ID 列表，默认为空。
- \`bypassedUserIds\`: 不监听撤回消息的用户 ID 列表，默认为空。

## 指令

anti-recall 插件提供了以下指令，用于管理防撤回监听对象：

- \`antiRecall\`: 查看 antiRecall 帮助。
- \`antiRecall.add <targetId:string> [isSendToTriggerGuild:boolean] [forwardedGuildId:string] [forwardedUserId:string] [bypassedUserId:string]\`: 添加防撤回监听对象。
  - \`targetId\` 参数可以是一个或多个用逗号分隔的群组 ID 或用户 ID，也可以使用 \`~\` 代表当前会话的群组 ID 或用户 ID。其他参数可选，用于设置是否将撤回消息发送回触发群组或用户，以及转发和忽略的群组或用户列表。
- \`antiRecall.delete <targetId:string>\`: 删除防撤回监听对象。
  - \`targetId\` 参数同上。
- \`antiRecall.set <targetId:string> [isSendToTriggerGuild:boolean] [forwardedGuildId:string] [forwardedUserId:string] [bypassedUserId:string]\`: 设置防撤回监听对象的属性。
  - \`targetId\` 参数同上，其他参数可选，用于修改是否将撤回消息发送回触发群组或用户，以及转发和忽略的群组或用户列表。
- \`antiRecall.list\`：查看启用的对象 ID 列表

## 事件

anti-recall 插件监听了 \`message-deleted\` 事件，用于检测指定的群组或用户是否有撤回消息，并将撤回的消息内容和相关信息转发到其他群组或用户。

## 示例

假设有以下场景：

- 群 A 的 ID 是 123456
- 群 B 的 ID 是 234567
- 用户 C 的 ID 是 345678
- 用户 D 的 ID 是 456789

如果想要监听群 A 和用户 C 的撤回消息，并将其转发到群 B 和用户 D，并且不监听用户 D 在群 A 的撤回消息，则可以使用以下指令：

\`\`\`bash
antiRecall.add 123456,345678 true 234567 456789 456789
\`\`\`

这样，当群 A 或用户 C 中有人（除了用户 D）撤回消息时，就会将该消息内容和相关信息发送到群 A、群 B 和用户 D 中。`

export interface Config { }

export const Config: Schema<Config> = Schema.object({})

// TypeScript 用户需要进行类型合并
declare module 'koishi' {
  interface Tables {
    anti_recall_table: AntiRecall
  }
}

export interface AntiRecall {
  id: number
  targetId: string
  isSendToTriggerGuild: boolean
  forwardedGuildIds: string[]
  forwardedUserIds: string[]
  bypassedUserIds: string[]
}

// 避免硬编码
const TABLE_ID = 'anti_recall_table'

// 插件主函数
export function apply(ctx: Context) {
  // 拓展表
  extendTable(ctx)
  // 注册指令
  registerCommand(ctx)
  // 注册防撤回的消息监听器
  registerRecallListener(ctx)
}

function extendTable(ctx: Context) {
  ctx.model.extend(TABLE_ID, {
    // 各字段类型
    id: 'unsigned',
    targetId: 'string',
    isSendToTriggerGuild: 'boolean',
    forwardedGuildIds: 'list',
    forwardedUserIds: 'list',
    bypassedUserIds: 'list',
  }, {
    // 使用自增的主键值
    autoInc: true,
  })
}

function registerCommand(ctx: Context) {
  // antiRecall add delete set list

  // antiRecall
  ctx.command('antiRecall', '查看 antiRecall 帮助')
    .action(async ({ session }) => {
      await session.execute(`antirecall -h`)
    })
  // add
  ctx.command('antiRecall.add <targetId:string> [isSendToTriggerGuild:boolean] [forwardedGuildId:string] [forwardedUserId:string] [bypassedUserId:string]', '添加防撤回监听对象')
    .action(async ({ session }, targetId, ...options) => {
      if (!targetId) {
        await session.execute(`antiRecall.add -h`);
        return;
      }

      const targetIds = targetId.split(/[,，]\s*/);

      for (let id of targetIds) {
        if (id === '~') {
          id = session.guildId !== undefined ? session.guildId : session.userId;
        }

        if (isNaN(Number(id))) {
          await session.sendQueued(`对象 ${id} 无效喵~！`);
          continue;
        }

        const isExists = await isTargetIdExists(ctx, id);

        if (isExists) {
          await session.sendQueued(`对象 ${id} 已存在喵~！`);
          continue;
        }

        const params = parseOptions(options, session);
        params.targetId = id;

        await ctx.database.create(TABLE_ID, params);
        await session.sendQueued(`对象 ${id} 添加成功啦~ 喵~！`);
      }
    });

  // delete
  ctx.command('antiRecall.delete <targetId:string>', '删除防撤回监听对象')
    .action(async ({ session }, targetId) => {
      if (!targetId) {
        await session.execute(`antiRecall.delete -h`);
        return;
      }

      const targetIds = targetId.split(/[,，]\s*/);

      for (let id of targetIds) {
        if (id === '~') {
          id = session.guildId !== undefined ? session.guildId : session.userId;
        }

        if (isNaN(Number(id))) {
          await session.sendQueued(`对象 ${id} 无效喵~！`);
          continue;
        }

        const isExists = await isTargetIdExists(ctx, id);
        if (!isExists) {
          await session.sendQueued(`对象 ${id} 不存在喵~！`)
        }
        await ctx.database.remove(TABLE_ID, { targetId: id })
        await session.sendQueued(`对象 ${id} 删除成功啦~ 喵~！`);
      }
    })

  // set
  ctx.command('antiRecall.set <targetId:string> [isSendToTriggerGuild:boolean] [forwardedGuildId:string] [forwardedUserId:string] [bypassedUserId:string]', '添加防撤回监听对象')
    .action(async ({ session }, targetId, ...options) => {
      if (!targetId) {
        await session.execute(`antiRecall.set -h`);
        return;
      }

      const targetIds = targetId.split(/[,，]\s*/);

      for (let id of targetIds) {
        if (id === '~') {
          id = session.guildId ?? session.userId;

        }

        if (isNaN(Number(id))) {
          await session.sendQueued(`对象 ${id} 无效喵~！`);
          continue;
        }

        const isExists = await isTargetIdExists(ctx, id);

        if (!isExists) {
          await session.sendQueued(`对象 ${id} 不存在喵~！`)
          continue;
        }

        const params = parseOptions(options, session);

        await ctx.database.set(TABLE_ID, { targetId: id }, params);
        await session.sendQueued(`对象 ${id} 设置成功啦~ 喵~！`);
      }
    });
  // list
  ctx.command('antiRecall.list', '查看启用的对象 ID 列表')
    .action(async ({ session }) => {
      const targetIds = await ctx.database.get(TABLE_ID, {}, ['targetId'])
      const idList = visualizeIds(targetIds);
      return `已经启用的对象 ID 列表如下：\n\n${idList}\n更多信息请前往数据表查看喵~`

      function visualizeIds(arr: { targetId: string }[]): string {
        let idList = '';
        arr.forEach((item, index) => {
          idList += `${index + 1}. ${item.targetId}\n`;
        });
        return idList;
      }
    })

  function parseOptions(options: any[], session: any) {
    const [isSendToTriggerGuild, forwardedGuildId, forwardedUserId, bypassedUserId] = options;
    const result: any = {};

    if (isSendToTriggerGuild) {
      result.isSendToTriggerGuild = isSendToTriggerGuild;
    }

    if (forwardedGuildId) {
      result.forwardedGuildIds = parseIds(forwardedGuildId, session.guildId);
    }

    if (forwardedUserId) {
      result.forwardedUserIds = parseIds(forwardedUserId, session.userId);
    }

    if (bypassedUserId) {
      result.bypassedUserIds = parseIds(bypassedUserId, session.userId);
    }
    return result;
  }

  function parseIds(idString: string, replaceValue: string) {
    return idString
      .split(/[,，]/)
      .map((id: string) => id.trim() === '~' ? replaceValue : id)
      .filter((id: any) => !isNaN(Number(id)));
  }
}

async function isTargetIdExists(ctx: Context, targetId: string) {
  const targetInfo = await ctx.database.get(TABLE_ID, { targetId });
  return targetInfo.length !== 0;
}

function registerRecallListener(ctx: Context) {
  ctx.on('message-deleted', async (session) => {
    const { guildId, userId, messageId } = session;
    const targetId = guildId ?? userId;
    const [targetInfo] = await getTargetInfo(ctx, targetId);
    if (!targetInfo && targetId === guildId && await isTargetIdExists(ctx, session.userId)) {
      const [targetInfo] = await getTargetInfo(ctx, session.userId);
      await sendRecallMessage(session, targetInfo, session.userId, messageId);
      return
    }
    if (!targetInfo) return;

    if (targetInfo.bypassedUserIds.includes(userId)) return;

    await sendRecallMessage(session, targetInfo, targetId, messageId);
  });

  async function getTargetInfo(ctx: Context, targetId: string) {
    return ctx.database.get(TABLE_ID, { targetId });
  }

  async function sendRecallMessage(session: Session, targetInfo: AntiRecall, targetId: string, messageId: string) {
    const recallMessage = `触发撤回事件群组或用户名称：${(targetId === session.guildId) ? (await session.bot.getGuild(targetId)).name : (await session.bot.getUser(session.userId)).name}\n触发撤回事件群组或用户 ID：${targetId}\n撤回消息者名字：${(await session.bot.getUser(session.userId)).name}\n撤回消息者 ID：${session.userId}\n撤回消息内容：${(await session.bot.getMessage(targetId, messageId)).content}`;
    if (targetInfo.isSendToTriggerGuild) {
      await session.sendQueued((await session.bot.getMessage(targetId, messageId)).content)
    }

    // 使用 Promise.all 来并行发送消息，提高效率
    await Promise.all([
      ...targetInfo.forwardedGuildIds.map(guildId => session.bot.sendMessage(guildId, recallMessage)),
      ...targetInfo.forwardedUserIds.map(userId => session.bot.sendPrivateMessage(userId, recallMessage))
    ]);
  }
}



