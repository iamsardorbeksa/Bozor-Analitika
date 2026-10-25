import type { AwardTexts, Dict } from './en'

/** Simplified Chinese. No plural inflection: plural strings have a single form. */
export const zh: Dict = {
  // ---- common
  'common.others': '其他人（{n}）',
  'common.person': '成员 {letter}',
  'common.back': '返回',

  // ---- units (plural)
  'unit.messages': '条消息',
  'unit.times': '{n} 次',
  'unit.daysInARow': '连续天数',

  // ---- card chrome
  'card.footer.made': '由 {name} 生成',
  'card.footer.cta': '做一份你的 → {url}',

  // ---- intro
  'card.intro.titleYear': '你们的 {year} 聊天年度报告',
  'card.intro.title': '你们的聊天年度总结',
  'card.intro.group': '{n} 个人，一个群',
  'card.intro.tap': '点击开始',

  // ---- total
  'card.total.label': '共 {n} 条消息',
  'card.total.kicker': '你们一共发了',
  'card.total.kickerGroup': '这个群一共发了',
  'card.total.words': '{n} 个词',
  'card.total.days': '聊了 {n} 天',
  'card.total.perDay': '活跃日平均 ≈ {n} 条消息',
  'card.total.busiest': '最热闹的一天',
  'card.total.busiestCount': '当天 {n} 条消息',

  // ---- who talks more
  'card.who.kicker': '谁的话更多？',
  'card.who.balanced': '完美平衡，万物本该如此',
  'card.who.more': '{name} 包揽了大部分台词',
  'card.who.msgs': '{n} 条',
  'card.who.longer': '{name} 的消息更长：平均 {n} 个词，对方 {m} 个。',
  'card.who.groupTitle': '{name} 是本群话事人',

  // ---- peak hour
  'card.peak.kicker': '你们的聊天高峰',
  'card.peak.chartLabel': '各时段消息数',
  'card.peak.day': '最活跃的星期',
  'card.peak.vibe.night': '认证夜猫子 🦉',
  'card.peak.vibe.morning': '原来是早起党 ☀️',
  'card.peak.vibe.lunch': '午休唠嗑专业户 🥪',
  'card.peak.vibe.afternoon': '下午犯困？不存在的 💬',
  'card.peak.vibe.evening': '晚上才是黄金时段 🌆',

  // ---- silence / streak
  'card.silence.kicker': '最长的沉默',
  'card.silence.between': '从 {from} 到 {to}',
  'card.silence.broke': '最终由 {name} 打破了沉默。',
  'card.streak.kicker': '最长连续聊天',
  'card.streak.active': '{m} 天里有 {n} 天在聊',

  // ---- reply speed
  'card.reply.kicker': '回复速度',
  'card.reply.fastest': '秒回王者：{name}',
  'card.reply.median': '回复时间中位数',
  'card.reply.slowest': '{name} 不紧不慢。好饭不怕晚嘛。',

  // ---- words
  'card.words.kicker': '高频词',
  'card.words.title': '你们最爱说的词',
  'card.words.titleGroup': '定义了你们的那些词',

  // ---- emoji
  'card.emoji.kicker': '年度表情',
  'card.emoji.used': '次使用',

  // ---- laugh
  'card.laugh.kicker': '笑声指数',
  'card.laugh.total': '每 100 条消息笑 {n} 次',
  'card.laugh.most': '笑点最低：{name}',
  'card.laugh.rating.club': '喜剧俱乐部 🎤',
  'card.laugh.rating.vibes': '快乐至上 ✨',
  'card.laugh.rating.smiles': '偷偷乐 🙂',
  'card.laugh.rating.serious': '严肃认真 🧐',

  // ---- awards
  'card.awards.kicker': '获奖的是',

  // ---- starter
  'card.starter.kicker': '谁先开口？',
  'card.starter.title': '{name} 总是先开口',
  'card.starter.of': '共 {n} 次对话',
  'card.starter.killer': '话题终结者：{name}',
  'card.starter.double': '连发三条最多：{name}',

  // ---- summary
  'card.summary.kicker': '你们的聊天年度总结',
  'card.summary.titleGroup': '我们的群聊',
  'card.summary.messages': '消息',
  'card.summary.days': '聊天天数',
  'card.summary.peak': '高峰时段',
  'card.summary.streak': '最长连续',
  'card.summary.emoji': '最爱表情',
  'card.summary.word': '最爱词语',
  'card.summary.fastest': '最快回复',
  'card.summary.laughs': '笑声',
  'card.summary.duration': '一段跨越 {d} 的故事',

  // ---- card titles (accessibility + file names)
  'cardTitle.intro': '开场',
  'cardTitle.total': '消息总数',
  'cardTitle.who': '谁的话更多',
  'cardTitle.peak': '高峰时段',
  'cardTitle.silence': '最长沉默与连续聊天',
  'cardTitle.reply': '回复速度',
  'cardTitle.words': '高频词',
  'cardTitle.emojis': '高频表情',
  'cardTitle.laugh': '笑声指数',
  'cardTitle.awards': '奖项：{names}',
  'cardTitle.starter': '谁先开口',
  'cardTitle.summary': '总结',

  // ---- story viewer
  'story.progress': '卡片',
  'story.goTo': '前往第 {n} 张卡片：{title}',
  'story.announce': '第 {n} 张，共 {total} 张：{title}',
  'story.close': '关闭',
  'story.hideNames': '隐藏名字',
  'story.settings': '设置',
  'story.carousel': '你的年度聊天故事。点击右侧或按 → 查看下一张。',
  'story.prev': '上一张',
  'story.next': '下一张',
  'story.recomputing': '重新计算中…',
  'story.save': '保存图片',
  'story.share': '分享',
  'story.saveAll': '全部（ZIP）',
  'story.saving': '正在生成图片…',
  'story.preparing': '准备中…',
  'story.zipping': '正在打包卡片…',
  'story.saved': '已保存到下载文件夹',
  'story.savedAll': '所有卡片已保存为 ZIP',
  'story.exportError': '图片生成失败，请重试。',
  'share.text': '我的聊天年度总结 🎁 你也来做一份吧（100% 私密）：{url}',

  // ---- settings
  'settings.title': '设置',
  'settings.hideNamesHelp': '所有卡片上用“成员 A / 成员 B”代替真实名字。',
  'settings.language': '语言',

  // ---- time range
  'range.label': '时间范围',
  'range.all': '全部时间',
  'range.year': '最近一年',
  'range.6months': '最近 6 个月',
  'range.30days': '最近 30 天',

  // ---- date order
  'dates.title': '日期格式',
  'dates.current': '当前按 {format} 读取日期。',
  'dates.dmy': '日/月',
  'dates.mdy': '月/日',
  'dates.guess': '（自动猜测）',
  'dates.wrong': '日期不对？改用 {format}',

  // ---- navigation & theme
  'nav.privacy': '隐私',
  'nav.faq': '常见问题',
  'nav.howto': '如何导出',
  'nav.home': '首页',
  'theme.toLight': '切换到浅色主题',
  'theme.toDark': '切换到深色主题',
  'lang.label': '语言',
  'skip.toContent': '跳到正文',

  // ---- hero
  'hero.eyebrow': 'WhatsApp + Telegram',
  'hero.title': '你的聊天，年度总结。',
  'hero.subtitle':
    '把任意聊天变成一个有趣又多彩的故事：谁先开口、谁玩消失、最爱的表情，还有一些非常诚实的奖项。',
  'hero.cta': '生成我的年度总结',
  'hero.demo': '试试示例',
  'privacy.badge': '聊天记录绝不离开你的设备',
  'privacy.short': '不上传，无服务器，无追踪。一切都在你的浏览器里完成。',

  // ---- upload
  'upload.title': '上传聊天记录',
  'upload.tabs': '选择你的应用',
  'upload.drop': '把聊天文件拖到这里',
  'upload.dropActive': '松手吧！',
  'upload.or': '或',
  'upload.button': '选择文件',
  'upload.buttonPrivacy': '只留在你的设备上',
  'upload.accepts.whatsapp': 'WhatsApp：导出的 .txt 或 .zip',
  'upload.accepts.telegram': 'Telegram：导出的 result.json',

  // ---- export steps
  'steps.title': '如何导出',
  'steps.wa.iphone': 'iPhone',
  'steps.wa.android': 'Android',
  'steps.wa.iphone.1': '打开聊天',
  'steps.wa.iphone.2': '点击联系人或群组名称',
  'steps.wa.iphone.3': '向下滑动，点击“导出聊天”',
  'steps.wa.iphone.4': '选择“不附加媒体”，保存文件',
  'steps.wa.android.1': '打开聊天',
  'steps.wa.android.2': '点击 ⋮（三个点）',
  'steps.wa.android.3': '点击“更多” → “导出聊天”',
  'steps.wa.android.4': '选择“不附加媒体”，保存文件',
  'steps.wa.tip': '上传 .zip 或其中的 .txt 都可以。',
  'steps.tg.desktop': 'Telegram Desktop',
  'steps.tg.note':
    'Telegram 手机版无法导出聊天，请使用 Telegram Desktop（Windows、macOS 或 Linux）。',
  'steps.tg.1': '在 Telegram Desktop 中打开聊天',
  'steps.tg.2': '点击 ⋮（三个点）→“导出聊天记录”',
  'steps.tg.3': '取消勾选照片、视频和其他所有媒体',
  'steps.tg.4': '将格式设为“机器可读的 JSON”',
  'steps.tg.5': '点击“导出”，然后上传 result.json',
  'steps.tg.tip': '导出了整个账号？也可以上传，我们会让你挑一个聊天。',

  // ---- demo
  'demo.title': '手头没有聊天记录？试试示例',
  'demo.whatsapp': 'WhatsApp 单聊',
  'demo.telegram': 'Telegram 群聊',
  'demo.note': '示例聊天纯属虚构。',
  'demo.banner': '示例模式：虚构聊天',

  // ---- features
  'features.private.title': '100% 私密',
  'features.private.text': '文件由你自己的浏览器读取，绝不上传，断网也能用。',
  'features.fast.title': '大群聊？没问题。',
  'features.fast.text': '几十万条消息几秒搞定，手机也不卡。',
  'features.share.title': '为快拍而生',
  'features.share.text': '每张卡片都是 1080×1920 的图片，发 Instagram、TikTok 或群聊都合适。',
  'features.title': '为什么大家都爱它',
  'features.langs.title': '懂你的语言',
  'features.langs.text': '支持 9 种语言，包括阿拉伯语和中文。每种语言里的笑声和“谢谢”都认得出来。',
  'features.groups.title': '单聊群聊都能玩',
  'features.groups.text': '一对一聊天和最多 50 人的群聊都支持。',
  'features.free.title': '免费，免注册',
  'features.free.text': '无需账号，无需安装。喜欢的话，还能添加到主屏幕。',

  // ---- "what you'll discover"
  'discover.title': '你会发现什么',
  'discover.subtitle': '你们的聊天一直在悄悄写故事，12+ 张卡片，滑着看。',
  'discover.total.title': '消息总数',
  'discover.total.text': '每一条消息、每一个词，还有那天停不下来的疯狂输出。',
  'discover.who.title': '谁的话更多',
  'discover.who.text': '精确到比例，再看看谁是小作文选手。',
  'discover.rush.title': '聊天高峰',
  'discover.rush.text': '夜猫子还是早起党？最活跃的时段和星期一目了然。',
  'discover.streak.title': '最长连续聊天',
  'discover.streak.text': '连续多少天，聊天一天都没断过。',
  'discover.silence.title': '最长的沉默',
  'discover.silence.text': '断联最久的一次，以及最后是谁打破了沉默。',
  'discover.reply.title': '回复速度',
  'discover.reply.text': '谁秒回，谁又让你停在“已读”。',
  'discover.starter.title': '谁先开口',
  'discover.starter.text': '谁总在发起话题，谁又总要说最后一句。',
  'discover.laugh.title': '笑声指数',
  'discover.laugh.text': '每一声“哈哈哈”、“笑死”和 😂 都记着呢。谁是最佳观众？',
  'discover.words.title': '高频词和表情',
  'discover.words.text': '最能代表你们的那些词和表情。',

  // ---- awards showcase
  'showcase.title': '人人有奖',
  'showcase.subtitle': '34 个趣味称号，按你们真实的聊天方式颁发。永远好笑，绝不伤人。',
  'showcase.example': '示例',

  // ---- use cases
  'uses.title': '特别适合',
  'uses.couples.title': '情侣',
  'uses.couples.text': '纪念日惊喜：用数字讲述你们的爱情故事。',
  'uses.friends.title': '死党',
  'uses.friends.text': '谁回得更快？这次彻底见分晓。',
  'uses.family.title': '家庭群',
  'uses.family.text': '看看谁是家里的“早安”专业户。',
  'uses.teams.title': '团队与社群',
  'uses.teams.text': '给群聊来一份有趣的年终回顾。',
  'uses.moments.title': '重要时刻',
  'uses.moments.text': '生日、新年、毕业季：现成的“我们的这一年”纪念帖。',

  // ---- closing call to action
  'cta.title': '准备好看看你们的故事了吗？',
  'cta.text': '大约一分钟就好。聊天记录绝不离开你的设备。',

  // ---- FAQ
  'faq.title': '常见问题',
  'faq.q1': '真的安全吗？',
  'faq.a1':
    '是的。应用完全在你的浏览器中运行，其安全策略禁止任何网络连接，所以你的聊天记录从物理上就无法被发送出去。无需账号，没有统计分析，没有 Cookie。',
  'faq.q2': '为什么有些数据看起来不对？',
  'faq.a2':
    '导出格式因手机、语言和应用版本而异。如果日期不对，请使用“日期不对？”开关。媒体数量根据导出中的占位文字统计，回复时间只计算 12 小时内的回复。',
  'faq.q3': '支持哪些语言？',
  'faq.a3':
    '任何语言都能统计。词表、笑声和媒体占位文字针对英语、俄语、乌兹别克语、西班牙语、土耳其语、葡萄牙语、德语、法语和阿拉伯语做了优化。',
  'faq.q4': '文件最大可以多大？',
  'faq.a4':
    '50 万条以上消息（50 MB 以上）的聊天在现代手机或电脑上都能流畅处理。很老的手机可能吃不消超大的导出文件。',
  'faq.q5': '支持群聊吗？',
  'faq.a5': '支持，最多 50 人。最活跃的成员会获得聚光灯，其余的人归入“其他人”。',

  // ---- footer
  'footer.tagline': '为好玩而做。你的聊天只属于你。',
  'footer.noTracking': '无追踪器，无 Cookie，无服务器。',

  // ---- loading
  'loading.title': '正在读取你的聊天…',
  'loading.reading': '打开文件',
  'loading.parsing': '读取消息',
  'loading.computing': '疯狂计算中',
  'loading.local': '这一切都在你的设备上完成。',

  // ---- setup (after parsing)
  'setup.title': '准备就绪！',
  'setup.messages': '{n} 条消息',
  'setup.people': '{n} 位成员',
  'setup.range': '选择哪个时间段？',
  'setup.generate': '生成我的年度总结',
  'setup.pickChat': '你的导出文件里有多个聊天，选一个吧：',
  'setup.chatMessages': '{n} 条消息',
  'setup.another': '换个文件',
  'setup.andMore': '还有 {n} 个',

  // ---- errors
  'error.title': '呃，出了点问题',
  'error.empty': '这个文件是空的，请重新导出聊天。',
  'error.unrecognized':
    '无法识别这个文件。请上传 WhatsApp 导出文件（.txt 或 .zip）或 Telegram 的 result.json。',
  'error.telegram_html':
    '这看起来是 Telegram 的 HTML 导出。请在 Telegram Desktop 中重新导出，将格式设为“机器可读的 JSON”，然后上传 result.json。',
  'error.zip_no_chat':
    '这个 ZIP 里没有聊天文件。请找 _chat.txt（WhatsApp）或 result.json（Telegram）。',
  'error.corrupted_json': '这个 JSON 文件似乎不完整或已损坏，请重新导出聊天。',
  'error.corrupted_zip': '这个 ZIP 文件似乎已损坏，请重新导出聊天。',
  'error.no_messages': '这个时间段内没有找到消息。试试更长的时间范围或换个聊天。',
  'error.too_large': '这个文件太大，设备内存不够用。试试只导出一个聊天，并且不附加媒体。',
  'error.unknown': '发生了意外错误。请重试，或换一个导出文件。',
  'error.retry': '换个文件试试',
  'error.reload': '重新加载页面',

  // ---- privacy page
  'privacyPage.title': '隐私说明，简单明了',
  'privacyPage.lead': '简单来说：你的聊天记录从不离开你的设备。具体是这样的：',
  'privacyPage.h1': '什么都不上传',
  'privacyPage.p1':
    '选择文件后，你的浏览器会直接读取它。分析就在你手机或电脑上的这个网页里运行。没有服务器接收你的聊天记录，因为根本就没有服务器：整个网站只是一些静态文件。',
  'privacyPage.h2': '由浏览器强制执行',
  'privacyPage.p2':
    "页面自带严格的内容安全策略（CSP），会拦截所有网络请求（connect-src 'none'）。就算有人想这么做，代码也无法把你的聊天发送到任何地方。",
  'privacyPage.h3': '没有追踪',
  'privacyPage.p3':
    '没有统计分析，没有 Cookie，没有广告，没有第三方脚本或字体。我们只会在浏览器的本地存储中记住你选择的语言和主题。',
  'privacyPage.h4': '你的图片，你做主',
  'privacyPage.p4':
    '保存的图片在你的设备上生成。如果想保护名字隐私，分享前请先开启“隐藏名字”。除非你自己分享，否则什么都不会被分享。',
  'privacyPage.h5': '关闭标签页，一切清空',
  'privacyPage.p5': '你的聊天记录只存在于这个标签页的内存中。关闭或刷新页面，就全部消失了。',
}

