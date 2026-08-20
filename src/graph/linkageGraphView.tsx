// @ts-ignore
import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {Alert, Button, ButtonGroup, Card} from 'react-bootstrap';
import * as d3 from 'd3';
import type {Dataset} from '../data/datasetTypes';
import type {DatasetSelection} from '../data/datasetTable';
import {
    buildLinkageGraph,
    type AdditionalDataLike,
    type IdentifierMappings,
} from './linkageGraph';

export interface LinkageGraphViewProps {
    datasetSelection: (DatasetSelection & {dataset: Dataset})[];
    additionalData?: AdditionalDataLike[];
    /** Identifier pairs linkable indirectly (e.g. loaded from a mapping.json). */
    identifierMappings: IdentifierMappings;
    title?: string;
}

/**
 * Renders an interactive (force-directed, draggable, zoomable) graph of how the
 * selected datasets and any additional data sources link via shared or mapped
 * identifiers. Institution-agnostic: the mapping table is supplied by the caller.
 */
export const LinkageGraphView: React.FC<LinkageGraphViewProps> = ({
    datasetSelection,
    additionalData,
    identifierMappings,
    title = 'Identifier linkage overview',
}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

    const graph = useMemo(
        () => buildLinkageGraph(datasetSelection, additionalData, identifierMappings),
        [datasetSelection, additionalData, identifierMappings],
    );

    const isolatedDatasetIds = useMemo(
        () =>
            graph.isolatedNodeIds.filter((id) =>
                datasetSelection.some((sel) => sel.dataset.abbreviation === id),
            ),
        [graph.isolatedNodeIds, datasetSelection],
    );

    const indirectOnlyLabels = useMemo(() => {
        return graph.indirectOnlyNodeIds.map((id) => {
            const node = graph.nodes.find((n) => n.id === id);
            if (!node) return id;
            return node.kind === 'dataset' ? node.id : node.label;
        });
    }, [graph.indirectOnlyNodeIds, graph.nodes]);

    const throughLinkSummaries = useMemo(() => {
        const getLabel = (id: string) => {
            const node = graph.nodes.find((n) => n.id === id);
            if (!node) return id;
            return node.kind === 'dataset' ? node.id : node.label;
        };
        const seen = new Set<string>();
        const result: string[] = [];
        graph.throughLinkTriples.forEach(([x, y, z]) => {
            const key = [x, y, z].sort().join('|');
            if (seen.has(key)) return;
            seen.add(key);
            result.push(`${getLabel(x)} → ${getLabel(y)} → ${getLabel(z)}`);
        });
        return result;
    }, [graph.throughLinkTriples, graph.nodes]);

    const handleZoom = useCallback((scaleFactor: number) => {
        const svgElement = svgRef.current;
        const zoomBehavior = zoomBehaviorRef.current;
        if (!svgElement || !zoomBehavior) return;
        d3.select(svgElement)
            .transition()
            .duration(200)
            .call(zoomBehavior.scaleBy as any, scaleFactor);
    }, []);

    useEffect(() => {
        const svgElement = svgRef.current;
        if (!svgElement) return;

        const width = svgElement.clientWidth || 800;
        const height = svgElement.clientHeight || 400;

        const svg = d3.select(svgElement);
        svg.selectAll('*').remove();
        if (graph.nodes.length === 0) return;

        svg.attr('viewBox', `0 0 ${width} ${height}`);

        const container = svgElement.parentElement as HTMLElement;
        const tooltip = d3
            .select(container)
            .append('div')
            .style('position', 'absolute')
            .style('padding', '4px 8px')
            .style('font-size', '12px')
            .style('background', 'white')
            .style('border', '1px solid #ccc')
            .style('border-radius', '4px')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('z-index', 10);

        const nodes = graph.nodes.map((d) => ({...d}));
        const links = graph.edges.map((d) => ({...d, source: d.source, target: d.target}));

        const simulation = d3
            .forceSimulation(nodes as any)
            .force(
                'link',
                d3.forceLink(links as any).id((d: any) => d.id).distance(120).strength(0.5),
            )
            .force('charge', d3.forceManyBody().strength(-120))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(60).strength(0.9));

        const zoomLayer = svg.append('g').attr('class', 'zoom-layer');
        const linkGroup = zoomLayer.append('g').attr('class', 'links');
        const nodeGroup = zoomLayer.append('g').attr('class', 'nodes');

        const link = linkGroup
            .selectAll('line')
            .data(links)
            .enter()
            .append('line')
            .attr('stroke', (d: any) => (d.type === 'direct' ? '#198754' : '#6c757d'))
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', (d: any) => (d.type === 'direct' ? 'none' : '4 4'))
            .on('mouseover', function (_event: any, d: any) {
                const pairs: [string, string][] = d.viaPairs ?? [];
                let text = '';
                if (pairs.length > 0) {
                    text = pairs
                        .map(([from, to]) => (from === to ? from : `${from} &harr; ${to}`))
                        .join(', ');
                } else if (d.via && d.via.length > 0) {
                    text = d.via.join(', ');
                } else {
                    return;
                }
                tooltip.style('opacity', 1).html(text);
            })
            .on('mousemove', function (event: any) {
                const rect = container.getBoundingClientRect();
                tooltip
                    .style('left', `${event.clientX - rect.left + 10}px`)
                    .style('top', `${event.clientY - rect.top + 10}px`);
            })
            .on('mouseout', function () {
                tooltip.style('opacity', 0);
            });

        const node = nodeGroup
            .selectAll('g')
            .data(nodes)
            .enter()
            .append('g')
            .call(
                d3
                    .drag<SVGGElement, any>()
                    .on('start', (event, d) => {
                        if (!event.active) simulation.alphaTarget(0.3).restart();
                        d.fx = d.x;
                        d.fy = d.y;
                    })
                    .on('drag', (event, d) => {
                        d.fx = event.x;
                        d.fy = event.y;
                    })
                    .on('end', (event, d) => {
                        if (!event.active) simulation.alphaTarget(0);
                        d.fx = null;
                        d.fy = null;
                    }),
            );

        const rectWidth = 90;
        const rectHeight = 30;

        node
            .append('rect')
            .attr('width', rectWidth)
            .attr('height', rectHeight)
            .attr('x', -rectWidth / 2)
            .attr('y', -rectHeight / 2)
            .attr('rx', 6)
            .attr('ry', 6)
            .attr('fill', (d: any) => (d.kind === 'dataset' ? '#e9f5ff' : '#fff3cd'))
            .attr('stroke', '#6c757d');

        node
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', 14)
            .attr('font-weight', 600)
            .text((d: any) => (d.kind === 'dataset' ? d.id : d.label));

        simulation.on('tick', () => {
            link
                .attr('x1', (d: any) => (d.source as any).x)
                .attr('y1', (d: any) => (d.source as any).y)
                .attr('x2', (d: any) => (d.target as any).x)
                .attr('y2', (d: any) => (d.target as any).y);
            node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        });

        const zoom = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.4, 2])
            .on('zoom', (event) => {
                zoomLayer.attr('transform', event.transform.toString());
            });

        zoomBehaviorRef.current = zoom;
        svg.call(zoom as any);
        svg.on('wheel.zoom', null);

        return () => {
            simulation.stop();
            tooltip.remove();
            zoomBehaviorRef.current = null;
        };
    }, [graph]);

    if (graph.nodes.length === 0) return null;

    return (
        <Card className="mb-3">
            <Card.Header>{title}</Card.Header>
            <Card.Body style={{position: 'relative'}}>
                <div className="d-flex align-items-center flex-wrap mb-2" style={{fontSize: '0.85rem'}}>
                    <strong className="me-2">Legend:</strong>
                    <div className="d-flex align-items-center me-3">
                        <span style={{display: 'inline-block', width: 20, height: 0, borderTop: '2px solid #198754', marginRight: 6}} />
                        <span>Shared identifier</span>
                    </div>
                    <div className="d-flex align-items-center me-3">
                        <span style={{display: 'inline-block', width: 20, height: 0, borderTop: '2px dashed #6c757d', marginRight: 6}} />
                        <span>Via mapping table</span>
                    </div>
                    <div className="d-flex align-items-center me-3">
                        <span className="badge rounded-pill me-1" style={{backgroundColor: '#e9f5ff', border: '1px solid #6c757d'}}>D</span>
                        <span style={{marginRight: 12}}>Dataset</span>
                        <span className="badge rounded-pill me-1" style={{backgroundColor: '#fff3cd', border: '1px solid #6c757d'}}>E</span>
                        <span>External dataset</span>
                    </div>
                    <div className="d-flex align-items-center">
                        <ButtonGroup size="sm" className="ms-2" aria-label="Graph zoom controls">
                            <Button variant="outline-dark" onClick={() => handleZoom(1.2)} aria-label="Zoom in">
                                <i className="bi bi-zoom-in" aria-hidden="true" />
                            </Button>
                            <Button variant="outline-dark" onClick={() => handleZoom(1 / 1.2)} aria-label="Zoom out">
                                <i className="bi bi-zoom-out" aria-hidden="true" />
                            </Button>
                        </ButtonGroup>
                        <span style={{marginLeft: 10}}>
                            <i className="bi bi-hand-index-thumb" /> Hover an edge to see the link
                        </span>
                    </div>
                </div>

                <svg ref={svgRef} width="100%" height="360" />
                {isolatedDatasetIds.length > 1 && (
                    <Alert variant="warning" className="mt-2 mb-1">
                        <strong>Unlinkable datasets selected</strong>: these selected datasets cannot be
                        linked to any other based on the available identifiers:{' '}
                        <em>{isolatedDatasetIds.join(', ')}</em>.
                    </Alert>
                )}

                {indirectOnlyLabels.length > 0 && (
                    <Alert variant="warning" className="mb-1">
                        <strong>Only indirect links available</strong>: these datasets can only be linked
                        via record linkage (matching on similar record information such as name and
                        address): <em>{indirectOnlyLabels.join(', ')}</em>. Match rates are usually lower
                        and depend on the specific dataset combination.
                    </Alert>
                )}

                {throughLinkSummaries.length > 0 && (
                    <Alert variant="warning" className="mb-0">
                        <strong>Linking through another dataset</strong>: some datasets can only be linked
                        through an intermediate one, e.g. <em>{throughLinkSummaries.join(', ')}</em>. The
                        effective number of matches is typically smaller in such cases.
                    </Alert>
                )}
            </Card.Body>
        </Card>
    );
};
