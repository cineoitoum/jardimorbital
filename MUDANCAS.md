# Jardim Orbital: o que mudou nesta versão

## Mudanças

**Mensagens de quem chega ao fim**
Um minuto depois de chegar ao mar, abre um painel para o visitante deixar uma mensagem (e um nome, se quiser). O painel avisa que a mensagem é privada: chega só ao autor e não é publicada. Quem fechar o painel pode reabri-lo pelo botão "Deixar uma mensagem" nos créditos. Cada mensagem é gravada num arquivo da pasta do jogo e enviada ao e-mail de administrador do WordPress.

**Respirar (segure B)**
Um som grave, profundo e macio, com um ar que sobe e desce como maré. A tela fica azulada e as bordas pulsam numa luz azul.

**Praia final**
Até 90 almas sentadas, todas ligadas por fios de luz, e 24 flutuando sobre o mar.

**Mouse livre no fim**
Quando os créditos aparecem, o mouse é liberado e o botão "Voltar ao site" passa a funcionar. Para continuar olhando a praia, clique e arraste.

**Menu inicial**
Fundo escuro, título numa fonte serifada fina (Cormorant Garamond) com um brilho suave que respira, textos em Jost e botões escuros com contorno luminoso. A lista de comandos fica logo abaixo, em duas colunas compactas.

**Lista de comandos durante o jogo**
Um painel pequeno no canto inferior esquerdo, com os comandos um sobre o outro. Começa ligado; a tecla H esconde e mostra. Escondido, fica só um lembrete discreto: "H comandos".

**Canto da tela**
Os dados técnicos (velocidade, gravidade, fps) saíram da tela. Fica só a contagem "lembranças N de 5".

## O que fazer para publicar

1. **Subir a pasta.** Envie a pasta `jardim-orbital` inteira do zip para `public_html`, substituindo a anterior. Ela agora tem `index.html`, `jardim-orbital.jpg`, `mensagem.php`, `mensagens.php`, `config.exemplo.php` e a pasta `dados/`. Confira se o arquivo oculto `dados/.htaccess` subiu. Os jeitos de subir (painel da hospedagem, WP File Manager ou FTP) estão em `COMO-PUBLICAR.md`.
2. **Testar o jogo.** Abra https://www.serrate.com.br/jardim-orbital/ no Chrome ou Edge. Se o menu antigo aparecer, recarregue com Ctrl+Shift+R (cache).
3. **Conferir o e-mail de destino.** No WordPress: Configurações › Geral › "Endereço de e-mail da administração". É para lá que as mensagens vão.
4. **Testar uma mensagem.** O caminho mais rápido é jogar até o fim. O servidor descarta em silêncio mensagens de quem jogou menos de 5 minutos, então um teste apressado não chega.
5. **Ler as mensagens.** Logado como administrador, abra https://www.serrate.com.br/jardim-orbital/mensagens.php. Tem um botão para baixar tudo em CSV.
6. **Se o e-mail não chegar.** Instale o plugin WP Mail SMTP, ligue-o a uma conta de e-mail e use o teste de envio do plugin. Enquanto isso as mensagens continuam gravadas e aparecem em `mensagens.php`.
7. **Conferir a privacidade.** Depois da primeira mensagem, abra https://www.serrate.com.br/jardim-orbital/dados/mensagens.jsonl numa janela anônima. Tem de dar "Acesso negado" (403). Se aparecer o texto das mensagens, peça ao suporte da hospedagem para bloquear a pasta `dados/`.
8. **Atualizações futuras.** Troque só o `index.html`. Nunca substitua nem apague a pasta `dados/`: é ela que guarda as mensagens.

## Página "Outros projetos" (portfólio)

O cartão (`cartao-outros-projetos.html`) não muda. Se quiser, acrescente à descrição do projeto:

> No fim da viagem, quem chega ao mar pode deixar uma mensagem. Ela é lida só por mim.

Imagem nova para o portfólio: `arte/menu-inicial-1440x810.jpg` (o menu escuro).

O texto completo de apresentação está em `APRESENTACAO.md`.
