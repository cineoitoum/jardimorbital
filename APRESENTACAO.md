# Jardim Orbital

*Uma experiência extracorpórea imersiva em 360°*

Você não tem corpo. Não lembra o próprio nome. Flutua, como um ponto de luz, entre pequenos planetas que parecem guardar alguma coisa sua. Jardim Orbital é um convite para atravessar esse lugar devagar, olhar para todos os lados e lembrar, antes de esquecer.

---

## O que é

Jardim Orbital é uma experiência contemplativa interativa que roda direto no navegador, no limite entre um jogo e uma instalação. Não há pontos, inimigos ou cronômetro. Há gravidade, silêncio, música, vozes e lembranças, e quem conduz o ritmo é você.

A experiência serve para habitar, por alguns minutos ou por uma hora, uma pergunta simples e difícil: o que fica de uma vida quando a identidade se apaga?

## Sinopse

Um viajante desperta sem corpo e sem nome num pequeno sistema de planetas. Aos poucos ele percebe que cada planeta é um sentimento da vida que não consegue lembrar: **Alegria, Desejo, Conquista, Arrependimento e Perda**. O peso de cada sentimento é a gravidade do lugar. Nos planetas leves ele flutua; nos pesados mal consegue sair do chão.

Em cada planeta há um quadrado de luz suspenso sobre o solo. Ao entrar nele, o viajante tem uma visão para dentro: uma cozinha de domingo, uma janela para um mar nunca visto, uma casa erguida com as próprias mãos, uma cabine telefônica acesa na névoa, uma poltrona vazia. São fragmentos de memória, incompletos, que surgem um a um.

Pelo caminho, almas flutuam em órbita ou contemplam a água em silêncio, e falam quando ele se aproxima. Um fio de prata indica a direção da próxima luz. Um buraco negro dobra a realidade e prende quem chega perto demais numa travessia de pensamentos. E, para quem lembrou o bastante, a luz maior se abre num corredor de nuvens que termina diante de um grande mar, onde todas as almas estão juntas, olhando as ondas.

## Propósito

Jardim Orbital nasce de uma curiosidade sobre o que resta quando quase tudo se vai. A aposta do projeto é que não sobram as grandes conquistas, e sim os pequenos fragmentos: o cheiro de pão, um telefone que não tocou, alguém que guardou o último pedaço de bolo. A experiência não oferece respostas; oferece espaço. O ritmo lento, os silêncios longos e até o tédio de ficar parado (que também gera pensamentos) fazem parte da obra.

O percurso vai do isolamento à união: começa com um viajante sozinho entre mundos e termina com uma comunidade de almas diante do mesmo mar. A regra do sol resume a intenção: *é preciso lembrar antes de esquecer*.

As falas das almas e as memórias do viajante nascem de conversas reais da internet, no Reddit, sobre arrependimentos, alegrias pequenas, conquistas que ninguém viu, sonhos adiados e luto. São temas humanos reescritos e tirados de contexto de propósito, para que soem como vozes de qualquer um.

## Uma experiência 360°

Em Jardim Orbital você é o centro da cena. Não há personagem visível nem câmera atrás de você: você é uma orbe de luz que não se vê e que ilumina o que está em volta. Em cada momento é possível olhar para qualquer direção, para cima, para baixo e para trás. Nas visões você vira um ponto imóvel no meio de uma lembrança, livre para observar cada detalhe pelo tempo que quiser. Na praia final, o mar, o céu, as almas e um grande olho entre as nuvens estão ao redor, e não na sua frente.

Daí a ideia de uma experiência extracorpórea: estar presente sem um corpo, olhando para dentro e para fora. A imersão cresce com fones de ouvido, no escuro e em tela cheia. Uma versão para óculos de realidade virtual está em estudo.

## Por dentro

Tudo o que se vê e se ouve é gerado por código, no momento em que a experiência roda. Não há imagens, modelos 3D nem arquivos de som: o projeto inteiro cabe em um único arquivo de cerca de 160 kB.

- **Mundos procedurais.** Os planetas são esculpidos por funções de ruído matemático. Cada sistema nasce de uma semente, e cada visita pode ser um sistema diferente, com outras formas, cores, mares e vegetações.
- **Física de gravidade.** O viajante é atraído pelo planeta mais próximo, e o "chão" vira suavemente quando ele passa de um mundo a outro. O voo, o cordão de prata e o pulo que escapa da órbita respondem a essa física.
- **Renderização em WebGPU**, a nova tecnologia gráfica dos navegadores, escrita diretamente, sem engine: atmosferas, oceanos com ondas, nebulosas, a lente gravitacional do buraco negro e o pós-processamento com brilho e granulação de filme.
- **Música gerada em tempo real.** Cada planeta compõe a própria trilha conforme o seu clima: leve, enigmático ou sinistro. As peças se misturam conforme a distância, e o buraco negro, o corredor de luz e a praia têm paisagens sonoras próprias.
- **Texto.** Um compêndio de memórias e falas, organizado por sentimento, alimenta as visões, as almas e os pensamentos do viajante, sem repetir.

O projeto foi desenvolvido em colaboração com inteligência artificial e parte do Abyssal Garden, um mundo subaquático procedural de código aberto.

## Ficha

- **Criação:** Gustavo Serrate
- **IA:** Claude (Anthropic): programação, shaders, geração procedural, música procedural, falas das almas e pensamentos
- **Baseado em:** Abyssal Garden, de Maksymilian Dendura (licença MIT)
- **Onde:** [www.serrate.com.br/jardim-orbital](https://www.serrate.com.br/jardim-orbital/)
- **Requisitos:** computador com Chrome ou Edge atualizado (WebGPU). Melhor com fones de ouvido, no escuro e em tela cheia.
- **Controles essenciais:** mouse para olhar · WASD para andar · Shift para voar · F para entrar na luz · R para o fio de prata · H mostra todos os comandos

---

## Versão curta (para o cartão e as redes)

**Jardim Orbital: uma experiência extracorpórea imersiva em 360°.**
Sem corpo e sem nome, um viajante atravessa pequenos planetas de gravidade baixa, cada um com um sentimento da vida que ele esqueceu: alegria, desejo, conquista, arrependimento, perda. Quadrados de luz abrem visões, almas falam, um buraco negro dobra a realidade, e no fim há um mar. Tudo gerado por código, ao vivo, no navegador. Para computador, com fones de ouvido e no escuro.
