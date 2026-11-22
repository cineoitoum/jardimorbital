# Jardim Orbital: o que mudou nesta versão

## Mudanças

**Removido: mensagens no fim e giroscópio**
O painel de mensagem ao chegar ao mar e o controle por giroscópio no celular saíram. Os créditos ficam com "Começar outra vez" e "Voltar ao site". No celular, para olhar, arraste o dedo no lado direito da tela.

**Respirar (segure B)**
Um som grave, profundo e macio, com um ar que sobe e desce como maré. A tela fica azulada e as bordas pulsam numa luz azul.

**Praia final**
Até 90 almas sentadas, todas ligadas por fios de luz, e 24 flutuando sobre o mar.

**Mouse livre no fim**
Quando os créditos aparecem, o mouse é liberado e o botão "Voltar ao site" funciona. Para continuar olhando a praia, clique e arraste.

**Menu inicial**
Fundo escuro, título numa serifada fina (Cormorant Garamond) com um brilho suave que respira, textos em Jost e botões escuros com contorno luminoso. Os comandos ficam logo abaixo.

**Lista de comandos durante o jogo**
Painel pequeno no canto inferior esquerdo, com os comandos um sobre o outro. Começa ligado; a tecla H esconde e mostra.

**Canto da tela**
Os dados técnicos saíram. Fica só "lembranças N de 5".

**Celular e tablet**
O jogo detecta a tela de toque e troca os comandos sozinho:
- polegar no lado esquerdo: joystick que aparece onde o dedo encosta, para andar e acelerar;
- arrastar no lado direito: olhar;
- botões: **Voar** (segure), **Pular** (dois toques escapam da órbita), **Cordão** e **Respirar** (segure);
- perto de um quadrado de luz: "Toque aqui para olhar para dentro"; dentro da visão, "Voltar";
- no topo: Diário, Foto e o menu.

## O que fazer para publicar

1. Envie a pasta `jardim-orbital` do zip para `public_html`, substituindo a anterior. Ela tem só `index.html` e `jardim-orbital.jpg`.
2. **Apague do servidor** o que sobrou da versão com mensagens, dentro de `public_html/jardim-orbital/`: `mensagem.php`, `mensagens.php`, `config.exemplo.php` e a pasta `dados/`.
3. Abra https://www.serrate.com.br/jardim-orbital/. Se aparecer a versão antiga, recarregue com Ctrl+Shift+R.

O passo a passo de como subir (WP File Manager, painel da hospedagem ou FTP) está em `COMO-PUBLICAR.md`.
