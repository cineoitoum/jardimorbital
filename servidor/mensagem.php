<?php
// Jardim Orbital: receives the message left by someone who reached the sea at the end.
// Stores it in dados/mensagens.jsonl and sends it by e-mail to the WordPress admin address.
// Messages are private: nothing here is ever shown to other visitors.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function reply($ok, $code = 200) { http_response_code($code); echo json_encode(['ok' => $ok]); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') reply(false, 405);
$raw = file_get_contents('php://input', false, null, 0, 4096);
$in = json_decode($raw ?: '', true);
if (!is_array($in)) reply(false, 400);

// a clean, bounded piece of text
function clean($s, $max) {
  $s = is_string($s) ? $s : '';
  $s = strip_tags($s);
  $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s) ?? '';
  $s = trim($s);
  return mb_substr($s, 0, $max);
}
$msg = clean($in['mensagem'] ?? '', 1500);
$name = clean($in['nome'] ?? '', 80);
$seed = preg_replace('/\D/', '', (string)($in['semente'] ?? ''));
$played = (float)($in['tempo'] ?? 0);
if ($msg === '') reply(false, 400);
// robots: the hidden field filled, or the end reached impossibly fast. Pretend it worked.
if (!empty($in['website']) || $played < 300) reply(true);

$dir = __DIR__ . '/dados';
if (!is_dir($dir)) @mkdir($dir, 0750, true);
// at most 3 messages an hour from the same address (only a hash of the address is kept)
$ip = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|jardim-orbital');
$limits = $dir . '/limite.json';
$fp = fopen($limits, 'c+');
if ($fp) {
  flock($fp, LOCK_EX);
  $data = json_decode(stream_get_contents($fp) ?: '{}', true) ?: [];
  $now = time();
  foreach ($data as $k => $times) { $data[$k] = array_values(array_filter($times, fn($t) => $t > $now - 3600)); if (!$data[$k]) unset($data[$k]); }
  if (count($data[$ip] ?? []) >= 3) { flock($fp, LOCK_UN); fclose($fp); reply(false, 429); }
  $data[$ip][] = $now;
  ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($data)); fflush($fp);
  flock($fp, LOCK_UN); fclose($fp);
}

$entry = ['data' => date('c'), 'nome' => $name, 'mensagem' => $msg, 'semente' => $seed, 'tempo_min' => round($played / 60), 'origem' => substr($ip, 0, 10)];
$ok = file_put_contents($dir . '/mensagens.jsonl', json_encode($entry, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
if ($ok === false) reply(false, 500);

// e-mail: through WordPress when it is there (wp_mail honours SMTP plugins), else plain mail() with config.php
$subject = 'Jardim Orbital: nova mensagem' . ($name !== '' ? " de $name" : '');
$body = "Alguém chegou ao mar e deixou uma mensagem.\n\n" . $msg . "\n\n— " . ($name !== '' ? $name : 'sem nome') .
  "\n\nData: " . $entry['data'] . "\nTempo de viagem: cerca de " . $entry['tempo_min'] . " min · sistema " . $seed .
  "\n\nTodas as mensagens: " . (isset($_SERVER['HTTP_HOST']) ? 'https://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['SCRIPT_NAME']) . '/mensagens.php' : 'mensagens.php');
$wp = null;
for ($d = dirname(__DIR__), $i = 0; $i < 4 && !$wp; $d = dirname($d), $i++) if (is_file("$d/wp-load.php")) $wp = "$d/wp-load.php";
try {
  if ($wp) {
    require_once $wp;
    if (function_exists('wp_mail')) wp_mail(get_option('admin_email'), $subject, $body);
  } elseif (is_file(__DIR__ . '/config.php')) {
    $cfg = include __DIR__ . '/config.php';
    if (!empty($cfg['email'])) @mail($cfg['email'], '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, "Content-Type: text/plain; charset=UTF-8");
  }
} catch (Throwable $e) { /* the message is saved even if the e-mail fails */ }
reply(true);
