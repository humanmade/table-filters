<?php
/**
 * Plugin Name:       Table Filters
 * Description:       Filter dropdown support for the core table block.
 * Version:           0.1.0
 * Requires at least: 6.7
 * Requires PHP:      7.4
 * Author:            Human Made Limited
 * Author URI:        https://humanmade.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       table-filters
 *
 * @package table-filters
 */

namespace HM\Table_Filters;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

function register_assets() {
	$dir_url = plugin_dir_url( __FILE__ ) . 'build/';
	$dir = plugin_dir_path( __FILE__ ) . 'build/';
	$asset_files = [
		'editor' => $dir . 'editor.asset.php',
		'view' => $dir . 'view.asset.php',
	];

	foreach ( $asset_files as $name => $asset_file ) {
		if ( file_exists( $asset_file ) ) {
			$asset = include $asset_file;
			$dependencies = isset( $asset['dependencies'] ) ? $asset['dependencies'] : [];
			$version = isset( $asset['version'] ) ? $asset['version'] : filemtime( $dir . $name . '.js' );
		} else {
			$dependencies = array( 'wp-blocks', 'wp-element', 'wp-editor', 'wp-components', 'wp-i18n' );
			$version = filemtime( $dir . $name . '.js' );
		}

		wp_register_script(
			'table-filters-' . $name . '-script',
			$dir_url . $name . '.js',
			$dependencies,
			$version
		);
	}

	wp_register_style(
		'table-filters-style',
		$dir_url . 'style-view.css',
		[],
		filemtime( $dir . 'style-view.css' )
	);
}

add_action( 'enqueue_block_assets', __NAMESPACE__ . '\\register_assets' );

/**
 * Fires when scripts and styles are enqueued.
 */
function action_wp_enqueue_scripts() : void {
	if ( has_block( 'core/table' ) ) {
		// Compat for non block themes.
		wp_enqueue_style( 'table-filters-style' );
	}
}

add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\\action_wp_enqueue_scripts' );

/**
 * Fires after block assets have been enqueued for the editing interface.
 */
function action_enqueue_block_editor_assets() : void {
	wp_enqueue_style( 'table-filters-style' );
}

add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\action_enqueue_block_editor_assets' );

/**
 * Enhance the core table block for our filter functionality.
 *
 * @param array $metadata Block registration data.
 * @return array
 */
function extend_table_block( array $metadata ) : array {
	if ( $metadata['name'] !== 'core/table' ) {
		return $metadata;
	}

	// Add editor script and style handles.
	$handles = [
		'editorScript' => 'table-filters-editor-script',
		'viewScript' => 'table-filters-view-script',
		'style' => 'table-filters-style',
	];

	foreach ( $handles as $key => $handle ) {
		$existing = isset( $settings[ $key ] ) ? (array) $metadata[ $key ] : [];
		if ( ! in_array( $handle, $existing, true ) ) {
			$existing[] = $handle;
		}
		$metadata[ $key ] = $existing;
	}

	// Add the 'filters' attribute.
	if ( ! isset( $metadata['attributes'] ) ) {
		$metadata['attributes'] = [];
	}

	$metadata['attributes']['filters'] = [
		'type'    => 'array',
		'items'   => [
			'type' => 'number',
		],
		'default' => [],
	];

	$metadata['attributes']['filtersData'] = [
		'type' => 'array',
		'items' => [
			'type' => 'object',
			'properties' => [
				'column' => [ 'type' => 'number' ],
				'label' => [ 'type' => 'string' ],
				'values' => [
					'type' => 'array',
					'items' => [
						'type' => 'string',
					],
				],
			],
		],
		'default' => [],
	];

	return $metadata;
}

add_filter( 'block_type_metadata', __NAMESPACE__ . '\\extend_table_block', 20 );

/**
 * Inject a div with class 'wp-block-table__filters' inside the figure of core/table block.
 *
 * @param string $block_content The block content about to be appended.
 * @param array  $block         The full block, including name and attributes.
 * @return string
 */
function inject_table_filters_div( $block_content, $block ) {
	static $instance = 0;

	if ( ! isset( $block['blockName'] ) || $block['blockName'] !== 'core/table' ) {
		return $block_content;
	}

	// Find the opening <figure ...> tag and inject the div right after it.
	if ( empty( $block['attrs']['filters'] ) || ! preg_match( '/<figure\b[^>]*>/', $block_content, $matches, PREG_OFFSET_CAPTURE ) ) {
		return $block_content;
	}

	$figure_tag = $matches[0][0];
	$pos = $matches[0][1] + strlen( $figure_tag );
	$filters_div = '';
	$instance++;

	// Collect filter column headers.
	$filters = $block['attrs']['filtersData'];

	if ( ! empty( $filters ) ) {
		$filters_div .= '<div class="wp-block-table__filters">';
		foreach ( $filters as $filter ) {
			$filter_name = sprintf( 'table-filter-%d-%d', $instance, $filter['column'] );
			$filters_div .= '<div class="wp-block-table__filter">';
			$filters_div .= '<label for="' . esc_attr( $filter_name ) . '">' . esc_html( $filter['label'] ) . '</label>';
			$filters_div .= '<select id="' . esc_attr( $filter_name ) . '" name="' . esc_attr( $filter_name ) . '" data-column="' . esc_attr( $filter['column'] ) . '">';
			$filters_div .= '<option value="">' . esc_html__( 'All', 'table-filters' ) . '</option>';
			sort( $filter['values'], SORT_NATURAL );
			foreach ( $filter['values'] as $option ) {
				$filters_div .= '<option value="' . esc_attr( $option ) . '">' . esc_html( $option ) . '</option>';
			}
			$filters_div .= '</select></div>';
		}
		$filters_div .= '</div>';
	} else {
		$filters_div = '';
	}

	$block_content = substr( $block_content, 0, $pos ) . $filters_div . substr( $block_content, $pos );

	return $block_content;
}

add_filter( 'render_block', __NAMESPACE__ . '\\inject_table_filters_div', 10, 2 );
