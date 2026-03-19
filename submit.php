<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid data']);
    exit;
}

// ── Honeypot check (silent reject) ──────────────────────────
if (!empty($data['website'])) {
    // Bot detected — respond success silently
    echo json_encode(['success' => true]);
    exit;
}

// ── Server-side validation ──────────────────────────────────
$required = ['fullName', 'email', 'phone', 'street', 'city', 'province', 'postalCode', 'plan', 'startDate'];
$errors = [];

foreach ($required as $field) {
    if (empty(trim($data[$field] ?? ''))) {
        $errors[] = "$field is required";
    }
}

// Email format
$email = trim($data['email'] ?? '');
if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Invalid email format';
}

// Date must be >= 3 days from today
$startDate = $data['startDate'] ?? '';
if ($startDate) {
    $minDate = new DateTime('now', new DateTimeZone('America/Regina'));
    $minDate->modify('+3 days');
    $minDate->setTime(0, 0, 0);
    $selectedDate = new DateTime($startDate, new DateTimeZone('America/Regina'));
    $selectedDate->setTime(0, 0, 0);
    if ($selectedDate < $minDate) {
        $errors[] = 'Start date must be at least 3 days from today';
    }
}

// Custom plan requires numProperties
if (($data['plan'] ?? '') === 'Custom') {
    $numProps = intval($data['numProperties'] ?? 0);
    if ($numProps < 2 || $numProps > 50) {
        $errors[] = 'Number of properties must be between 2 and 50';
    }
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => implode(', ', $errors)]);
    exit;
}

// ── Log submission ──────────────────────────────────────────
$logData = $data;
$logData['_submitted'] = date('Y-m-d H:i:s');
$logData['_ip'] = $_SERVER['REMOTE_ADDR'] ?? '';
unset($logData['website']); // Don't log honeypot
@file_put_contents(__DIR__ . '/submissions.jsonl', json_encode($logData) . "\n", FILE_APPEND | LOCK_EX);

// ── Brevo API ───────────────────────────────────────────────
define('BREVO_API_KEY', 'BREVO_KEY_REDACTED');

function brevoRequest($endpoint, $method = 'GET', $body = null) {
    $url = 'https://api.brevo.com' . $endpoint;
    $headers = ['accept: application/json', 'content-type: application/json', 'api-key: ' . BREVO_API_KEY];
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    $raw = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => json_decode($raw, true)];
}

function e($s) { return htmlspecialchars($s ?? '', ENT_QUOTES, 'UTF-8'); }

function stmEmailWrap($innerHtml) {
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>'
        . '<body style="margin:0;padding:0;background:#f4faf0;font-family:Arial,Helvetica,sans-serif">'
        . '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4faf0"><tr><td align="center" style="padding:30px 15px">'
        . '<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1)">'
        // Header
        . '<tr><td style="background:linear-gradient(135deg,#2e5e1a,#4a8c2a);padding:28px 35px;text-align:center">'
        . '<img src="https://stmichael.work/logo-transparent.png" alt="St. Michael Cleaning" style="width:80px;height:80px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto">'
        . '<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px">St. Michael Cleaning</h1>'
        . '<p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px">Subscription Cleaning Service</p>'
        . '</td></tr>'
        // Body
        . '<tr><td style="padding:35px">' . $innerHtml . '</td></tr>'
        // Footer
        . '<tr><td style="background:#2e5e1a;padding:22px 35px;text-align:center">'
        . '<p style="margin:0 0 4px;color:rgba(255,255,255,0.9);font-size:12px">Guaranteed High Quality, Thorough Service.</p>'
        . '<p style="margin:0 0 4px;color:rgba(255,255,255,0.7);font-size:12px">subscriptions@stmichael.work &bull; next.stmichael.work</p>'
        . '<p style="margin:8px 0 0;color:rgba(255,255,255,0.5);font-size:11px">&copy; St. Michael Cleaning</p>'
        . '</td></tr>'
        . '</table></td></tr></table></body></html>';
}

function infoRow($label, $value) {
    return '<tr><td style="padding:4px 0;font-size:13px;color:#757575;width:140px">' . e($label) . '</td>'
         . '<td style="padding:4px 0;font-size:13px;color:#212121">' . e($value) . '</td></tr>';
}

function sectionHead($title) {
    return '<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 8px">'
         . '<tr><td style="width:4px;height:20px;background:#4a8c2a;border-radius:2px"></td>'
         . '<td style="padding-left:10px;font-size:12px;font-weight:700;color:#2e5e1a;letter-spacing:1px;text-transform:uppercase">' . $title . '</td></tr></table>';
}

// ── Prepare common data ─────────────────────────────────────
$fullName = trim($data['fullName'] ?? 'Unknown');
$custEmail = trim($data['email'] ?? '');
$phone = trim($data['phone'] ?? '');
$street = trim($data['street'] ?? '');
$city = trim($data['city'] ?? '');
$province = trim($data['province'] ?? '');
$postalCode = trim($data['postalCode'] ?? '');
$plan = trim($data['plan'] ?? '');
$numProperties = $data['numProperties'] ?? null;
$notes = trim($data['notes'] ?? '');
$addrLine = "$street, $city, $province $postalCode";

