import './style.css';

document.querySelectorAll( '.wp-block-table__filters' ).forEach( filterBlock => {
	const selects = Array.from( filterBlock.querySelectorAll( 'select[data-column]' ) );
	const table = filterBlock.nextElementSibling;
	if ( ! table || ! table.matches( 'table' ) ) {
		return;
	}

	const thead = table.querySelector( 'thead' );
	const tbody = table.querySelector( 'tbody' );
	if ( ! tbody ) {
		return;
	}

	const filterRows = () => {
		const selections = selects.map( select => ( {
			column: parseInt( select.dataset.column, 10 ),
			value: select.value,
		} ) );

		Array.from( tbody.rows ).forEach( ( row, rowIndex ) => {
			if ( ! thead && rowIndex === 0 ) {
				return;
			}

			let show = true;

			selections.forEach( selection => {
				const cell = row.cells[ selection.column ];
				if ( ! cell ) {
					return;
				}
				if ( selection.value !== '' && ! cell.textContent.includes( selection.value ) ) {
					show = false;
				}
			} );

			row.style.display = show ? '' : 'none';
		} );
	};

	selects.forEach( select => {
		select.addEventListener( 'change', filterRows );
	} );
} );
