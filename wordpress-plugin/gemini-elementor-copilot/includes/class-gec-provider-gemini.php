<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class GEC_Provider_Gemini implements GEC_Provider_Interface {
    public function generate( $prompt ) {
        $api_key = trim( (string) get_option( 'gec_gemini_api_key', '' ) );
        $model   = trim( (string) get_option( 'gec_gemini_model', 'models/gemini-1.5-flash' ) );
        $timeout = absint( get_option( 'gec_timeout', 45 ) );

        if ( '' === $api_key ) {
            return array( 'success' => false, 'error' => __( 'Gemini API key is missing.', 'gemini-elementor-copilot' ) );
        }

        $url  = sprintf( 'https://generativelanguage.googleapis.com/v1beta/%s:generateContent?key=%s', rawurlencode( $model ), rawurlencode( $api_key ) );
        $body = array(
            'contents'         => array( array( 'parts' => array( array( 'text' => $prompt ) ) ) ),
            'generationConfig' => array(
                'temperature'      => 0.4,
                'responseMimeType' => 'application/json',
            ),
        );

        $response = wp_remote_post(
            $url,
            array(
                'body'      => wp_json_encode( $body ),
                'headers'   => array( 'Content-Type' => 'application/json' ),
                'timeout'   => max( 10, $timeout ),
                'sslverify' => true,
            )
        );

        if ( is_wp_error( $response ) ) {
            return array( 'success' => false, 'error' => $response->get_error_message() );
        }

        $status   = wp_remote_retrieve_response_code( $response );
        $raw_body = wp_remote_retrieve_body( $response );
        $decoded  = json_decode( $raw_body, true );

        if ( $status < 200 || $status >= 300 ) {
            $message = isset( $decoded['error']['message'] ) ? $decoded['error']['message'] : __( 'Gemini request failed.', 'gemini-elementor-copilot' );
            return array( 'success' => false, 'error' => sanitize_text_field( $message ) );
        }

        $content = $decoded['candidates'][0]['content']['parts'][0]['text'] ?? '';
        if ( ! is_string( $content ) || '' === trim( $content ) ) {
            return array( 'success' => false, 'error' => __( 'Gemini returned empty content.', 'gemini-elementor-copilot' ) );
        }

        return array( 'success' => true, 'content' => $content );
    }
}
