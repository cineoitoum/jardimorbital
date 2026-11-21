<?php
// Jardim Orbital: the messages, for the site's administrator only (log in to WordPress first).
$wp = null;
for ($d = dirname(__DIR__), $i = 0; $i < 4 && !$wp; $d = dirname($d), $i++) if (is_file("$d/wp-load.php")) $wp = "$d/wp-load.php";
if (!$wp) { http_response_code(403); exit('WordPress não encontrado.'); }
require_once $wp;
if (!is_user_logged_in() || !current_user_can('manage_options')) { auth_redirect(); exit; }
$file = __DIR__ . '/dados/mensagens.jsonl';
$rows = [];
if (is_file($file)) foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $l) { $r = json_decode($l, true); if ($r) $rows[] = $r; }
$rows = array_reverse($rows);
if (isset($_GET['csv'])) {
  header('Content-Type: text/csv; charset=utf-8');
  header('Content-Disposition: attachment; filename="jardim-orbital-mensagens.csv"');
  $o = fopen('php://output', 'w'); fwrite($o, "\xEF\xBB\xBF");
  fputcsv($o, ['data', 'nome', 'mensagem', 'tempo (min)', 'sistema']);
  foreach ($rows as $r) fputcsv($o, [$r['data'], $r['nome'], $r['mensagem'], $r['tempo_min'] ?? '', $r['semente'] ?? '']);
  exit;
}
$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
?><!doctype html><html lang=pt-BR><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content=noindex><title>Jardim Orbital · mensagens</title>
<style>body{margin:0;background:#07040f;color:#ece4ff;font:16px/1.6 system-ui,sans-serif}main{max-width:760px;margin:0 auto;padding:32px 16px}h1{font-weight:200;letter-spacing:.2em;text-transform:uppercase}.m{margin:0 0 18px;padding:16px 20px;border-radius:10px;background:#16102a}.m p{margin:0 0 8px;font:italic 18px/1.5 Georgia,serif;white-space:pre-wrap;color:#fff}.m small{color:#a99bd0}a{color:#ffd9a8}</style></head>
<body><main><h1>Mensagens</h1><p><?= count($rows) ?> mensagem(ns) · <a href="?csv">baixar tudo (CSV)</a></p>
<?php foreach ($rows as $r): ?><div class=m><p><?= $h($r['mensagem']) ?></p><small>— <?= $h($r['nome'] !== '' ? $r['nome'] : 'sem nome') ?> · <?= $h(date('d/m/Y H:i', strtotime($r['data']))) ?> · <?= $h($r['tempo_min'] ?? '?') ?> min de viagem</small></div><?php endforeach; ?>
<?php if (!$rows): ?><p>Ainda não há mensagens.</p><?php endif; ?>
</main></body></html>
