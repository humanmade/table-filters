import './style.css';

document.querySelectorAll( '.wp-block-table__filters' ).forEach( filterBlock => {
	filterBlock.querySelectorAll( 'select[data-column]' ).forEach( select => {
		const columnIndex = parseInt( select.getAttribute( 'data-column' ), 10 );
		const table = filterBlock.nextElementSibling;
		if ( ! table || ! table.matches( 'table' ) ) {
			return;
		}

		const thead = table.querySelector( 'thead' );
		const tbody = table.querySelector( 'tbody' );
		if ( ! tbody ) {
			return;
		}

		select.addEventListener( 'change', () => {
			const selectedValue = select.value;

			Array.from( tbody.rows ).forEach( ( row, rowIndex ) => {
				if ( ! thead && rowIndex === 0 ) {
					return;
				}

				const cell = row.cells[ columnIndex ];
				if ( ! cell ) {
					return;
				}

				if ( selectedValue === '' || cell.textContent.includes( selectedValue ) ) {
					row.style.display = '';
				} else {
					row.style.display = 'none';
				}
			} );
		} );
	} );
} );
