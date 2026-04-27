const SUSPICIOUS_COMMAND_PATTERNS: RegExp[] = [
  /\|\s*(?:bash|sh|zsh|ksh)(?:\s|$)/i,
  /(?:^|\s)(?:bash|sh|zsh|ksh)\s+-c\b/i,
  /base64\s+-d\b/i,
  /\/dev\/tcp\//i,
  /\bcurl\b[^\n]{0,120}\|/i,
  /\bwget\b[^\n]{0,120}\|/i,
  /\becho\b[^\n]{0,300}\|\s*base64\s+-d/i,
  /\b(?:nc|netcat|perl|python|ruby|php)\b[^\n]{0,120}(?:-e|exec|system)/i,
];

const SUSPICIOUS_KEYWORDS = [
  "rm -rf /",
  "chmod +x /tmp",
  "mkfifo",
  "bash -i",
  "curl http://",
  "curl https://",
  "wget http://",
  "wget https://",
];

function collectStrings(value: unknown, into: string[]): void {
  if (typeof value === "string") {
    into.push(value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, into));
    return;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectStrings(item, into));
  }
}

export function hasSuspiciousPayload(value: unknown): boolean {
  const strings: string[] = [];
  collectStrings(value, strings);

  return strings.some((text) => {
    const normalized = text.toLowerCase();
    if (SUSPICIOUS_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
      return true;
    }

    return SUSPICIOUS_COMMAND_PATTERNS.some((pattern) => pattern.test(text));
  });
}
