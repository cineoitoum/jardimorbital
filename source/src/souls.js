// ============================================================================
// what the souls say: a library of lines per kind of soul, plus generators that recombine fragments
// ============================================================================
// Kinds:
//   0 desencarnado  recently left a body: memories, confusion, tenderness
//   1 nunca-nascido never had a body: curious about senses, weight, time
//   2 devoto        had an earthly faith: prayers, doubts, gratitude (any tradition)
//   3 sábio         short aphorisms
//   4 silencioso    almost nothing
//   5 estranho      riddles and odd remarks
//   6 melancólico   longing, regret
//   7 antigo        older than the planets, speaks of stars and ages
const SOUL_KINDS = ['desencarnado', 'nunca-nascido', 'devoto', 'sábio', 'silencioso', 'estranho', 'melancólico', 'antigo'];
const SOUL_WEIGHTS = [16, 12, 12, 12, 14, 12, 10, 8];

const SOUL_LINES = [
  // 0 desencarnado
  [
    'Ainda sinto o peso das mãos. Mesmo sem mãos.',
    'Eu estava lavando a louça. Depois, isso.',
    'Alguém ficou me chamando pelo nome por muito tempo. Depois parou.',
    'Você também acabou de chegar? Ninguém explica nada aqui.',
    'Eu tinha um cachorro. Acho que ele sabia antes de mim.',
    'Me disseram que era como dormir. Não é. É como acordar devagar.',
    'Lembro do cheiro de café. Só do cheiro. O resto foi embora.',
    'Não doeu. Isso foi o mais estranho.',
    'Será que deixei a porta aberta?',
    'Eu achava que ia ver um túnel. Vi isso aqui.',
    'Minha filha tem os meus olhos. Eles continuam lá, com ela.',
    'Tanta pressa a vida inteira. Para quê, mesmo?',
    'Ainda tento respirar fundo. Por costume.',
    'Fiquei um tempo perto do meu corpo. Depois achei que era falta de educação.',
    'A última coisa que ouvi foi uma música no rádio. Não lembro qual. Isso me incomoda.',
    'Você vê meu rosto? Eu não lembro mais do meu rosto.',
    'Eu tinha tanto medo disso. Agora só tenho curiosidade.',
    'Quantos anos eu tinha? Parece que não importa mais.',
    'Ficou um livro na mesa de cabeceira. Marcado na página 112.',
    'Pedi desculpas a todo mundo, menos a uma pessoa. Penso nela daqui.',
    'O corpo era uma casa alugada. Eu só não sabia que o contrato acabava.',
    'Sinto falta de sentir frio. Dá para acreditar?',
    'Não estou perdido. Só ainda não decidi para onde ir.',
    'Me chamavam de "seu" alguma coisa. Seu Antônio? Seu Arlindo? Esqueci.',
    'Aqui o tempo não passa. Ele flutua, como nós.',
    'Vi minha casa pequena lá de cima. Era tão pequena.',
    'Ninguém me avisou que a gente continua pensando.',
    'Se você vir alguém chorando por mim, diga que estou bem. Acho.',
  ],
  // 1 nunca-nascido
  [
    'Como é ter um corpo? Ele aperta?',
    'Dizem que vocês sentem o gosto das coisas. Que privilégio estranho.',
    'Eu nunca tive um nome. Você quer me dar um?',
    'Vocês dormem toda noite? Por escolha?',
    'Quase fui. Três vezes. Sempre desisti na porta.',
    'O que é cansaço? Explicaram, mas não entendi.',
    'Vi vocês de longe. Andam tanto. Para onde vão?',
    'Me contaram sobre a chuva. Gostaria de ser molhado uma vez.',
    'Vocês têm uma coisa chamada "amanhã". É verdade?',
    'Eu sou feito de quase. Quase nasci, quase fui, quase sou.',
    'Ter fome deve ser uma forma de saudade.',
    'Por que vocês fecham os olhos para lembrar?',
    'Eu observo os pés de vocês. Sempre presos ao chão. Que bonito.',
    'Será que eu teria gostado de ter mãos?',
    'Vocês choram com água? Água de dentro?',
    'Nunca fiz aniversário. Hoje pode ser o primeiro?',
    'Vocês têm cheiro. Eu tenho só vontade.',
    'Um dia vou tentar. Dizem que a primeira respiração dói.',
    'Me ensina a palavra para quando algo acaba e a gente sorri.',
    'Sou anterior a qualquer coisa que eu possa lembrar.',
    'O que vocês chamam de "casa"? Um lugar ou uma pessoa?',
    'Gostei do seu jeito de flutuar. Parece alguém que já caiu muito.',
    'Você tem uma voz? Eu tenho só esta letra.',
  ],
  // 2 devoto
  [
    'Rezei a vida inteira por um céu. Não esperava que ele fosse tão silencioso.',
    'Minha avó acendia velas para os santos. Acho que uma delas ainda está acesa para mim.',
    'Fui monge por quarenta anos. Ainda conto as respirações, por hábito.',
    'Om. Desculpe. É o que sobrou.',
    'Prometeram um jardim. Este é um jardim. Só é maior do que eu pensava.',
    'Eu sempre soube que havia algo. Só não sabia que era tão calmo.',
    'Jejuei, orei, perdoei. Ainda não sei se fiz certo. Mas fiz.',
    'Meu terço ficou no bolso do vestido. Rezo com os dedos que não tenho.',
    'Que a paz esteja com você. Aqui ela está em todo lugar.',
    'No terreiro me ensinaram que os ancestrais estão sempre por perto. Estavam.',
    'Li o livro sagrado inteiro sete vezes. A oitava estou lendo agora, nas estrelas.',
    'Deus é grande. E o espaço também. Talvez seja a mesma frase.',
    'Eu cantava no coral. Aqui ainda canto, só que sem som.',
    'Peregrinei a pé até o santuário. Este caminho é mais longo e mais leve.',
    'Acendi incenso por cada pessoa que perdi. Agora vejo a fumaça subir até aqui.',
    'Não encontrei quem eu procurava. Encontrei a mesma pergunta, mais bonita.',
    'Shalom. Ainda gosto da palavra. Ela cabe em qualquer lugar.',
    'Me ensinaram a temer. Estou desaprendendo.',
    'Iemanjá cuidava de nós no mar. Este mar aqui também é dela, eu acho.',
    'Bati o sino do templo toda manhã. Aqui o silêncio toca sozinho.',
    'Pedi um sinal a vida inteira. Talvez o sinal fosse a própria pergunta.',
    'Ajoelhar não faz sentido sem chão. Então só agradeço.',
    'Cada religião era uma janela. Daqui dá para ver a casa inteira.',
    'Minha fé era uma vela. Aqui todas as velas são estrelas.',
    'Amém. Ou assim seja. Ou que seja. Tanto faz, a intenção é a mesma.',
  ],
  // 3 sábio
  [
    'O que pesa não é o corpo. É o que você carrega nele.',
    'Toda órbita é uma queda que nunca termina.',
    'Quem anda devagar vê o chão inteiro.',
    'Você não está perdido. Está entre dois lugares, como todos.',
    'A gravidade é só o universo pedindo que você fique um pouco.',
    'Não procure o centro. Você é o centro de alguma coisa.',
    'A pressa é o medo correndo.',
    'Tudo que brilha queima alguma coisa por dentro.',
    'O silêncio não é ausência. É espaço para o resto chegar.',
    'Quem perdoa fica mais leve. Aqui isso é literal.',
    'Escute a música deste lugar. Cada planeta tem o seu humor.',
    'Ir longe é fácil. Difícil é voltar diferente.',
    'A luz que você vê já partiu há muito tempo. Assim também são as lembranças.',
    'Não há escuridão que resista a quem acende a si mesmo.',
    'Pergunte menos o porquê. Pergunte mais o para quem.',
    'O caminho também é o lugar.',
    'Freie antes de querer parar. A inércia não escuta desculpas.',
    'Você é feito do mesmo pó destas rochas. Só aprendeu a andar.',
    'Toda despedida é uma órbita mais larga.',
    'O que você procura também está procurando você. Só anda mais devagar.',
    'Os planetas pesados ensinam paciência. Os leves ensinam humildade.',
    'Nada se perde. Muda de órbita.',
    'Seja gentil com quem flutua. Ninguém aqui escolheu tudo.',
  ],
  // 4 silencioso
  ['...', '…', '. . .', '…hm.', '—', '...ah.', '(silêncio)', '…', '...sim.', '...não.', '…talvez.', '...', '(olha para você por muito tempo)', '...shh.', '…você.', '(sorri, ou parece)', '...ainda não.', '…'],
  // 5 estranho
  [
    'Você trouxe o que eu pedi? Não? Então ainda não é você.',
    'Eu conto as estrelas de trás para frente. Estou no três.',
    'O que é redondo, flutua e esqueceu o próprio nome? Eu. E você também, talvez.',
    'Esta rocha me deve dinheiro.',
    'Já fui uma chaleira. Não pergunte.',
    'Se você virar ao contrário, o céu vira chão. Experimente.',
    'Tem um planeta aqui que canta quando ninguém olha.',
    'Eu guardo um segredo tão bom que esqueci qual era.',
    'Você é real ou é mais um sonho meu? Responda rápido.',
    'Os cristais conversam à noite. Falam mal dos cometas.',
    'Troquei minha sombra por um eco. Me arrependo às terças.',
    'Que dia é hoje? Responda em cores.',
    'Siga a terceira estrela à esquerda. Ou à direita. Elas mudam de lugar quando ninguém vê.',
    'Eu cheguei aqui ontem. Ontem ainda não aconteceu.',
    'Há uma porta em algum planeta. Não abra. Ou abra. Eu não sou sua mãe.',
    'Escuta. Escutou? Pois é.',
    'Cuidado com as rochas que flutuam. Elas estão fugindo de alguma coisa.',
    'Já te vi antes. Você estava de costas e era outra pessoa.',
    'Eu falo ao contrário. .ossi omoc missA',
    'O vazio tem um gosto. Lembra muito pera.',
    'Sou o fantasma de uma ideia que ninguém teve.',
    'Aquela nebulosa ali é minha. Estou cuidando dela para um amigo.',
  ],
  // 6 melancólico
  [
    'Eu deveria ter ligado mais vezes.',
    'Tudo o que eu queria era mais um domingo.',
    'Guardei tanta coisa para depois. Depois chegou primeiro.',
    'Às vezes passo perto do planeta verde só para lembrar de um quintal.',
    'Amei alguém em silêncio a vida toda. Continuo em silêncio aqui.',
    'O pior não é ir. É perceber que o mundo continua sem você.',
    'Tinha uma janela no meu quarto. Eu nunca olhava por ela.',
    'Quantas vezes eu disse "outro dia"?',
    'Me sinto como uma carta que ninguém abriu.',
    'Ainda escuto risadas que não são para mim.',
    'Não tenho para onde voltar. Então giro.',
    'A saudade aqui não pesa. Ela só não vai embora.',
    'Fui feliz e não percebi. Agora percebo e não sou.',
    'Se você ainda tem alguém, abrace. Abrace mais demorado.',
    'Daqui vejo todas as luzes. Nenhuma é a da minha casa.',
    'Deixei um bilhete inacabado. Só a primeira palavra: "Querida".',
    'Esperei tanto pelo momento certo que o momento foi embora sozinho.',
    'Às vezes desejo um corpo só para poder me sentar.',
    'Ninguém me esqueceu ainda. Isso dói de um jeito bom.',
  ],
  // 7 antigo
  [
    'Vi esta estrela nascer. Ela era menor e mais barulhenta.',
    'Antes destes planetas havia só poeira e vontade.',
    'Já fui chamado de deus por um povo que já não existe. Era um título exagerado.',
    'Conto o tempo em nebulosas. Esta é a quarta que eu vejo se desfazer.',
    'Os mundos crescem como frutas. Depois caem, devagar.',
    'Vocês são jovens. Ainda acham que o fim é uma linha. É um círculo.',
    'Lembro quando a luz era nova e não sabia para onde ir.',
    'Toda a matéria que você toca já foi estrela. Seja respeitoso.',
    'Muitos passaram por aqui. Poucos olharam para cima.',
    'Já esqueci mais idiomas do que existem hoje.',
    'O universo respira. Uma inspiração dura alguns bilhões de anos.',
    'Este sistema tem nome. Não é o que vocês deram.',
    'Vi civilizações inteiras aprenderem a cantar e esquecerem a canção.',
    'Não sou velho. Sou anterior à ideia de velhice.',
    'As galáxias se abraçam muito devagar. Leva eras. Vale a pena.',
    'Você brilha um pouco quando acelera. Os primeiros também brilhavam.',
    'Um dia esta estrela vai engolir estes mundos. E ainda assim, flores agora.',
    'Eu estava aqui quando o primeiro de vocês sonhou com o céu.',
  ],
];

