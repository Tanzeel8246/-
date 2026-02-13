<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class GEC_Controller {
    /** @var GEC_Layout_Validator */
    private $validator;

    public function __construct( GEC_Layout_Validator $validator ) {
        $this->validator = $validator;

        add_action( 'elementor/editor/after_enqueue_scripts', array( $this, 'enqueue_editor_assets' ) );
        add_action( 'wp_ajax_gec_generate_layout', array( $this, 'ajax_generate_layout' ) );
    }

    public function enqueue_editor_assets() {
        wp_enqueue_script(
            'gec-editor-js',
            GEC_PLUGIN_URL . 'assets/editor.js',
            array( 'jquery' ),
            GEC_VERSION,
            true
        );

        wp_localize_script(
            'gec-editor-js',
            'gecVars',
            array(
                'ajaxUrl' => admin_url( 'admin-ajax.php' ),
                'nonce'   => wp_create_nonce( 'gec_nonce' ),
                'labels'  => array(
                    'copilot'   => __( 'AI Copilot', 'gemini-elementor-copilot' ),
                    'loading'   => __( 'Analyzing Page...', 'gemini-elementor-copilot' ),
                    'useLayout' => __( 'Use Layout', 'gemini-elementor-copilot' ),
                    'discard'   => __( 'Discard Suggestions', 'gemini-elementor-copilot' ),
                ),
            )
        );

        wp_register_style( 'gec-inline-style', false, array(), GEC_VERSION );
        wp_enqueue_style( 'gec-inline-style' );
        wp_add_inline_style( 'gec-inline-style', $this->get_inline_css() );
    }

    public function ajax_generate_layout() {
        check_ajax_referer( 'gec_nonce', 'security' );

        if ( ! current_user_can( 'edit_posts' ) ) {
            wp_send_json_error( __( 'Unauthorized request.', 'gemini-elementor-copilot' ), 403 );
        }

        $title   = isset( $_POST['title'] ) ? sanitize_text_field( wp_unslash( $_POST['title'] ) ) : '';
        $context = isset( $_POST['context'] ) ? sanitize_text_field( wp_unslash( $_POST['context'] ) ) : '';
        $widgets = isset( $_POST['available_widgets'] ) ? $this->sanitize_widget_list( wp_unslash( $_POST['available_widgets'] ) ) : array();

        $title   = mb_substr( $title, 0, 180 );
        $context = mb_substr( $context, 0, 500 );

        if ( '' === $title ) {
            $title = __( 'Untitled Page', 'gemini-elementor-copilot' );
        }

        $cache_key = 'gec_' . md5( wp_get_current_user()->ID . '|' . $title . '|' . $context . '|' . implode( ',', $widgets ) );
        $cached    = get_transient( $cache_key );
        if ( is_array( $cached ) && ! empty( $cached['variations'] ) ) {
            wp_send_json_success( $cached );
        }

        $provider = $this->provider_from_settings();
        $prompt   = $this->build_prompt( $title, $context, $widgets );

        $result = $provider->generate( $prompt );
        if ( empty( $result['success'] ) ) {
            wp_send_json_error( sanitize_text_field( $result['error'] ?? __( 'Generation failed.', 'gemini-elementor-copilot' ) ), 500 );
        }

        $decoded = $this->decode_json_from_model_output( (string) $result['content'] );
        $valid   = $this->validator->validate( $decoded );

        if ( is_wp_error( $valid ) ) {
            wp_send_json_error( $valid->get_error_message(), 422 );
        }

        set_transient( $cache_key, $valid, 2 * MINUTE_IN_SECONDS );
        wp_send_json_success( $valid );
    }

    private function decode_json_from_model_output( $output ) {
        $decoded = json_decode( $output, true );
        if ( is_array( $decoded ) ) {
            return $decoded;
        }

        $trimmed = trim( $output );
        $trimmed = preg_replace( '/^```(?:json)?/i', '', $trimmed );
        $trimmed = preg_replace( '/```$/', '', $trimmed );
        $trimmed = trim( $trimmed );

        $decoded = json_decode( $trimmed, true );
        if ( is_array( $decoded ) ) {
            return $decoded;
        }

        $start = strpos( $trimmed, '{' );
        $end   = strrpos( $trimmed, '}' );
        if ( false !== $start && false !== $end && $end > $start ) {
            $chunk   = substr( $trimmed, $start, ( $end - $start + 1 ) );
            $decoded = json_decode( $chunk, true );
            if ( is_array( $decoded ) ) {
                return $decoded;
            }
        }

        return array();
    }

    private function sanitize_widget_list( $raw_widgets ) {
        $items = array();

        if ( is_array( $raw_widgets ) ) {
            $items = $raw_widgets;
        } elseif ( is_string( $raw_widgets ) ) {
            $parsed = json_decode( $raw_widgets, true );
            if ( is_array( $parsed ) ) {
                $items = $parsed;
            }
        }

        $clean = array();
        foreach ( $items as $item ) {
            $key = sanitize_key( (string) $item );
            if ( '' !== $key ) {
                $clean[] = $key;
            }
        }

        return array_values( array_unique( $clean ) );
    }

    private function provider_from_settings() {
        $provider = sanitize_key( (string) get_option( 'gec_provider', 'groq' ) );
        if ( 'gemini' === $provider ) {
            return new GEC_Provider_Gemini();
        }

        return new GEC_Provider_Groq();
    }

    private function build_prompt( $title, $context, $available_widgets ) {
        $widget_instruction = '';
        if ( ! empty( $available_widgets ) ) {
            $widget_instruction = 'Prefer using these installed widget types where suitable: ' . implode( ', ', array_slice( $available_widgets, 0, 120 ) ) . '. ';
        }

        return sprintf(
            "Act as Elementor AI Copilot. Analyze title '%s' and context '%s'. Suggest 3 full section design layout options using Elementor container JSON. %sReturn JSON only with keys: suggestion_title, reasoning, variations. Each variation must include name, visual_type, and data where data is an array of container/widget nodes. Use valid Elementor widgetType names, keep nested structure complete, and avoid returning empty sections.",
            $title,
            $context,
            $widget_instruction
        );
    }

    private function get_inline_css() {
        return '
            #gec-trigger{position:fixed;bottom:30px;right:30px;z-index:999999;cursor:pointer;background:linear-gradient(135deg,#7c4dff 0%,#3d1dfc 100%);color:#fff;padding:12px 24px;border-radius:50px;font-weight:700;box-shadow:0 10px 40px rgba(61,29,252,.35);display:flex;align-items:center;gap:10px;border:2px solid #fff}
            #gec-trigger[disabled]{opacity:.65;cursor:not-allowed}
            #gec-modal{position:fixed;inset:0;z-index:99999999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75)}
            .gec-modal-body{width:min(920px,95vw);background:#fff;border-radius:16px;padding:28px}
            .gec-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:16px}
            .gec-card{border:1px solid #e7e7e7;border-radius:12px;overflow:hidden;cursor:pointer}
            .gec-card:hover{border-color:#7c4dff;transform:translateY(-2px)}
            .gec-preview{height:120px;background:#f6f7fb;display:flex;gap:8px;padding:12px;overflow:auto}
            .gec-foot{padding:12px;border-top:1px solid #efefef}
            .gec-close{margin-top:16px;background:none;border:none;color:#6d6d6d;text-decoration:underline;cursor:pointer}
        ';
    }
}
