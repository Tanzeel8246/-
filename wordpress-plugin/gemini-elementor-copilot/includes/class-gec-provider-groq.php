<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class GEC_Provider_Groq implements GEC_Provider_Interface {
    public function generate( $prompt ) {
        $api_key = trim( (string) get_option( 'gec_groq_api_key', '' ) );
        $model   = trim( (string) get_option( 'gec_groq_model', 'llama-3.1-8b-instant' ) );
        $timeout = absint( get_option( 'gec_timeout', 45 ) );

        if ( '' === $api_key ) {
            return array( 'success' => false, 'error' => __( 'Groq API key is missing.', 'gemini-elementor-copilot' ) );
        }

        $url  = 'https://api.groq.com/openai/v1/chat/completions';
        $body = array(
            'model'       => $model,
            'temperature' => 0.4,
            'messages'    => array(
                array(
                    'role'    => 'system',
                    'content' => 'Return only valid JSON. No markdown fences.',
                ),
                array(
                    'role'    => 'user',
                    'content' => $prompt,
                ),
            ),
        );

        $response = wp_remote_post(
            $url,
            array(
                'body'      => wp_json_encode( $body ),
                'headers'   => array(
                    'Content-Type'  => 'application/json',
                    'Authorization' => 'Bearer ' . $api_key,
                ),
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
            $message = isset( $decoded['error']['message'] ) ? $decoded['error']['message'] : __( 'Groq request failed.', 'gemini-elementor-copilot' );
            return array( 'success' => false, 'error' => sanitize_text_field( $message ) );
        }

        $content = $decoded['choices'][0]['message']['content'] ?? '';
        if ( ! is_string( $content ) || '' === trim( $content ) ) {
            return array( 'success' => false, 'error' => __( 'Groq returned empty content.', 'gemini-elementor-copilot' ) );
        }

        return array( 'success' => true, 'content' => $content );
    }
}
