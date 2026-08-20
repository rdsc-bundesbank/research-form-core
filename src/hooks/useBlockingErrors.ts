import {useCallback, useMemo, useState} from 'react';

export interface BlockingErrorEntry {
    card: string;
    idx: number;
    text: string;
}

export const useBlockingErrors = () => {
    const [blockingErrorMessagesByCard, setBlockingErrorMessagesByCard] = useState<Record<string, string[]>>({});

    const setBlockingErrorMessagesForCard = useCallback((card: string, messages: string[]) => {
        setBlockingErrorMessagesByCard((prev) => ({
            ...prev,
            [card]: messages,
        }));
    }, []);

    const blockingErrorMessages: BlockingErrorEntry[] = useMemo(
        () =>
            Object.entries(blockingErrorMessagesByCard).flatMap(([card, messages]) =>
                messages.map((text, idx) => ({card, idx, text})),
            ),
        [blockingErrorMessagesByCard],
    );

    const hasBlockingError = blockingErrorMessages.length > 0;

    return {blockingErrorMessagesByCard, setBlockingErrorMessagesForCard, blockingErrorMessages, hasBlockingError};
};