// fragments for generated lines, so the same soul rarely repeats itself
const SOUL_GEN = {
  0: [
    ['Ainda lembro ', ['do barulho da chuva no telhado', 'da voz da minha mãe me chamando para jantar', 'de uma bicicleta azul', 'do primeiro beijo, atrás da escola', 'de uma praia vazia em julho', 'do cheiro de pão na esquina', 'de uma música que meu pai assobiava', 'das mãos da minha avó fazendo crochê', 'de um ônibus lotado às seis da tarde', 'do barulho do mar à noite'], ['. Só disso.', '. Engraçado o que fica.', '. O resto virou névoa.', '. Você lembra de alguma coisa assim?', '.']],
    ['Eu morava ', ['perto de um rio', 'num prédio de muitos andares', 'numa cidade pequena', 'no alto de um morro', 'numa casa amarela', 'longe de todo mundo', 'com três gatos'], [' e nunca achei que fosse sentir falta.', '. Agora moro em lugar nenhum.', '. Será que alguém mora lá agora?', '.']],
  ],
  1: [
    ['Como é ', ['o frio', 'a fome', 'o sono', 'o abraço', 'o cansaço', 'o gosto do sal', 'o vento no rosto', 'a dor de cabeça', 'o riso'], ['? Me descreva sem usar palavras.', '? Dizem que é bom. Ou ruim. Ninguém concorda.', '? Eu só conheço pelo nome.', '?']],
  ],
  3: [
    ['', ['Quem', 'Aquele que', 'Toda alma que'], [' ', ' '], ['carrega luz', 'anda devagar', 'aprende a cair', 'escuta o silêncio', 'olha para trás', 'perdoa', 'não teme a escuridão'], [' ', ' '], ['nunca está sozinho.', 'encontra o caminho de volta.', 'flutua mais alto.', 'acaba virando estrela.', 'entende os planetas.', 'chega antes, mesmo chegando depois.']],
  ],
  5: [
    ['', ['Eu já fui', 'Acho que sou', 'Ontem eu era', 'Amanhã serei'], [' '], ['uma pedra', 'uma vírgula', 'um guarda-chuva esquecido', 'o eco de um espirro', 'uma meia sem par', 'o número sete', 'uma porta giratória', 'um sonho de peixe'], ['. ', '. '], ['Não conte para ninguém.', 'Foi melhor assim.', 'Ainda tenho saudade.', 'Faz sentido, se você não pensar.', 'Você também, aposto.']],
  ],
  6: [
    ['Se eu pudesse voltar ', ['um dia', 'uma hora', 'um minuto', 'um segundo'], [', ', ', '], ['diria obrigado', 'ficaria mais um pouco', 'abriria a janela', 'pediria desculpas', 'ligaria para ela', 'não teria pressa', 'dançaria na cozinha'], ['.', '. Só isso.', '. Seria o bastante.']],
  ],
};
const pickOf = (a) => a[rnd() * a.length | 0];
function soulKind() {
  let t = rnd() * SOUL_WEIGHTS.reduce((a, b) => a + b, 0);
  for (let i = 0; i < SOUL_WEIGHTS.length; i++) if ((t -= SOUL_WEIGHTS[i]) < 0) return i;
  return 0;
}
// a line for a soul of kind k; `said` keeps what this soul already said, so it does not repeat itself
function soulLine(k, said) {
  for (let tries = 0; tries < 12; tries++) {
    let s;
    const gen = SOUL_GEN[k];
    if (gen && rnd() < 0.35) s = pickOf(gen).map((part) => (typeof part === 'string' ? part : pickOf(part))).join('');
    else s = pickOf(SOUL_LINES[k]);
    if (!said.has(s) || k === 4) { said.add(s); return s; }
  }
  return pickOf(SOUL_LINES[4]);
}

