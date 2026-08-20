import React from 'react';
import {Alert} from 'react-bootstrap';
import type {BlockingErrorEntry} from '../hooks/useBlockingErrors';

export interface BlockingGateProps {
    blocked: boolean;
    blockingErrorMessages: BlockingErrorEntry[];
    gate: React.ReactNode;
    children: React.ReactNode;
    anchorId?: string;
    blockedWarning?: React.ReactNode;
}

/**
 * Renders a gate section and disables the remaining form while blocking errors
 * are active. Applications provide the gate question and institution-specific
 * blocking messages; the behaviour stays shared.
 */
export const BlockingGate: React.FC<BlockingGateProps> = ({
    blocked,
    blockingErrorMessages,
    gate,
    children,
    anchorId = 'blocking-error-anchor',
    blockedWarning = 'The rest of the application is disabled until the condition above is resolved.',
}) => {
    const blockRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (blocked) blockRef.current?.scrollIntoView({behavior: 'smooth', block: 'center'});
    }, [blocked]);

    return (
        <>
            {gate}

            {blocked && (
                <div ref={blockRef} id={anchorId}>
                    {blockingErrorMessages.map(({card, idx, text}) => (
                        <Alert key={`${card}-block-${idx}`} variant="danger">
                            {text}
                        </Alert>
                    ))}
                    <Alert variant="warning">{blockedWarning}</Alert>
                </div>
            )}

            <fieldset disabled={blocked} aria-disabled={blocked}>
                <div className={blocked ? 'opacity-50 pe-none' : undefined}>{children}</div>
            </fieldset>
        </>
    );
};
