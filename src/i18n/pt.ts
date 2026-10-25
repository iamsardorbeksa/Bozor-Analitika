import type { AwardTexts, Dict } from './en'

/** Brazilian Portuguese. Plurals: "one|other". */
export const pt: Dict = {
  // ---- common
  'common.others': 'Outros ({n})',
  'common.person': 'Pessoa {letter}',
  'common.back': 'Voltar',

  // ---- units (plural)
  'unit.messages': 'mensagem|mensagens',
  'unit.times': '{n} vez|{n} vezes',
  'unit.daysInARow': 'dia seguido|dias seguidos',

  // ---- card chrome
  'card.footer.made': 'Feito com {name}',
  'card.footer.cta': 'Faça o seu → {url}',

  // ---- intro
  'card.intro.titleYear': 'Seu {year} no chat',
  'card.intro.title': 'Sua conversa, em retrospectiva',
  'card.intro.group': '{n} pessoas, uma conversa',
  'card.intro.tap': 'Toque para começar',

  // ---- total
  'card.total.label': '{n} mensagens no total',
  'card.total.kicker': 'Juntos, vocês mandaram',
  'card.total.kickerGroup': 'Este grupo mandou',
  'card.total.words': '{n} palavra|{n} palavras',
  'card.total.days': '{n} dia de papo|{n} dias de papo',
  'card.total.perDay': '≈ {n} mensagens por dia ativo',
  'card.total.busiest': 'O dia mais agitado',
  'card.total.busiestCount': '{n} mensagem nesse dia|{n} mensagens nesse dia',

  // ---- who talks more
  'card.who.kicker': 'Quem fala mais?',
  'card.who.balanced': 'Perfeitamente equilibrado, como tudo deveria ser',
  'card.who.more': '{name} fala pelos cotovelos',
  'card.who.msgs': '{n} msgs',
  'card.who.longer': '{name} escreve mensagens mais longas: {n} palavras em média contra {m}.',
  'card.who.groupTitle': '{name} comanda este chat',

  // ---- peak hour
  'card.peak.kicker': 'Seu horário de pico',
  'card.peak.chartLabel': 'Mensagens por hora do dia',
  'card.peak.day': 'Dia mais movimentado',
  'card.peak.vibe.night': 'Corujas certificadas 🦉',
  'card.peak.vibe.morning': 'Gente da manhã, pelo visto ☀️',
  'card.peak.vibe.lunch': 'Papo na hora do almoço 🥪',
  'card.peak.vibe.afternoon': 'Moleza da tarde? Aqui não 💬',
  'card.peak.vibe.evening': 'A noite é o horário nobre de vocês 🌆',

  // ---- silence / streak
  'card.silence.kicker': 'O maior silêncio',
  'card.silence.between': 'De {from} a {to}',
  'card.silence.broke': '{name} finalmente quebrou o silêncio.',
  'card.streak.kicker': 'Maior sequência',
  'card.streak.active': 'Conversaram em {n} de {m} dias',

  // ---- reply speed
  'card.reply.kicker': 'Velocidade de resposta',
  'card.reply.fastest': '{name} responde mais rápido',
  'card.reply.median': 'tempo médio de resposta',
  'card.reply.slowest': '{name} não tem pressa. Quem espera sempre alcança.',

  // ---- words
  'card.words.kicker': 'Palavras top',
  'card.words.title': 'As palavras favoritas de vocês',
  'card.words.titleGroup': 'As palavras que definem vocês',

  // ---- emoji
  'card.emoji.kicker': 'O emoji da conversa',
  'card.emoji.used': 'vezes usado',

  // ---- laugh
  'card.laugh.kicker': 'Risômetro',
  'card.laugh.total': '{n} risadas a cada 100 mensagens',
  'card.laugh.most': '{name} é quem mais ri',
  'card.laugh.rating.club': 'Clube da comédia 🎤',
  'card.laugh.rating.vibes': 'Só good vibes ✨',
  'card.laugh.rating.smiles': 'Risadinhas discretas 🙂',
  'card.laugh.rating.serious': 'Assunto sério 🧐',

  // ---- awards
  'card.awards.kicker': 'E o prêmio vai para',

  // ---- starter
  'card.starter.kicker': 'Quem manda mensagem primeiro?',
  'card.starter.title': '{name} puxa o assunto',
  'card.starter.of': 'de {n} conversas',
  'card.starter.killer': 'Mata-assunto: {name}',
  'card.starter.double': 'Mais sequências de 3 mensagens: {name}',

  // ---- summary
  'card.summary.kicker': 'Sua conversa, em retrospectiva',
  'card.summary.titleGroup': 'Nosso grupo',
  'card.summary.messages': 'Mensagens',
  'card.summary.days': 'Dias de papo',
  'card.summary.peak': 'Horário de pico',
  'card.summary.streak': 'Melhor sequência',
  'card.summary.emoji': 'Emoji top',
  'card.summary.word': 'Palavra top',
  'card.summary.fastest': 'Resposta mais rápida',
  'card.summary.laughs': 'Risadas',
  'card.summary.duration': 'Uma história de {d}',

  // ---- card titles (accessibility + file names)
  'cardTitle.intro': 'Abertura',
  'cardTitle.total': 'Total de mensagens',
  'cardTitle.who': 'Quem fala mais',
  'cardTitle.peak': 'Horário de pico',
  'cardTitle.silence': 'Maior silêncio e sequência',
  'cardTitle.reply': 'Velocidade de resposta',
  'cardTitle.words': 'Palavras top',
  'cardTitle.emojis': 'Emojis top',
  'cardTitle.laugh': 'Risômetro',
  'cardTitle.awards': 'Prêmios: {names}',
  'cardTitle.starter': 'Quem manda mensagem primeiro',
  'cardTitle.summary': 'Resumo',

  // ---- story viewer
  'story.progress': 'Cards',
  'story.goTo': 'Ir para o card {n}: {title}',
  'story.announce': 'Card {n} de {total}: {title}',
  'story.close': 'Fechar',
  'story.hideNames': 'Ocultar nomes',
  'story.settings': 'Configurações',
  'story.carousel':
    'Sua história Wrapped. Toque no lado direito ou pressione → para ver o próximo card.',
  'story.prev': 'Card anterior',
  'story.next': 'Próximo card',
  'story.recomputing': 'Recalculando…',
  'story.save': 'Salvar imagem',
  'story.share': 'Compartilhar',
  'story.saveAll': 'Todos (ZIP)',
  'story.saving': 'Criando imagem…',
  'story.preparing': 'Preparando…',
  'story.zipping': 'Empacotando os cards…',
  'story.saved': 'Salvo nos seus downloads',
  'story.savedAll': 'Todos os cards salvos em ZIP',
  'story.exportError': 'Não deu para criar a imagem. Tente de novo.',
  'share.text': 'Minha conversa em retrospectiva 🎁 Faça a sua (100% privado): {url}',

  // ---- settings
  'settings.title': 'Configurações',
  'settings.hideNamesHelp':
    'Mostra “Pessoa A / Pessoa B” em vez dos nomes reais em todos os cards.',
  'settings.language': 'Idioma',

  // ---- time range
  'range.label': 'Período',
  'range.all': 'Tudo',
  'range.year': 'Último ano',
  'range.6months': 'Últimos 6 meses',
  'range.30days': 'Últimos 30 dias',

  // ---- date order
  'dates.title': 'Formato de data',
  'dates.current': 'Lendo as datas como {format}.',
  'dates.dmy': 'dia/mês',
  'dates.mdy': 'mês/dia',
  'dates.guess': '(nosso melhor palpite)',
  'dates.wrong': 'Datas estranhas? Use {format}',

  // ---- navigation & theme
  'nav.privacy': 'Privacidade',
  'nav.faq': 'Dúvidas',
  'nav.howto': 'Como exportar',
  'nav.home': 'Início',
  'theme.toLight': 'Mudar para o tema claro',
  'theme.toDark': 'Mudar para o tema escuro',
  'lang.label': 'Idioma',
  'skip.toContent': 'Pular para o conteúdo',

  // ---- hero
  'hero.eyebrow': 'WhatsApp + Telegram',
  'hero.title': 'Sua conversa, em retrospectiva.',
  'hero.subtitle':
    'Transforme qualquer conversa numa história divertida e colorida: quem manda mensagem primeiro, quem dá ghosting, seus emojis top e uns prêmios bem sinceros.',
  'hero.cta': 'Criar meu Wrapped',
  'hero.demo': 'Ver uma demo',
  'privacy.badge': 'Sua conversa nunca sai do seu aparelho',
  'privacy.short': 'Sem upload. Sem servidores. Sem rastreamento. Tudo roda no seu navegador.',

  // ---- upload
  'upload.title': 'Envie sua conversa',
  'upload.tabs': 'Escolha seu app',
  'upload.drop': 'Solte o arquivo da conversa aqui',
  'upload.dropActive': 'Pode soltar!',
  'upload.or': 'ou',
  'upload.button': 'Escolher arquivo',
  'upload.buttonPrivacy': 'Fica no seu aparelho',
  'upload.accepts.whatsapp': 'WhatsApp: exportação .txt ou .zip',
  'upload.accepts.telegram': 'Telegram: exportação result.json',

  // ---- export steps
  'steps.title': 'Como exportar',
  'steps.wa.iphone': 'iPhone',
  'steps.wa.android': 'Android',
  'steps.wa.iphone.1': 'Abra a conversa',
  'steps.wa.iphone.2': 'Toque no nome do contato ou do grupo',
  'steps.wa.iphone.3': 'Role para baixo e toque em Exportar conversa',
  'steps.wa.iphone.4': 'Escolha Sem mídia e salve o arquivo',
  'steps.wa.android.1': 'Abra a conversa',
  'steps.wa.android.2': 'Toque em ⋮ (três pontos)',
  'steps.wa.android.3': 'Toque em Mais → Exportar conversa',
  'steps.wa.android.4': 'Escolha Sem mídia e salve o arquivo',
  'steps.wa.tip': 'Envie o .zip ou o .txt que está dentro dele: os dois funcionam.',
  'steps.tg.desktop': 'Telegram Desktop',
  'steps.tg.note':
    'O app do Telegram no celular não exporta conversas. Use o Telegram Desktop (Windows, macOS ou Linux).',
  'steps.tg.1': 'Abra a conversa no Telegram Desktop',
  'steps.tg.2': 'Clique em ⋮ (três pontos) → Exportar histórico do chat',
  'steps.tg.3': 'Desmarque fotos, vídeos e todas as outras mídias',
  'steps.tg.4': 'Em Formato, escolha “JSON legível por máquina”',
  'steps.tg.5': 'Clique em Exportar e envie o result.json',
  'steps.tg.tip':
    'Exportou a conta inteira? Pode enviar também: a gente deixa você escolher um chat.',

  // ---- demo
  'demo.title': 'Sem conversa à mão? Veja uma demo',
  'demo.whatsapp': 'WhatsApp a dois',
  'demo.telegram': 'Grupo do Telegram',
  'demo.note': 'Conversas de exemplo totalmente fictícias.',
  'demo.banner': 'Modo demo: conversa fictícia',

  // ---- features
  'features.private.title': '100% privado',
  'features.private.text':
    'Seu arquivo é lido pelo seu próprio navegador. Nada é enviado, nunca. Funciona até offline.',
  'features.fast.title': 'Conversa gigante? De boa.',
  'features.fast.text': 'Meio milhão de mensagens em segundos, sem travar seu celular.',
  'features.share.title': 'Feito para stories',
  'features.share.text':
    'Cada card é uma imagem de 1080×1920, pronta para o Instagram, o TikTok ou o grupo.',
  'features.title': 'Por que todo mundo ama',
  'features.langs.title': 'Fala a sua língua',
  'features.langs.text':
    '9 idiomas, incluindo árabe e chinês. Reconhece até as risadas e os “obrigado” em todos eles.',
  'features.groups.title': 'Duplas e grupos',
  'features.groups.text': 'Funciona em conversas a dois e em grupos de até 50 pessoas.',
  'features.free.title': 'Grátis, sem cadastro',
  'features.free.text': 'Sem conta, sem app para instalar. Se quiser, adicione à tela inicial.',

  // ---- "what you'll discover"
  'discover.title': 'O que você vai descobrir',
  'discover.subtitle':
    'A história que a sua conversa vem escrevendo esse tempo todo, em mais de 12 cards para deslizar.',
  'discover.total.title': 'Seu total geral',
  'discover.total.text':
    'Cada mensagem, cada palavra e aquele dia em que ninguém largou o celular.',
  'discover.who.title': 'Quem fala mais',
  'discover.who.text': 'A divisão exata, e quem escreve verdadeiras redações.',
  'discover.rush.title': 'Seu horário de pico',
  'discover.rush.text': 'Corujas ou gente da manhã? A hora e o dia mais agitados de vocês.',
  'discover.streak.title': 'Sua maior sequência',
  'discover.streak.text': 'Quantos dias seguidos a conversa se manteve viva.',
  'discover.silence.title': 'O grande silêncio',
  'discover.silence.text': 'A maior pausa, e quem finalmente quebrou o gelo.',
  'discover.reply.title': 'Velocidade de resposta',
  'discover.reply.text': 'Quem responde em segundos, e quem deixa você no vácuo.',
  'discover.starter.title': 'Quem manda mensagem primeiro',
  'discover.starter.text': 'Quem puxa assunto, e quem sempre fica com a última palavra.',
  'discover.laugh.title': 'Risômetro',
  'discover.laugh.text': 'Cada “kkkk”, “rsrs” e 😂 na conta. Quem é a melhor plateia?',
  'discover.words.title': 'Palavras e emojis top',
  'discover.words.text': 'As palavras e os emojis que definem vocês.',

  // ---- awards showcase
  'showcase.title': 'Ninguém fica sem prêmio',
  'showcase.subtitle':
    '34 títulos divertidos, distribuídos pelo jeito que vocês conversam de verdade. Sempre engraçados, nunca maldosos.',
  'showcase.example': 'Exemplo',

  // ---- use cases
  'uses.title': 'Perfeito para',
  'uses.couples.title': 'Casais',
  'uses.couples.text':
    'Surpresa de aniversário de namoro: a história de amor de vocês, em números.',
  'uses.friends.title': 'Amizades',
  'uses.friends.text': 'Resolvam de uma vez por todas quem responde mais rápido.',
  'uses.family.title': 'Grupos da família',
  'uses.family.text': 'Descubra quem manda mais “bom dia”.',
  'uses.teams.title': 'Equipes e comunidades',
  'uses.teams.text': 'Uma retrospectiva divertida do grupo no fim do ano.',
  'uses.moments.title': 'Grandes momentos',
  'uses.moments.text': 'Aniversários, Ano-Novo, formaturas: o post “nosso ano” já pronto.',

  // ---- closing call to action
  'cta.title': 'Bora ver a sua história?',
  'cta.text': 'Leva mais ou menos um minuto. Sua conversa nunca sai do seu aparelho.',

  // ---- FAQ
  'faq.title': 'Dúvidas',
  'faq.q1': 'É seguro mesmo?',
  'faq.a1':
    'Sim. O app roda inteiro no seu navegador, e a política de segurança dele proíbe qualquer conexão de rede, então sua conversa fisicamente não pode ser enviada para lugar nenhum. Sem contas, sem analytics, sem cookies.',
  'faq.q2': 'Por que alguns números parecem estranhos?',
  'faq.a2':
    'As exportações mudam conforme o celular, o idioma e a versão do app. Se as datas parecerem erradas, use a opção “Datas estranhas?”. As mídias são contadas pelos marcadores da exportação, e os tempos de resposta só contam respostas em até 12 horas.',
  'faq.q3': 'Quais idiomas funcionam?',
  'faq.a3':
    'Qualquer idioma funciona para a contagem. Listas de palavras, risadas e marcadores de mídia são ajustados para inglês, russo, uzbeque, espanhol, turco, português, alemão, francês e árabe.',
  'faq.q4': 'Qual o tamanho máximo do arquivo?',
  'faq.a4':
    'Conversas com mais de 500.000 mensagens (50 MB+) funcionam bem em um celular ou notebook atual. Celulares muito antigos podem sofrer com exportações gigantes.',
  'faq.q5': 'Funciona com grupos?',
  'faq.a5':
    'Sim, até 50 pessoas. Os membros mais ativos ganham destaque e o resto fica agrupado em “Outros”.',

  // ---- footer
  'footer.tagline': 'Feito por diversão. Suas conversas continuam suas.',
  'footer.noTracking': 'Sem rastreadores, sem cookies, sem servidores.',

  // ---- loading
  'loading.title': 'Lendo sua conversa…',
  'loading.reading': 'Abrindo o arquivo',
  'loading.parsing': 'Lendo as mensagens',
  'loading.computing': 'Fazendo as contas',
  'loading.local': 'Tudo isso acontece no seu aparelho.',

  // ---- setup (after parsing)
  'setup.title': 'Tudo pronto!',
  'setup.messages': '{n} mensagem|{n} mensagens',
  'setup.people': '{n} participante|{n} participantes',
  'setup.range': 'Qual período?',
  'setup.generate': 'Gerar meu Wrapped',
  'setup.pickChat': 'Sua exportação tem várias conversas. Escolha uma:',
  'setup.chatMessages': '{n} mensagem|{n} mensagens',
  'setup.another': 'Usar outro arquivo',
  'setup.andMore': '+{n} outros',

  // ---- errors
  'error.title': 'Hmm, não deu certo',
  'error.empty': 'Este arquivo está vazio. Tente exportar a conversa de novo.',
  'error.unrecognized':
    'Não reconhecemos este arquivo. Envie uma exportação do WhatsApp (.txt ou .zip) ou um result.json do Telegram.',
  'error.telegram_html':
    'Parece uma exportação HTML do Telegram. Exporte de novo no Telegram Desktop com o Formato “JSON legível por máquina” e envie o result.json.',
  'error.zip_no_chat':
    'Este ZIP não tem nenhum arquivo de conversa. Procure _chat.txt (WhatsApp) ou result.json (Telegram).',
  'error.corrupted_json':
    'Este arquivo JSON parece incompleto ou corrompido. Tente exportar a conversa de novo.',
  'error.corrupted_zip': 'Este arquivo ZIP parece corrompido. Tente exportar a conversa de novo.',
  'error.no_messages':
    'Não encontramos mensagens neste período. Tente um período maior ou outra conversa.',
  'error.too_large':
    'Este arquivo é grande demais para a memória do seu aparelho. Tente exportar uma única conversa sem mídia.',
  'error.unknown': 'Algo inesperado aconteceu. Tente de novo ou use outra exportação.',
  'error.retry': 'Tentar outro arquivo',
  'error.reload': 'Recarregar a página',

  // ---- privacy page
  'privacyPage.title': 'Privacidade, sem rodeios',
  'privacyPage.lead':
    'Resumindo: sua conversa nunca sai do seu aparelho. Veja o que isso significa.',
  'privacyPage.h1': 'Nada é enviado',
  'privacyPage.p1':
    'Quando você escolhe um arquivo, seu navegador o lê diretamente. A análise roda dentro desta página, no seu celular ou computador. Não existe servidor que receba sua conversa, porque não existe servidor nenhum: o site é só um conjunto de arquivos estáticos.',
  'privacyPage.h2': 'O navegador garante',
  'privacyPage.p2':
    "A página vem com uma Content Security Policy rígida que bloqueia toda requisição de rede (connect-src 'none'). Mesmo que alguém quisesse, o código não conseguiria enviar sua conversa para lugar nenhum.",
  'privacyPage.h3': 'Sem rastreamento',
  'privacyPage.p3':
    'Sem analytics, sem cookies, sem anúncios, sem scripts ou fontes de terceiros. Só guardamos sua escolha de idioma e tema no armazenamento local do seu navegador.',
  'privacyPage.h4': 'Suas imagens, sua escolha',
  'privacyPage.p4':
    'As imagens salvas são criadas no seu aparelho. Use “Ocultar nomes” antes de compartilhar se quiser manter os nomes em sigilo. Nada é compartilhado a não ser que você compartilhe.',
  'privacyPage.h5': 'Fechar a aba apaga tudo',
  'privacyPage.p5':
    'Sua conversa só existe na memória desta aba. Feche ou recarregue a página e ela some.',
}