// ---------------------------------------------------------------- thoughts inside the black hole
// the traveller's own thoughts: some confused, some wise, some absurd; shown one at a time, far apart
const THOUGHTS = {
  confuso: [
    'Espera. Eu estou caindo ou o resto está subindo?',
    'Quanto tempo faz? Um minuto? Um século? As duas respostas parecem certas.',
    'Acho que acabei de me lembrar de algo que ainda não aconteceu.',
    'Minha mão parece longe. Mais longe do que deveria estar.',
    'Se eu pensar no meu nome agora, ele ainda vai ser o mesmo?',
    'Eu vi isso antes. Não. Eu vou ver isso depois.',
    'Tem alguém pensando estes pensamentos comigo?',
    'Por que tudo tem cheiro de chuva?',
    'Estou indo para dentro ou para dentro de mim?',
    'Esqueci como se esquece.',
    'Se a luz não sai daqui, de onde vem o que estou vendo?',
    'Contei até dez. Cheguei no três duas vezes.',
    'O silêncio aqui tem eco.',
    'Talvez eu já tenha saído e isso seja a lembrança.',
  ],
  sabio: [
    'Tudo que eu temia cabe num ponto menor que um grão.',
    'Se nada escapa daqui, então também nada se perde.',
    'Eu sempre quis parar o tempo. Parece que era só ficar quieto.',
    'Não sou eu que atravesso. É o universo que me atravessa.',
    'Cada coisa que eu perdi continua em algum lugar, girando.',
    'Talvez o sentido não seja chegar. Seja ter sido levado.',
    'Quanto mais perto do centro, mais leve fica a pergunta.',
    'Somos poeira que aprendeu a se perguntar de onde veio.',
    'O medo é só a gravidade do que eu ainda não entendi.',
    'Nenhum caminho é reto quando o espaço se curva.',
    'Se eu sair do outro lado, quero lembrar de olhar para cima mais vezes.',
    'A vida inteira eu corri do escuro. Ele era só um lugar.',
    'Há um tipo de paz que só existe quando não há escolha.',
    'Tudo o que eu fui ainda está brilhando na borda, para quem vê de fora.',
  ],
  absurdo: [
    'Eu deixei uma panela no fogo em algum planeta.',
    'Será que buracos negros têm buracos brancos de estimação?',
    'Se eu espaguetificar, quero ser do tipo integral.',
    'Ninguém vai acreditar quando eu contar. Principalmente eu.',
    'Isso conta como viagem internacional?',
    'Imagina pagar aluguel aqui.',
    'Pelo menos não tem fila.',
    'Se eu gritar, o grito chega antes ou depois de mim?',
    'Eu deveria ter trazido um casaco. Ou um corpo diferente.',
    'Talvez do outro lado seja só segunda-feira.',
  ],
  vazio: ['...', '…', 'respira.', 'aqui.', 'agora.', 'ainda.'],
};
const THOUGHT_KINDS = ['confuso', 'sabio', 'absurdo', 'vazio'];
function thoughtSequence(n) {
  const out = [], pools = THOUGHT_KINDS.map((k) => THOUGHTS[k].slice());
  for (let i = 0; i < n; i++) {
    // it starts confused, grows wiser towards the end
    const f = i / max(n - 1, 1), w = [1.2 - f, 0.3 + f * 1.4, 0.45, 0.35];
    let t = rnd() * w.reduce((a, b) => a + b, 0), k = 0;
    while ((t -= w[k]) > 0 && k < 3) k++;
    const pool = pools[k].length ? pools[k] : pools[1];
    out.push(pool.splice(rnd() * pool.length | 0, 1)[0]);
  }
  return out;
}
