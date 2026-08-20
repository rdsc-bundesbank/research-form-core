export interface DataAccessReasonRule {
    value: string;
    eligible?: boolean;
    note?: string;
}

export interface DataAccessGateMessage {
    severity: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'error';
    text: string;
}

export interface DataAccessGateInput {
    reasonValue?: string;
    intendToPublish?: boolean;
    reasons: DataAccessReasonRule[];
    publicationReasons?: Set<string>;
    publicationBlockingMessage?: string;
    fallbackIneligibleMessage?: string;
}

export interface DataAccessGateResult {
    blocked: boolean;
    messages: DataAccessGateMessage[];
}

export function evaluateDataAccessGate({
    reasonValue,
    intendToPublish,
    reasons,
    publicationReasons = new Set(),
    publicationBlockingMessage = 'You must make your research results available to the scientific community.',
    fallbackIneligibleMessage = 'Data access cannot be granted for the selected purpose.',
}: DataAccessGateInput): DataAccessGateResult {
    const reason = reasons.find((item) => item.value === reasonValue);
    const chosen = !!reasonValue;
    const eligible = reason?.eligible ?? true;
    const messages: DataAccessGateMessage[] = [];

    if (chosen && !eligible) {
        messages.push({
            severity: 'error',
            text: reason?.note ?? fallbackIneligibleMessage,
        });
    }

    if (reasonValue && publicationReasons.has(reasonValue) && intendToPublish === false) {
        messages.push({
            severity: 'error',
            text: publicationBlockingMessage,
        });
    }

    return {
        blocked: messages.some((message) => message.severity === 'error' || message.severity === 'danger'),
        messages,
    };
}

export const blockingDataAccessMessages = (messages: DataAccessGateMessage[]): string[] =>
    messages
        .filter((message) => message.severity === 'error' || message.severity === 'danger')
        .map((message) => String(message.text));
