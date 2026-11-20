// ============================================================================
// the traveller's story: one feeling per planet, told in fragments (he does not remember who he was)
// ============================================================================
// Written from scratch. The recurring human themes behind it came from reading what people share on Reddit
// (AskReddit threads on regrets, happiest small moments, quiet accomplishments, dreams given up, and grief
// communities): people-pleasing, risks not taken, calls not made, ordinary moments that turned out to be the best
// ones, private victories nobody saw, the "adult orphan", numbness, dates that hurt again. No post is quoted.
//
// Each theme has:
//   frag  memory fragments shown inside the vision, one at a time (first person, incomplete)
//   words short words that float beside the objects of the vision
//   soul  lines the souls of that planet sometimes say
//   mood  the planet's music, light and gravity (heavy feelings weigh more)
const FEELINGS = ['alegria', 'desejo', 'conquista', 'arrependimento', 'perda'];
const STORY = {
  alegria: {
    name: 'Alegria', mood: 'leve',
    frag: [
      'Domingo. Alguém cantava errado na cozinha e ninguém corrigia.',
      'O cheiro de pão. Uma mão bagunçando meu cabelo. Não lembro de quem era a mão.',
      'A gente fez um boneco de neve torto e chamou de tio.',
      'Toda vez que cruzávamos a divisa do estado, meu pai freava de leve e perguntava: "sentiu?" Eu sempre sentia.',
      'Havia conchas escondidas na areia. Anos depois eu soube quem escondia.',
      'Um pirulito, um primo, uma tarde inteira sem pressa.',
      'Rimos tanto que esquecemos do que estávamos rindo.',
      'A primeira vez que alguém disse meu nome como se fosse uma coisa boa.',
      'Pés descalços no cimento quente. A mangueira. O arco-íris pequeno que ela fazia.',
      'Eu tinha um desenho preso na geladeira. Um sol com óculos escuros.',
      'Dançamos na sala com a música baixa para não acordar ninguém.',
      'Chuva de verão. Corremos para dentro e depois, de propósito, para fora outra vez.',
      'Alguém guardou o último pedaço de bolo para mim.',
      'O barulho do portão. Era meu avô chegando com laranjas.',
      'Não era um dia especial. Por isso mesmo.',
      'A luz da tarde batia no chão e a gente brincava de não pisar nela.',
      'Eu aprendi a andar de bicicleta e ninguém estava segurando. Fazia tempo que ninguém segurava.',
      'Uma mesa grande, muitas vozes, ninguém escutando ninguém, todo mundo feliz.',
      'Fiquei acordado a noite toda conversando. Não lembro do assunto. Lembro do amanhecer.',
      'O cachorro dormia nos meus pés como se eu fosse um lugar seguro.',
      'Ganhei uma carta escrita à mão. Li tantas vezes que o papel ficou macio.',
      'Ela riu do meu jeito de rir. Depois rimos os dois.',
      'Um piquenique que deu errado. A melhor tarde do ano.',
      'Cantei no carro com os vidros abertos. Desafinado. Inteiro.',
      'Segurei uma criança no colo e ela dormiu. O mundo ficou do tamanho daquele peso.',
      'A primeira manhã de férias. O dia inteiro pela frente.',
      'Eu estava feliz e sabia que estava. Isso é raro.',
      'Alguém me esperava na rodoviária com um cartaz bobo.',
    ],
    words: ['domingo', 'pão', 'riso', 'cozinha', 'quintal', 'verão', 'bolo', 'colo', 'sol', 'vozes', 'laranjas', 'música'],
    soul: ['Você lembra do cheiro de domingo?', 'Ria. Aqui ninguém corrige quem canta errado.', 'O melhor dia foi um dia comum.', 'Alguém guardou um pedaço de bolo para você.', 'Que leve, isso. Que leve.'],
  },
  desejo: {
    name: 'Desejo', mood: 'leve',
    frag: [
      'Eu queria ver o mar. Disse isso tantas vezes que virou piada.',
      'Havia um mapa na parede com alfinetes nos lugares onde eu iria.',
      'Prometi que um dia faria a trilha inteira, de ponta a ponta. Comprei as botas.',
      'Eu queria um aquário enorme. Achava bobo querer. Queria mesmo assim.',
      'Ia aprender piano. As partituras ainda estão em alguma gaveta.',
      'Quis morar numa cidade grande. Troquei pela segurança. Foi sensato. Foi.',
      'Tinha uma mala pronta embaixo da cama. Por anos.',
      'Eu ia escrever um livro. Tinha o título. Só o título.',
      'Queria que alguém me olhasse do jeito que eu olhava o horizonte.',
      'Sonhei em ser veterinário. Desisti porque não aguentaria ver um bicho sofrer.',
      'Juntei moedas num pote para uma viagem. O pote ficou cheio. A viagem ficou para depois.',
      'Quando conseguia algo que queria muito, às vezes perdia a graça. Às vezes não.',
      'Uma casa perto da água. Uma janela grande. Nada mais.',
      'Eu queria ser lembrado por alguma coisa. Ainda não sei por qual.',
      'Desejei voar. Agora flutuo. Não era bem isso, mas é parecido.',
      'Queria aprender a nadar direito antes de ver o mar. Para não ter medo dele.',
      'Guardei uma passagem que nunca usei. Data vencida, destino intacto.',
      'Eu ficava parado na plataforma vendo os trens que não eram meus.',
      'Queria um dia sem relógio. Só um.',
      'Planejei tanto a vida que esqueci de deixar espaço para ela.',
      'Uma barraca, uma fogueira, estrelas demais para contar. Isso eu queria.',
      'Desejar também foi uma forma de estar vivo.',
      'Eu ia ligar e dizer o que sentia. Ensaiei a frase inteira.',
      'Queria ter visto a aurora. Dizem que ela se mexe como cortina.',
    ],
    words: ['mar', 'mapa', 'mala', 'horizonte', 'passagem', 'trilha', 'piano', 'janela', 'amanhã', 'longe', 'barco', 'aurora'],
    soul: ['Ainda dá tempo de querer.', 'O mar que você queria ver está mais perto do que parece.', 'Toda mala pronta é uma oração.', 'Querer também é uma forma de viver.', 'Para onde você ia, mesmo?'],
  },
  conquista: {
    name: 'Conquista', mood: 'enigmatico',
    frag: [
      'Levantei cada parede daquela casa. As costas ainda lembram.',
      'A primeira chave. Fiquei segurando um tempão antes de abrir a porta.',
      'Parei de fumar. Ninguém sabia que eu fumava, então ninguém soube que parei. Contei só para mim.',
      'Ganhei um concurso de perguntas aos dez anos. Minha família ainda conta essa história.',
      'Alguém caiu e eu soube o que fazer. As mãos fizeram sozinhas. Ela voltou a respirar.',
      'Terminei. Demorei o dobro do tempo, mas terminei.',
      'Ninguém aplaudiu. Eu sabia o que tinha custado.',
      'Aprendi a ler tarde. A primeira placa que li sozinho dizia "saída".',
      'Num dia muito ruim, eu fiquei. Só fiquei. Talvez tenha sido a maior coisa que fiz.',
      'Paguei a última parcela e fiquei olhando o papel como se fosse um diploma.',
      'Eu era o primeiro da família a fazer aquilo. Minha mãe chorou na fila.',
      'Construí uma escada com sobras de madeira. Ainda está de pé, dizem.',
      'Corri a prova inteira. Cheguei quase por último. Cheguei.',
      'Fiz um trabalho que ninguém queria fazer, por anos, e fiz bem.',
      'Aprendi a pedir ajuda. Levou a vida inteira.',
      'Ensinei alguém a andar de bicicleta. Soltei a mão e não disse nada.',
      'Plantei uma árvore. Ela ficou mais alta do que eu muito antes de eu perceber.',
      'Disse "não" uma vez, na hora certa, e minha vida mudou de direção.',
      'Guardei uma medalha numa caixa de sapato. Às vezes abria a caixa só para lembrar que tinha conseguido.',
      'Consertei algo que todo mundo achava perdido.',
      'Saí de um lugar que me fazia mal. Ninguém viu a coragem que isso deu.',
      'Fui gentil num dia em que ninguém foi comigo. Isso também conta.',
      'Subi até o topo e não tinha vista nenhuma. Neblina. Fiquei feliz mesmo assim.',
    ],
    words: ['chave', 'paredes', 'escada', 'medalha', 'mãos', 'tijolo', 'portão', 'topo', 'fim', 'raiz', 'firme', 'casa'],
    soul: ['Ninguém viu. Mas foi grande.', 'As suas mãos lembram do que fizeram.', 'Ficar, num dia ruim, também é uma vitória.', 'Você terminou. Isso basta.', 'Tem uma casa de pé em algum lugar por sua causa.'],
  },
  arrependimento: {
    name: 'Arrependimento', mood: 'sinistro',
    frag: [
      'O telefone tocou e eu deixei tocar. Depois não tocou mais.',
      'Eu ia ligar no domingo. Teve tantos domingos.',
      'Passei anos tentando agradar pessoas que nem lembravam do meu nome.',
      'Fiquei naquele emprego tempo demais. Cada ano parecia só mais um.',
      'Não fui ao médico porque não era nada. Era alguma coisa.',
      'Deixei a raiva durar mais do que a pessoa.',
      'Uma carta. Escrevi três vezes. Não mandei nenhuma.',
      'Tive medo de parecer bobo e por isso não dancei.',
      'Disse uma coisa cruel numa briga pequena. A briga passou. A frase ficou.',
      'Não fui à formatura. Achei que haveria outras ocasiões.',
      'Me arrependo de ter arriscado. Me arrependo de não ter arriscado. As duas coisas ao mesmo tempo.',
      'Eu sabia que ela estava triste e fingi que não sabia.',
      'Tantas vezes "agora não". Tantas.',
      'Escolhi ter razão em vez de ter paz.',
      'Não aprendi a tocar o piano que estava ali, parado, esperando.',
      'Esqueci um aniversário. Depois esqueci que tinha esquecido.',
      'Fiquei calado quando devia ter falado. Falei quando devia ter ficado calado.',
      'A porta estava aberta e eu achei que estava trancada. Nem tentei.',
      'Guardei a gentileza para depois, como se ela fosse acabar.',
      'O relógio andava e eu achava que ele andava só para os outros.',
      'Eu não pedi desculpas porque esperava que pedissem primeiro.',
      'Vivi muito tempo do jeito que achavam que eu devia viver.',
      'Prometi voltar àquela cidade. Não voltei.',
      'Se eu pudesse dizer uma coisa a mim mesmo, mais novo: pare de pedir licença para existir.',
    ],
    words: ['telefone', 'carta', 'domingo', 'tarde', 'porta', 'relógio', 'silêncio', 'desculpa', 'depois', 'quase', 'gaveta', 'nunca'],
    soul: ['Ainda pesa? Aqui pesa mais. E depois passa.', 'Liga. Mesmo que seja só em pensamento.', 'Todo mundo deixou um telefone tocar.', 'O arrependimento é amor que chegou atrasado.', 'Você pode se perdoar daqui.'],
  },
  perda: {
    name: 'Perda', mood: 'sinistro',
    frag: [
      'A cadeira dele continuou ali. Ninguém sentava. Ninguém tirava.',
      'Eu tinha cinquenta e tantos anos e me senti órfão como uma criança.',
      'O casaco no cabide ainda tinha o cheiro. Depois não tinha mais.',
      'No primeiro dia não senti nada. Achei que tinha algo errado comigo. Era só o corpo me protegendo.',
      'Senti alívio e depois culpa por sentir alívio.',
      'Peguei o telefone para contar uma novidade. Lembrei no meio do número.',
      'O chão some. Não de uma vez. Um pouco por dia.',
      'Nas datas dói de novo, como se fosse a primeira vez.',
      'A voz dela ficou numa mensagem antiga. Eu ouvia escondido.',
      'O cachorro esperou na porta por semanas.',
      'Havia uma xícara que era só dele. Ninguém teve coragem de usar.',
      'Me disseram que o tempo cura. O tempo só ensina a carregar.',
      'Achei uma lista de compras na letra dela. Guardei como quem guarda um poema.',
      'Perdi alguém que nunca chegou a nascer. Ninguém sabe que eu ainda conto os anos.',
      'A casa foi vendida. Passei de carro na frente e não parei.',
      'O mundo continuou. Que ousadia.',
      'Ainda falo com ele quando dirijo sozinho.',
      'Perdi também quem eu era quando estava com ela.',
      'Uma amizade acabou sem briga. Só foi ficando longe. Essa também conta.',
      'A vela ficou acesa até de manhã. Ninguém quis apagar.',
      'A chuva bate na janela do mesmo jeito daquela noite.',
      'Aprendi que o amor não vai embora. Ele só não tem mais para onde ir.',
      'Ficou um lugar vazio na mesa. A gente se espalhou para não ver.',
      'Eu gostaria de ter perguntado mais. Sobre tudo. Sobre a infância dela, sobre o que ela sonhava.',
    ],
    words: ['cadeira', 'casaco', 'chuva', 'xícara', 'vela', 'voz', 'retrato', 'cheiro', 'janela', 'saudade', 'vazio', 'ainda'],
    soul: ['Quem você perdeu não se perdeu de você.', 'O amor fica. Só muda de casa.', 'Pode chorar. Aqui a chuva é sua.', 'Eles estão mais perto do que a saudade deixa ver.', 'A cadeira vazia também é um lugar de encontro.'],
  },
};
// fragments shown so far (the diary), kept between games
const DIARY = (() => { try { return JSON.parse(localStorage.planetasDiario || '{}'); } catch { return {}; } })();
const diaryAdd = (key, line) => { (DIARY[key] ||= []); if (!DIARY[key].includes(line)) { DIARY[key].push(line); try { localStorage.planetasDiario = JSON.stringify(DIARY); } catch {} } };
// the next fragment of a theme that this game has not shown yet
const shownFrag = {};
function nextFragment(f) {
  const all = STORY[f].frag, s = (shownFrag[f] ||= new Set());
  if (s.size >= all.length) s.clear();
  let line; do line = all[rnd() * all.length | 0]; while (s.has(line));
  s.add(line); diaryAdd(f, line);
  return line;
}