// Plan pricing label
$planPricing = [
    'Weekly' => 'Starting at $150/visit',
    'Bi-Weekly' => 'Starting at $200/visit',
    'Monthly' => 'Starting at $250/visit',
    'Custom' => 'Custom pricing'
];
$planLabel = $planPricing[$plan] ?? $plan;

// ── Admin email (branded HTML) ──────────────────────────────
$adminInner = '<p style="font-size:15px;color:#212121;margin:0 0 5px"><strong>New subscription consultation request</strong> from next.stmichael.work</p>';

$adminInner .= sectionHead('Contact Information');
$adminInner .= '<table width="100%" cellpadding="0" cellspacing="0">'
    . infoRow('Name', $fullName)
    . infoRow('Email', $custEmail)
    . infoRow('Phone', $phone)
    . '</table>';

$adminInner .= sectionHead('Address');
$adminInner .= '<table width="100%" cellpadding="0" cellspacing="0">'
    . infoRow('Street', $street)
    . infoRow('City', $city)
    . infoRow('Province', $province)
    . infoRow('Postal Code', $postalCode)
    . '</table>';

$adminInner .= sectionHead('Subscription Details');
$adminInner .= '<table width="100%" cellpadding="0" cellspacing="0">'
    . infoRow('Selected Plan', $plan)
    . infoRow('Pricing', $planLabel)
    . infoRow('Preferred Start', $startDate);
if ($plan === 'Custom' && $numProperties) {
    $adminInner .= infoRow('Properties', $numProperties);
}
$adminInner .= '</table>';

if ($notes) {
    $adminInner .= sectionHead('Notes');
    $adminInner .= '<p style="font-size:13px;color:#424242;line-height:1.5">' . e($notes) . '</p>';
}

$adminInner .= '<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px"><tr><td style="font-size:11px;color:#bdbdbd">Submitted: ' . date('Y-m-d H:i:s') . ' | IP: ' . ($_SERVER['REMOTE_ADDR'] ?? '') . '</td></tr></table>';

$adminHtml = stmEmailWrap($adminInner);

$subject = 'Subscription Consultation — ' . $fullName . ' (' . $plan . ')';

// Plain text version
$adminText = "NEW SUBSCRIPTION CONSULTATION\n"
    . "========================================\n\n"
    . "Name: $fullName\n"
    . "Email: $custEmail\n"
    . "Phone: $phone\n"
    . "Address: $addrLine\n\n"
    . "Plan: $plan ($planLabel)\n"
    . "Preferred Start: $startDate\n";
if ($plan === 'Custom' && $numProperties) {
    $adminText .= "Properties: $numProperties\n";
}
if ($notes) {
    $adminText .= "\nNotes:\n$notes\n";
}
$adminText .= "\n— next.stmichael.work\n";

// Send admin email
$adminPayload = [
    'sender' => ['name' => 'St. Michael Subscriptions', 'email' => 'subscriptions@stmichael.work'],
    'to' => [['email' => 'info@stmichael.work'], ['email' => 'sameri.tekleyes@gmail.com']],
    'replyTo' => ['email' => $custEmail ?: 'subscriptions@stmichael.work'],
    'subject' => $subject,
    'htmlContent' => $adminHtml,
    'textContent' => $adminText,
];
$adminResult = brevoRequest('/v3/smtp/email', 'POST', $adminPayload);
$sent = ($adminResult['code'] >= 200 && $adminResult['code'] < 300);

