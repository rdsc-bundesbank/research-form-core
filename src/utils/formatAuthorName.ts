export type SimpleAuthor = { first_name?: string | null; surname?: string | null };

export const formatAuthorName = (
    author: SimpleAuthor | null | undefined,
    index?: number,
): string => {
    const hasName = (author?.first_name && author.first_name.trim()) || (author?.surname && author.surname.trim());
    if (hasName) {
        return `${author?.first_name || ''} ${author?.surname || ''}`.trim();
    }
    if (typeof index === 'number') {
        return `Author ${index + 1}`;
    }
    return '';
};
