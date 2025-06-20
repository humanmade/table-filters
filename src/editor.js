import { BlockControls } from '@wordpress/block-editor';
import { ToolbarGroup, DropdownMenu } from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { createRoot, Fragment, useMemo, useEffect } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import { funnel, seen, unseen } from '@wordpress/icons';

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

	const FiltersElement = useMemo( () => {
		if ( filters.length === 0 ) {
			return () => null;
		}
		return () => (
			<Fragment>
				{ filters.map( idx => (
					<div className="wp-block-table__filter" inert="true">
						<label htmlFor={ `table-filter-${ idx }` }>{ columnHeaders[ idx ] || `Column ${ idx + 1 }` }</label>
						<select name={ `table-filter-${ idx }` }><option>{ __( 'All', 'table-filters' ) }</option></select>
					</div>
				) ) }
			</Fragment>
		);
	}, [ filters, columnHeaders ] );

	// Inject the filters.
	useEffect( () => {
		const tableBlock = document.querySelector( `#block-${ props.clientId }` );
		const filtersWrapper = tableBlock.querySelector( '.wp-block-table__filters' ) || document.createElement( 'div' );
		filtersWrapper.className = 'wp-block-table__filters';

		if ( tableBlock && filters.length === 0 && tableBlock.querySelector( '.wp-block-table__filters' ) ) {
			filtersWrapper.remove();
			return;
		}

		if ( tableBlock && ! tableBlock.querySelector( '.wp-block-table__filters' ) ) {
			tableBlock.prepend( filtersWrapper );
		}

		const root = createRoot( filtersWrapper );
		root.render( <FiltersElement /> );
	}, [ props.clientId, filters.length, FiltersElement ] );

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
