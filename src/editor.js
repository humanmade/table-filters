import { BlockControls } from '@wordpress/block-editor';
import { ToolbarGroup, DropdownMenu } from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { createPortal, Fragment, useMemo, useEffect, useState } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import { funnel, seen, unseen } from '@wordpress/icons';

/**
 * Find a block's element in the editor.
 *
 * The post editor may render blocks in an iframe, which WordPress 7.1 always
 * does, so the top-level document is not the only place to look.
 *
 * @param {string} clientId Block client ID.
 * @returns {?HTMLElement} The block's element, if it has rendered.
 */
function findBlockElement( clientId ) {
	const id = `block-${ clientId }`;
	const element = document.getElementById( id );
	if ( element ) {
		return element;
	}

	for ( const iframe of document.querySelectorAll( 'iframe[name="editor-canvas"]' ) ) {
		const found = iframe.contentDocument?.getElementById( id );
		if ( found ) {
			return found;
		}
	}

	return null;
}

const withTableFilters = createHigherOrderComponent( ( BlockEdit ) => ( props ) => {
	if ( props.name !== 'core/table' ) {
		return <BlockEdit { ...props } />;
	}

	const { attributes, setAttributes } = props;
	const filters = attributes.filters;
	const firstHeadRow = attributes.head[ 0 ] || null;
	const firstBodyRow = attributes.body[ 0 ] || null;

	// Get first row cell texts.
	const columnHeaders = useMemo( () => {
		let headers = [];
		if ( firstHeadRow ) {
			headers = firstHeadRow.cells.map( ( cell ) => cell.content.text || cell.content || '' );
		} else if ( firstBodyRow ) {
			headers = firstBodyRow.cells.map( ( cell ) => cell.content.text || cell.content || '' );
		}
		return headers;
	}, [ firstHeadRow, firstBodyRow ] );

	const handleToggle = ( colIdx ) => {
		let newFilters = [ ...filters ];
		if ( newFilters.includes( colIdx ) ) {
			newFilters = newFilters.filter( ( idx ) => idx !== colIdx );
		} else {
			newFilters.push( colIdx );
		}
		newFilters = newFilters.filter( idx => idx < columnHeaders.length );
		newFilters.sort();
		setAttributes( { filters: newFilters } );
	};

	const hasFilters = filters.length > 0;
	const [ filtersWrapper, setFiltersWrapper ] = useState( null );

	// Add a wrapper for the filters preview where the front end renders them,
	// as the first child of the block's figure.
	useEffect( () => {
		if ( ! hasFilters ) {
			return;
		}

		const tableBlock = findBlockElement( props.clientId );
		if ( ! tableBlock ) {
			return;
		}

		const wrapper = tableBlock.ownerDocument.createElement( 'div' );
		wrapper.className = 'wp-block-table__filters';
		tableBlock.prepend( wrapper );
		setFiltersWrapper( wrapper );

		return () => {
			wrapper.remove();
			setFiltersWrapper( null );
		};
	}, [ props.clientId, hasFilters ] );

	// Update the filtersData.
	useEffect( () => {
		const filtersData = filters.map( idx => {
			const valuesSet = new Set();
			attributes.body.forEach( row => {
				const cellText = row.cells[ idx ]?.content?.text || '';
				if (
					cellText &&
					cellText !== columnHeaders[ idx ] &&
					! valuesSet.has( cellText )
				) {
					valuesSet.add( cellText );
				}
			} );
			return {
				column: idx,
				label: columnHeaders[ idx ],
				values: Array.from( valuesSet ),
			};
		});

		setAttributes( { filtersData } );
	}, [ filters, columnHeaders, attributes.body, setAttributes ] );

	return (
		<Fragment>
			<BlockControls>
				<ToolbarGroup>
					<DropdownMenu
						controls={ columnHeaders.map( ( header, idx ) => ( {
							title: header || `Column ${ idx + 1 }`,
							icon: filters.includes( idx ) ? seen : unseen,
							isActive: filters.includes( idx ),
							onClick: () => handleToggle( idx ),
						} ) ) }
						icon={ funnel }
						label={ __( 'Table Filters', 'table-filters' ) }
						popoverProps={ { placement: 'bottom-start' } }
					/>
				</ToolbarGroup>
			</BlockControls>
			<BlockEdit { ...props } />
			{ hasFilters && filtersWrapper && createPortal(
				filters.map( idx => (
					<div className="wp-block-table__filter" inert="true" key={ idx }>
						<label htmlFor={ `table-filter-${ idx }` }>{ columnHeaders[ idx ] || `Column ${ idx + 1 }` }</label>
						<select name={ `table-filter-${ idx }` }><option>{ __( 'All', 'table-filters' ) }</option></select>
					</div>
				) ),
				filtersWrapper
			) }
		</Fragment>
	);
}, 'withTableFilters' );

addFilter(
	'editor.BlockEdit',
	'table-filters/with-table-filters',
	withTableFilters
);

/**
 * Add filters attribute to core/table block
 * @param {object} settings Block settings.
 * @param {string} name Block name.
 * @returns {object} Modified block settings.
 */
function addFiltersAttribute( settings, name ) {
	if ( name !== 'core/table' ) {
		return settings;
	}

	return {
		...settings,
		attributes: {
			...settings.attributes,
			filters: {
				type: 'array',
				items: {
					type: 'number',
				},
				default: [],
			},
			filtersData: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						column: { type: 'number' },
						label: { type: 'string' },
						values: {
							type: 'array',
							items: {
								type: 'string',
							},
						},
					},
				},
				default: [],
			},
		},
	};
}

addFilter(
	'blocks.registerBlockType',
	'table-filters/add-filters-attribute',
	addFiltersAttribute
);
