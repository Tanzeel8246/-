<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class GEC_Layout_Validator {
    private $allowed_visual_types = array( 'hero-split', 'feature-grid', 'centered-cta' );

    public function validate( $data ) {
        if ( ! is_array( $data ) ) {
            return new WP_Error( 'invalid_json', __( 'Invalid response JSON.', 'gemini-elementor-copilot' ) );
        }

        $title      = ! empty( $data['suggestion_title'] ) ? sanitize_text_field( $data['suggestion_title'] ) : __( 'AI Layout Suggestions', 'gemini-elementor-copilot' );
        $reasoning  = ! empty( $data['reasoning'] ) ? sanitize_text_field( $data['reasoning'] ) : __( 'Generated based on current page context.', 'gemini-elementor-copilot' );
        $variations = $this->extract_variations( $data );

        $sanitized = array(
            'suggestion_title' => $title,
            'reasoning'        => $reasoning,
            'variations'       => array(),
        );

        foreach ( array_slice( $variations, 0, 3 ) as $index => $variation ) {
            $name   = ! empty( $variation['name'] ) ? sanitize_text_field( $variation['name'] ) : sprintf( 'Variation %d', ( $index + 1 ) );
            $visual = ! empty( $variation['visual_type'] ) ? sanitize_key( $variation['visual_type'] ) : 'centered-cta';
            if ( ! in_array( $visual, $this->allowed_visual_types, true ) ) {
                $visual = 'centered-cta';
            }

            $raw_elements = isset( $variation['data'] ) ? $variation['data'] : array();
            $elements     = $this->sanitize_elements( is_array( $raw_elements ) ? $raw_elements : array() );

            if ( empty( $elements ) ) {
                continue;
            }

            $sanitized['variations'][] = array(
                'name'        => $name,
                'visual_type' => $visual,
                'data'        => $elements,
            );
        }

        if ( empty( $sanitized['variations'] ) ) {
            return new WP_Error( 'no_valid_variations', __( 'No valid layout variation returned.', 'gemini-elementor-copilot' ) );
        }

        return $sanitized;
    }

    private function extract_variations( $data ) {
        if ( ! empty( $data['variations'] ) && is_array( $data['variations'] ) ) {
            return $data['variations'];
        }

        if ( ! empty( $data['layouts'] ) && is_array( $data['layouts'] ) ) {
            return $data['layouts'];
        }

        if ( ! empty( $data['data'] ) && is_array( $data['data'] ) ) {
            return array(
                array(
                    'name'        => 'Variation 1',
                    'visual_type' => 'centered-cta',
                    'data'        => $data['data'],
                ),
            );
        }

        return array();
    }

    private function sanitize_elements( $elements ) {
        $safe = array();

        foreach ( $elements as $el ) {
            if ( ! is_array( $el ) ) {
                continue;
            }

            $widget_type_raw = '';
            if ( ! empty( $el['widgetType'] ) ) {
                $widget_type_raw = (string) $el['widgetType'];
            } elseif ( isset( $el['elType'] ) && 'widget' === $el['elType'] && ! empty( $el['widget_type'] ) ) {
                $widget_type_raw = (string) $el['widget_type'];
            }

            $is_widget = '' !== $widget_type_raw;
            $entry     = array(
                'id'       => substr( md5( uniqid( (string) wp_rand(), true ) ), 0, 7 ),
                'elType'   => $is_widget ? 'widget' : 'container',
                'settings' => array(),
                'elements' => array(),
            );

            if ( ! empty( $el['settings'] ) && is_array( $el['settings'] ) ) {
                $entry['settings'] = $this->sanitize_settings( $el['settings'] );
            }

            if ( $is_widget ) {
                $widget_type = str_replace( '.default', '', sanitize_key( $widget_type_raw ) );
                if ( '' === $widget_type ) {
                    continue;
                }
                $entry['widgetType'] = $widget_type;
                $entry['settings']   = $this->with_widget_defaults( $widget_type, $entry['settings'] );
            }

            if ( ! empty( $el['elements'] ) && is_array( $el['elements'] ) ) {
                $entry['elements'] = $this->sanitize_elements( $el['elements'] );
            }

            // Skip only truly empty containers.
            if ( 'container' === $entry['elType'] && empty( $entry['elements'] ) && empty( $entry['settings'] ) ) {
                continue;
            }

            $safe[] = $entry;
        }

        return $safe;
    }

    private function sanitize_settings( $settings ) {
        $clean = array();

        foreach ( $settings as $key => $value ) {
            $safe_key = preg_replace( '/[^a-zA-Z0-9_\-]/', '', (string) $key );
            if ( '' === $safe_key ) {
                continue;
            }

            if ( is_scalar( $value ) ) {
                $clean[ $safe_key ] = sanitize_text_field( (string) $value );
            } elseif ( is_array( $value ) ) {
                $clean[ $safe_key ] = $this->sanitize_settings( $value );
            }
        }

        return $clean;
    }

    private function with_widget_defaults( $widget_type, $settings ) {
        if ( 'heading' === $widget_type && empty( $settings['title'] ) ) {
            $settings['title'] = 'Sample Heading';
        }

        if ( 'text-editor' === $widget_type && empty( $settings['editor'] ) ) {
            $settings['editor'] = 'Sample text content';
        }

        if ( 'button' === $widget_type && empty( $settings['text'] ) ) {
            $settings['text'] = 'Learn More';
        }

        if ( 'image' === $widget_type && empty( $settings['image']['url'] ) ) {
            $settings['image'] = array(
                'url' => 'https://via.placeholder.com/600x400?text=Preview+Image',
            );
        }

        return $settings;
    }
}
