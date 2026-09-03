const MAX_LOGS = 50;

export interface LogEntry {
  id: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  details?: string;
  timestamp: number;
}

class DevLogger {
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];

  private add(level: LogEntry['level'], message: string, details?: unknown) {
    const entry: LogEntry = {
      id: Math.random().toString(36).slice(2),
      level,
      message,
      details: details ? JSON.stringify(details, null, 2) : undefined,
      timestamp: Date.now(),
    };

    this.logs = [entry, ...this.logs].slice(0, MAX_LOGS);
    this.listeners.forEach(fn => fn(this.logs));

    if (level === 'error') {
      console.error(`[AURA] ${message}`, details ?? '');
    } else if (level === 'warn') {
      console.warn(`[AURA] ${message}`, details ?? '');
    } else {
      console.log(`[AURA] ${message}`, details ?? '');
    }
  }

  error(message: string, details?: unknown) {
    this.add('error', message, details);
  }

  warn(message: string, details?: unknown) {
    this.add('warn', message, details);
  }

  info(message: string, details?: unknown) {
    this.add('info', message, details);
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  subscribe(fn: (logs: LogEntry[]) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  clear() {
    this.logs = [];
    this.listeners.forEach(fn => fn(this.logs));
  }
}

export const devLog = new DevLogger();