export const ptAwards: AwardTexts = {
  'midnight-philosopher': {
    title: 'Filosofia da Madrugada',
    description: '{count} mensagens entre meia-noite e 5h. Pensamento profundo pede céu escuro.',
  },
  'voice-note-villain': {
    title: 'A Ameaça dos Áudios',
    description: '{count} mensagens de voz. Quando estreia o podcast?',
  },
  'seen-at': {
    title: 'Visualizado às 14:14',
    description: 'Tempo médio de resposta: {duration}. Quem espera sempre alcança.',
  },
  'speed-demon': {
    title: 'Dedos Supersônicos',
    description: 'Responde em {duration} (mediana). Seus dedos estão bem?',
  },
  'essay-writer': {
    title: 'Mente Ensaísta',
    description: '{count} palavras por mensagem, em média. Cadê o capítulo dois?',
  },
  'hype-machine': {
    title: 'Máquina de Empolgação',
    description: '{count} pontos de exclamação e emojis. Pura energia!!!',
  },
  'ghost-mode': {
    title: 'Modo Fantasma',
    description: 'Uma vez sumiu por {duration} antes de responder. Assustador.',
  },
  'conversation-starter': {
    title: 'Pontapé Inicial',
    description: 'Começou {pct} de todas as conversas. O despertador do chat.',
  },
  'topic-killer': {
    title: 'Mata-Assunto',
    description: 'Deu a última palavra antes de um longo silêncio {count} vezes. Drop the mic.',
  },
  'chief-laughing-officer': {
    title: 'Diretoria de Risadas',
    description: '{count} risadas registradas. Melhor plateia da história.',
  },
  'sticker-mafia': {
    title: 'A Máfia das Figurinhas',
    description: '{count} figurinhas disparadas. Palavras são superestimadas.',
  },
  'question-detective': {
    title: 'Detetive das Interrogações',
    description: 'Fez {count} perguntas. Nível de curiosidade: no máximo.',
  },
  'sorry-champion': {
    title: 'Campeonato do Desculpa',
    description: 'Pediu desculpa {count} vezes. Provavelmente até sem precisar.',
  },
  'gratitude-guru': {
    title: 'Guru da Gratidão',
    description: 'Agradeceu {count} vezes. Educação: impecável.',
  },
  'love-letter': {
    title: 'Carta de Amor',
    description: 'Disse “te amo” {count} vezes. Nível de fofura: crítico.',
  },
  'certified-ok': {
    title: 'OK Certificado',
    description: 'Disse “ok” {count} vezes. Eficiente. Misterioso. Ok.',
  },
  'triple-texter': {
    title: 'Mensagem em Trio',
    description: 'Mandou 3+ mensagens seguidas {count} vezes. Pra que falar uma vez só?',
  },
  'early-bird': {
    title: 'Quem Cedo Madruga',
    description: '{count} mensagens entre 5h e 9h. Café? Primeiro o chat.',
  },
  'weekend-warrior': {
    title: 'Alma do Fim de Semana',
    description: '{pct} das mensagens caem no fim de semana. Protagonismo de sábado.',
  },
  'emoji-artist': {
    title: 'Artista dos Emojis',
    description: 'Usou {count} emojis diferentes. Pura arte visual.',
  },
  paparazzi: {
    title: 'Paparazzi',
    description: 'Compartilhou {count} fotos e vídeos. Sem foto, não aconteceu.',
  },
  'master-of-brevity': {
    title: 'Arte da Brevidade',
    description: 'Só {count} palavras por mensagem. Pra que gastar letra?',
  },
  'main-character': {
    title: 'Protagonista',
    description: 'Mandou {pct} de todas as mensagens. Este chat é o show dessa pessoa.',
  },
  'undo-button': {
    title: 'O Botão de Desfazer',
    description: 'Apagou {count} mensagens. Nunca saberemos…',
  },
  icebreaker: {
    title: 'Quebra-Gelo',
    description: 'Quebrou o maior silêncio ({duration}). Heroísmo puro.',
  },
  'office-hours-hero': {
    title: 'Expediente Animado',
    description: '{count} mensagens em dias úteis, das 9 às 17. Trabalhando muito, né?',
  },
  'walking-dictionary': {
    title: 'Dicionário Ambulante',
    description: 'Usou {count} palavras diferentes. Vocabulário de respeito.',
  },
  'caps-lock': {
    title: 'FÃ DO CAPS LOCK',
    description: '{count} MENSAGENS EM MAIÚSCULAS. A GENTE OUVIU.',
  },
  'link-librarian': {
    title: 'Biblioteca de Links',
    description: 'Compartilhou {count} links. Lição de casa pra todo mundo.',
  },
  'reply-master': {
    title: 'Craque das Respostas',
    description: 'Respondeu citando {count} vezes. Contexto é tudo.',
  },
  'forwarding-department': {
    title: 'Departamento de Encaminhados',
    description: 'Encaminhou {count} mensagens. O jornal particular do chat.',
  },
  'loyal-regular': {
    title: 'Presença Garantida',
    description: '{count} mensagens de presença firme e aconchegante. O chat não seria o mesmo.',
  },
  'quiet-legend': {
    title: 'Lenda Silenciosa',
    description: 'Fala pouco, mas cada uma das {count} mensagens vale ouro.',
  },
  'prime-time': {
    title: 'Horário Nobre',
    description: 'Pico de atividade por volta das {hour}:00. Acerte o relógio.',
  },
}
