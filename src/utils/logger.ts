/**
 * Logger utility for Grocery Deal Hunter
 * Logs to both console and in-memory buffer for file export
 */

class PipelineLogger {
    private logs: string[] = [];
    private startTime: Date | null = null;

    /**
     * Reset the log buffer (called at start of each pipeline run)
     */
    reset() {
        this.logs = [];
        this.startTime = new Date();
        this.log('='.repeat(60));
        this.log('GROCERY DEAL HUNTER - PIPELINE LOG');
        this.log(`Started: ${this.startTime.toLocaleString()}`);
        this.log('='.repeat(60));
    }

    /**
     * Log a message to both console and buffer
     */
    log(message: string, emoji?: string) {
        const timestamp = new Date().toLocaleTimeString();
        const formattedMessage = emoji ? `${emoji} ${message}` : message;
        const logEntry = `[${timestamp}] ${formattedMessage}`;

        // Add to buffer
        this.logs.push(logEntry);

        // Log to console
        console.log(formattedMessage);
    }

    /**
     * Log an error
     */
    error(message: string, error?: any) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ❌ ERROR: ${message}`;

        this.logs.push(logEntry);
        if (error) {
            this.logs.push(`  Details: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
        }

        console.error(message, error);
    }

    /**
     * Log a warning
     */
    warn(message: string) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ⚠️  WARNING: ${message}`;

        this.logs.push(logEntry);
        console.warn(message);
    }

    /**
     * Log structured data (objects/arrays)
     */
    logData(label: string, data: any) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] 📊 ${label}:`;

        this.logs.push(logEntry);

        if (typeof data === 'object') {
            const formatted = JSON.stringify(data, null, 2);
            this.logs.push(formatted);
            console.log(label, data);
        } else {
            this.logs.push(`  ${data}`);
            console.log(label, data);
        }
    }

    /**
     * Add a section separator
     */
    separator(title?: string) {
        const line = '-'.repeat(60);
        this.logs.push('');
        if (title) {
            this.logs.push(line);
            this.logs.push(`  ${title}`);
            this.logs.push(line);
        } else {
            this.logs.push(line);
        }
    }

    /**
     * Get all logs as a string
     */
    getLogsAsString(): string {
        const endTime = new Date();
        const duration = this.startTime
            ? ((endTime.getTime() - this.startTime.getTime()) / 1000).toFixed(2)
            : 'N/A';

        const footer = [
            '',
            '='.repeat(60),
            `Completed: ${endTime.toLocaleString()}`,
            `Duration: ${duration}s`,
            '='.repeat(60),
        ];

        return [...this.logs, ...footer].join('\n');
    }

    /**
     * Download logs as a text file
     */
    downloadLogs(filename?: string) {
        const logContent = this.getLogsAsString();
        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const defaultFilename = `grocery-deal-hunter-${timestamp}.log`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename || defaultFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`📥 Log file downloaded: ${a.download}`);
    }

    /**
     * Get the current log count
     */
    getLogCount(): number {
        return this.logs.length;
    }
}

// Singleton instance
export const logger = new PipelineLogger();