// ── Customer confirmation email ─────────────────────────────
if ($custEmail && filter_var($custEmail, FILTER_VALIDATE_EMAIL)) {
    $custInner = '<p style="font-size:15px;color:#212121;margin:0 0 20px">Hi ' . e($fullName) . ',</p>'
        . '<p style="font-size:14px;color:#424242;line-height:1.6;margin:0 0 25px">'
        . 'Thank you for your interest in a St. Michael Cleaning subscription! We\'ve received your consultation request and will be in touch within <strong>24 hours</strong> to discuss your plan and confirm pricing.'
        . '</p>';

    // Order summary card
    $custInner .= '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4faf0;border:2px solid #e8f5e0;border-radius:8px;margin-bottom:25px"><tr><td style="padding:20px 25px">'
        . '<table width="100%" cellpadding="0" cellspacing="0">'
        . '<tr><td style="font-size:11px;color:#757575;text-transform:uppercase;letter-spacing:1px;padding-bottom:12px;border-bottom:1px solid #e8f5e0" colspan="2">Consultation Summary</td></tr>'
        . '<tr><td style="padding:10px 0 4px;font-size:13px;color:#757575">Plan</td><td style="padding:10px 0 4px;font-size:13px;color:#212121;text-align:right"><strong>' . e($plan) . '</strong></td></tr>'
        . '<tr><td style="padding:4px 0;font-size:13px;color:#757575">Pricing</td><td style="padding:4px 0;font-size:13px;color:#212121;text-align:right">' . e($planLabel) . '</td></tr>'
        . '<tr><td style="padding:4px 0;font-size:13px;color:#757575">Preferred Start</td><td style="padding:4px 0;font-size:13px;color:#212121;text-align:right">' . e($startDate) . '</td></tr>'
        . '<tr><td style="padding:4px 0;font-size:13px;color:#757575">Location</td><td style="padding:4px 0;font-size:13px;color:#212121;text-align:right">' . e("$city, $province") . '</td></tr>';
    if ($plan === 'Custom' && $numProperties) {
        $custInner .= '<tr><td style="padding:4px 0;font-size:13px;color:#757575">Properties</td><td style="padding:4px 0;font-size:13px;color:#212121;text-align:right">' . e($numProperties) . '</td></tr>';
    }
    $custInner .= '</table></td></tr></table>';

    // What happens next
    $custInner .= '<p style="font-size:12px;font-weight:700;color:#2e5e1a;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px">What Happens Next</p>'
        . '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">'
        . '<tr><td style="padding:6px 0;font-size:13px;color:#424242"><span style="display:inline-block;width:22px;height:22px;background:#e8f5e0;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#2e5e1a;margin-right:8px">1</span>We review your details and prepare a custom quote</td></tr>'
        . '<tr><td style="padding:6px 0;font-size:13px;color:#424242"><span style="display:inline-block;width:22px;height:22px;background:#e8f5e0;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#2e5e1a;margin-right:8px">2</span>We contact you within 24 hours to confirm details</td></tr>'
        . '<tr><td style="padding:6px 0;font-size:13px;color:#424242"><span style="display:inline-block;width:22px;height:22px;background:#e8f5e0;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#2e5e1a;margin-right:8px">3</span>Your dedicated cleaning team starts on your preferred date</td></tr>'
        . '</table>';

    $custInner .= '<p style="font-size:14px;color:#424242;line-height:1.6;margin:0 0 5px">If you have any questions, reach us at <a href="mailto:info@stmichael.work" style="color:#4a8c2a">info@stmichael.work</a></p>'
        . '<p style="font-size:14px;color:#424242;margin:15px 0 0">We look forward to serving you!</p>'
        . '<p style="font-size:13px;color:#757575;margin:5px 0 15px">&mdash; Sam<br>St. Michael Cleaning</p>';

    // Loyalty program
    $custBubbles = '';
    for ($i = 1; $i <= 6; $i++) {
        $custBubbles .= '<td align="center" style="padding:4px"><div style="width:40px;height:40px;border-radius:50%;border:2px dashed #c8e6c9;margin:0 auto">'
            . '<span style="color:#bbb;font-size:14px;line-height:40px">' . $i . '</span></div></td>';
    }
    $custBubbles .= '<td align="center" style="padding:4px"><div style="width:44px;height:44px;border-radius:50%;border:2px dashed #c9a227;margin:0 auto">'
        . '<span style="color:#c9a227;font-size:9px;font-weight:700;line-height:44px;text-transform:uppercase">FREE</span></div></td>';

    $custInner .= '<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:5px;background:#fff;border:2px solid #e8f5e0;border-radius:8px"><tr><td style="padding:20px 15px;text-align:center">'
        . '<p style="margin:0 0 4px;font-size:11px;color:#757575;text-transform:uppercase;letter-spacing:1.5px;font-weight:600">Loyalty Rewards</p>'
        . '<p style="margin:0 0 14px;font-size:16px;color:#2e5e1a;font-weight:700">Every 7th Cleaning is FREE</p>'
        . '<table cellpadding="0" cellspacing="0" style="margin:0 auto"><tr>' . $custBubbles . '</tr></table>'
        . '<p style="margin:14px 0 0;font-size:13px;color:#4a8c2a;font-weight:600">Subscribe and start earning free cleanings!</p>'
        . '</td></tr></table>';

    $custHtml = stmEmailWrap($custInner);

    $custText = "Hi $fullName,\n\n"
        . "Thank you for your interest in a St. Michael Cleaning subscription!\n\n"
        . "Plan: $plan ($planLabel)\n"
        . "Preferred Start: $startDate\n"
        . "Location: $addrLine\n\n"
        . "We'll contact you within 24 hours to discuss your plan and confirm pricing.\n\n"
        . "Questions? Email info@stmichael.work\n\n"
        . "— Sam\nSt. Michael Cleaning\nnext.stmichael.work\n";

    $custPayload = [
        'sender' => ['name' => 'St. Michael Cleaning', 'email' => 'subscriptions@stmichael.work'],
        'to' => [['email' => $custEmail]],
        'replyTo' => ['email' => 'info@stmichael.work'],
        'subject' => 'Your Subscription Consultation — St. Michael Cleaning',
        'htmlContent' => $custHtml,
        'textContent' => $custText,
    ];
    brevoRequest('/v3/smtp/email', 'POST', $custPayload);
}

// ── Response ────────────────────────────────────────────────
if ($sent) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to send email']);
}
