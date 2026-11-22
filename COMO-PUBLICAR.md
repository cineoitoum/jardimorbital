# Como publicar o Jardim Orbital no serrate.com.br

O jogo é um arquivo só, `jardim-orbital/index.html`, mais a imagem de capa. Ele precisa ficar numa pasta do site, e a página "Outros projetos" linka para ele.

## 1. Subir a pasta `jardim-orbital`

O WordPress **não aceita arquivos .html na Biblioteca de Mídia**, então a pasta vai direto para os arquivos do site. Escolha um caminho:

**A. Pelo painel da hospedagem (mais limpo)**
1. Entre no painel da empresa onde o site está hospedado (cPanel, hPanel, Plesk…). Não é o `/blues`, é o painel da hospedagem.
2. Abra o **Gerenciador de Arquivos** e entre em `public_html` (a pasta onde estão `wp-admin`, `wp-content` etc.).
3. Envie a pasta `jardim-orbital` inteira (ou envie o zip e use "Extrair").

**B. Só com o painel do WordPress (`serrate.com.br/blues`)**
1. Plugins › Adicionar novo › procure **WP File Manager** › Instalar › Ativar.
2. No menu lateral, abra **WP File Manager**. A pasta raiz do site aparece aberta.
3. Arraste a pasta `jardim-orbital` para lá (ou envie o zip e clique com o botão direito › Extrair).
4. Depois de publicar, **desative o plugin** (Plugins › Desativar). Plugins de arquivos são alvo comum de ataques; deixe-o desligado e só ative quando precisar.

**C. Por FTP**, com os dados de acesso da hospedagem, enviando a pasta para `public_html`.

Para conferir, abra **https://www.serrate.com.br/jardim-orbital/**. O menu do jogo deve aparecer.

## 2. Criar a página "Outros projetos"

1. No WordPress: Páginas › Adicionar nova › título **Outros projetos**.
2. Confira se o endereço (slug) ficou `outros-projetos`. O botão "Voltar ao site" do jogo leva para **https://www.serrate.com.br/outros-projetos/**.
3. Adicione um bloco **HTML personalizado** e cole o conteúdo de `cartao-outros-projetos.html`.
4. Publique e coloque a página no menu do site (Aparência › Menus, ou Aparência › Editor › Navegação nos temas de blocos).

## 3. Arte

A pasta `arte/` tem imagens renderizadas pelo próprio jogo para usar no site e nas redes:
- `banner-1920x1080.jpg`: o planeta do Desejo com o anel, para topo de página;
- `capa-1200x630.jpg`: a mesma cena no formato de link compartilhado;
- `buraco-negro-1080.jpg` e `luz-1080.jpg`: quadradas, para feed;
- `praia-1080x1920.jpg`: vertical, para stories.

## Bom saber

- A experiência usa **WebGPU**: funciona no **Chrome ou Edge de computador**, no **Chrome do Android** atualizado e no **Safari do iPhone com iOS 26 ou mais novo**. Onde não há WebGPU (Firefox, celulares antigos) aparece um aviso com o botão de voltar ao site.
- No celular o jogo detecta a tela de toque e mostra os controles sozinho: polegar à esquerda para andar, arrastar à direita para olhar, e botões para voar, pular, cordão e respirar.
- Não use `iframe` para embutir o jogo numa página: a captura do mouse e a tela cheia podem não funcionar dentro de um iframe. O cartão linka para a página do jogo.
- Para atualizar o jogo no futuro, basta substituir o `index.html` dentro da pasta.
