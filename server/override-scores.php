<?php
/* =============================================================
   2048 Override - high score storage
   GET  -> top 10 scores as JSON
   POST -> add {name, score, tile}, returns updated top 10
   Scores live in override-scores.json next to this file.
   ============================================================= */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

$file = __DIR__ . '/override-scores.json';
$maxStored = 100;   /* history kept on disk */
$maxShown  = 10;    /* entries returned to the site */

function load_scores($file) {
    if (!is_file($file)) return array();
    $raw = file_get_contents($file);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : array();
}

function top_scores($scores, $limit) {
    usort($scores, function ($a, $b) {
        if ($b['score'] === $a['score']) return $a['ts'] - $b['ts'];
        return $b['score'] - $a['score'];
    });
    $out = array_slice($scores, 0, $limit);
    /* strip internals before sending to the browser */
    return array_map(function ($s) {
        return array('name' => $s['name'], 'score' => $s['score'], 'tile' => $s['tile']);
    }, $out);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = file_get_contents('php://input', false, null, 0, 2048);
    $in = json_decode($body, true);
    if (!is_array($in)) {
        http_response_code(400);
        echo json_encode(array('error' => 'invalid request'));
        exit;
    }

    $name = isset($in['name']) ? strtoupper(trim((string)$in['name'])) : '';
    $name = preg_replace('/[^A-Z0-9 .\-!?:]/', '', $name);
    $name = preg_replace('/\s+/', ' ', $name);
    $name = substr($name, 0, 25);
    if ($name === '') $name = 'MYSTERY PLAYER';

    $score = isset($in['score']) ? (int)$in['score'] : 0;
    $tile  = isset($in['tile']) ? (int)$in['tile'] : 0;

    /* every merge adds a multiple of 4; the tile is a power of two */
    $validTile = $tile >= 2 && $tile <= 131072 && ($tile & ($tile - 1)) === 0;
    if ($score < 4 || $score > 999999 || $score % 4 !== 0 || !$validTile) {
        http_response_code(400);
        echo json_encode(array('error' => 'invalid score'));
        exit;
    }

    $scores = load_scores($file);
    $scores[] = array('name' => $name, 'score' => $score, 'tile' => $tile, 'ts' => time());

    usort($scores, function ($a, $b) {
        if ($b['score'] === $a['score']) return $a['ts'] - $b['ts'];
        return $b['score'] - $a['score'];
    });
    $scores = array_slice($scores, 0, $maxStored);

    $written = @file_put_contents($file, json_encode($scores), LOCK_EX);
    if ($written === false) {
        http_response_code(500);
        echo json_encode(array('error' => 'could not save score'));
        exit;
    }
    echo json_encode(top_scores($scores, $maxShown));
    exit;
}

echo json_encode(top_scores(load_scores($file), $maxShown));
