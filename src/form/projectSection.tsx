import React from 'react';
import {Card} from 'react-bootstrap';
import {FlatFormRenderer} from './flatFormRenderer';
import type {FieldDef} from './flatFormSchema';

export interface ProjectSectionProps {
    fields: FieldDef[];
    header?: React.ReactNode;
    disabled?: boolean;
}

/** Project description section backed by the shared flat field renderer. */
export const ProjectSection: React.FC<ProjectSectionProps> = ({
    fields,
    header = 'Project',
    disabled,
}) => (
    <Card className="mb-3">
        <Card.Header>{header}</Card.Header>
        <Card.Body>
            <FlatFormRenderer fields={fields} disabled={disabled}/>
        </Card.Body>
    </Card>
);