export const zhAwards: AwardTexts = {
  'midnight-philosopher': {
    title: '午夜哲学家',
    description: '凌晨 0 点到 5 点发了 {count} 条消息。深刻的思想需要深沉的夜色。',
  },
  'voice-note-villain': {
    title: '语音轰炸机',
    description: '{count} 条语音消息。播客什么时候上线？',
  },
  'seen-at': {
    title: '已读，下午 2:14',
    description: '回复时间中位数：{duration}。好饭不怕晚。',
  },
  'speed-demon': {
    title: '秒回狂魔',
    description: '回复只需 {duration}（中位数）。大拇指还好吗？',
  },
  'essay-writer': {
    title: '小作文选手',
    description: '平均每条消息 {count} 个词。第二章什么时候更新？',
  },
  'hype-machine': {
    title: '气氛组组长',
    description: '{count} 个感叹号和表情。能量拉满！！！',
  },
  'ghost-mode': {
    title: '隐身模式',
    description: '有一次消失了 {duration} 才回复。细思极恐。',
  },
  'conversation-starter': {
    title: '话题发起人',
    description: '{pct} 的对话由 TA 开启。本群人形闹钟。',
  },
  'topic-killer': {
    title: '话题终结者',
    description: '{count} 次说完最后一句就冷场了。麦克风一扔，全场安静。',
  },
  'chief-laughing-officer': {
    title: '首席哈哈官',
    description: '记录在案的笑声 {count} 次。史上最佳观众。',
  },
  'sticker-mafia': {
    title: '表情包黑帮',
    description: '甩出了 {count} 张贴纸。文字什么的，不重要。',
  },
  'question-detective': {
    title: '十万个为什么',
    description: '提了 {count} 个问题。好奇心：已满格。',
  },
  'sorry-champion': {
    title: '道歉冠军',
    description: '说了 {count} 次对不起。估计有些时候根本不用道歉。',
  },
  'gratitude-guru': {
    title: '感恩大师',
    description: '说了 {count} 次谢谢。礼貌值：满分。',
  },
  'love-letter': {
    title: '情书专业户',
    description: '说了 {count} 次“爱你”。温馨指数：爆表。',
  },
  'certified-ok': {
    title: '认证“好的”侠',
    description: '说了 {count} 次“ok”。高效。神秘。好的。',
  },
  'triple-texter': {
    title: '连发三条侠',
    description: '{count} 次连发 3 条以上。一句话为什么要说一遍？',
  },
  'early-bird': {
    title: '早起的鸟儿',
    description: '早上 5 点到 9 点发了 {count} 条消息。咖啡？先聊天再说。',
  },
  'weekend-warrior': {
    title: '周末战士',
    description: '{pct} 的消息发在周末。周六的主角就是 TA。',
  },
  'emoji-artist': {
    title: '表情艺术家',
    description: '用了 {count} 种不同的表情。真正的视觉叙事大师。',
  },
  paparazzi: {
    title: '狗仔队',
    description: '分享了 {count} 张照片和视频。无图无真相。',
  },
  'master-of-brevity': {
    title: '惜字如金大师',
    description: '每条消息只有 {count} 个词。字多费电。',
  },
  'main-character': {
    title: '主角光环',
    description: '发了全部消息的 {pct}。这个聊天就是 TA 的个人秀。',
  },
  'undo-button': {
    title: '撤回大师',
    description: '撤回了 {count} 条消息。真相永远成谜…',
  },
  icebreaker: {
    title: '破冰者',
    description: '打破了最长的沉默（{duration}）。真正的英雄。',
  },
  'office-hours-hero': {
    title: '上班摸鱼达人',
    description: '工作日朝九晚五发了 {count} 条消息。在认真工作，对吧？',
  },
  'walking-dictionary': {
    title: '行走的词典',
    description: '用了 {count} 个不同的词。词汇量秀一波。',
  },
  'caps-lock': {
    title: '大写锁定爱好者',
    description: '{count} 条全大写消息。听到了，听到了！',
  },
  'link-librarian': {
    title: '链接图书管理员',
    description: '分享了 {count} 个链接。全员家庭作业。',
  },
  'reply-master': {
    title: '引用回复大师',
    description: '引用回复了 {count} 次。上下文就是一切。',
  },
  'forwarding-department': {
    title: '转发部部长',
    description: '转发了 {count} 条消息。本群专属新闻推送。',
  },
  'loyal-regular': {
    title: '忠实老友',
    description: '{count} 条消息，稳定又温暖的存在。少了 TA，这个聊天就不一样了。',
  },
  'quiet-legend': {
    title: '低调传说',
    description: '话不多，但这 {count} 条消息条条是金句。',
  },
  'prime-time': {
    title: '黄金时段选手',
    description: '{hour}:00 左右最活跃。请对表。',
  },
}
