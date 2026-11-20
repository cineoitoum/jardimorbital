# Jardim Orbital

Exploração em primeira pessoa num sistema de miniplanetas com gravidade baixa. Cada sistema nasce de uma semente: três planetas de biomas diferentes, céu de nebulosa e espíritos luminosos que passam em órbita. Tudo é gerado por código, sem imagens, modelos ou arquivos de som, num único `index.html`.

Baseado no [Abyssal Garden](https://github.com/Noniv/abyssal-garden) (MIT), de onde vêm o renderizador WebGPU, o bloom, a geração de malha por *surface nets* e o som sintetizado.

## Jogar

Abra o `index.html` no **Chrome** ou no **Edge** de um computador. É preciso ter WebGPU.

| | |
|---|---|
| Olhar | Mouse |
| Andar | `W` `A` `S` `D` |
| Pular / jetpack | `Espaço` (segure no ar) |
| Correr / impulso no ar | `Shift` |
| Subir / descer no ar | `E` / `Q` |
| Órbita de cada planeta | `1` `2` `3` |
| Lanterna | `F` |
| Menu · som · dados | `Esc` · `M` · `H` |

A gravidade é a soma da atração de todos os planetas. Por isso o "chão" vira suavemente quando você atravessa de um planeta para outro. Um pulo sobe uns 6 m e dura uns 5 s; com o jetpack dá para sair da órbita e cair no vizinho.

`?seed=123` na URL fixa o sistema. O botão **Novo sistema** sorteia outro.

## Biomas

| | |
|---|---|
| **Prado** | grama verde, pontos de flor laranja, borda azul de atmosfera |
| **Cristal** | colunas violeta, arbustos roxos, faíscas ciano, trilhas salmão |
| **Escarpa** | rocha marrom em espinhos, água escura, névoa ciano, brasas |
| **Mármore** | chão em faixas de tinta rosa, laranja e azul, brilho molhado |
| **Jardim** | campos de flores rosa e violeta, torres de rocha, rochas flutuando |

## Código

```bash
cd source
npm install
npm run build            # index.html minificado
npm run build:readable   # sem minificar, para depurar
```

| Arquivo | O que tem |
|---|---|
| `source/src/system.js` | O sistema a partir da semente: biomas, paletas, posições, gravidade |
| `source/src/world.js` | Malha e colisão de cada planeta, vegetação, cristais, rochas, espíritos |
| `source/src/shaders.js` | Todo o visual em WGSL: relevo, céu, atmosfera, água, plantas, espíritos, pós-processamento |
| `source/src/main.js` | Renderizador, física do jogador, controles, loop |
| `source/src/math.js` · `audio.js` · `quality.js` | Ruído e malhas, som, níveis de detalhe (do Abyssal Garden) |

Para teste automatizado num navegador sem placa de vídeo, `?headless` desenha fora do canvas, e `window.__game.snap()` devolve o quadro como PNG.
