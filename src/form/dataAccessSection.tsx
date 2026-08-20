import React from 'react';
import {Alert, Card} from 'react-bootstrap';
import {FlatFormRenderer} from './flatFormRenderer';
import type {FieldDef} from './flatFormSchema';

export interface DataAccessMessage {
    severity: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'error';
    text: React.ReactNode;
}

export interface DataAccessSectionProps {
    fields: FieldDef[];
    header?: React.ReactNode;
    intro?: React.ReactNode;
    disabled?: boolean;
    messages?: DataAccessMessage[];
}

/** Data-access reason section. Eligibility rules remain application content. */
export const DataAccessSection: React.FC<DataAccessSectionProps> = ({
    fields,
    header = 'Data access reason',
    intro,
    disabled,
    messages = [],
}) => (
    <Card className="mb-3">
        <Card.Header>{header}</Card.Header>
        <Card.Body>
            {intro}
            <FlatFormRenderer fields={fields} disabled={disabled}/>
            {messages.length > 0 && (
                <div className="mt-3">
                    {messages.map((message, index) => (
                        <Alert
                            key={index}
                            variant={message.severity === 'error' ? 'danger' : message.severity}
                        >
                            {message.text}
                        </Alert>
                    ))}
                </div>
            )}
        </Card.Body>
    </Card>
);
