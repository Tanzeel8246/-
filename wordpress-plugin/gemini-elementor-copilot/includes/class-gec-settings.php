<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class GEC_Settings {
    const OPTION_GROUP = 'gec_settings_group';

    public function __construct() {
        add_action( 'admin_menu', array( $this, 'add_menu' ) );
        add_action( 'admin_init', array( $this, 'register_settings' ) );
    }

    public function add_menu() {
        add_options_page(
            esc_html__( 'Elementor AI Copilot', 'gemini-elementor-copilot' ),
            esc_html__( 'AI Copilot', 'gemini-elementor-copilot' ),
            'manage_options',
            'gec-settings',
            array( $this, 'render_page' )
        );
    }

    public function register_settings() {
        register_setting( self::OPTION_GROUP, 'gec_provider', array( $this, 'sanitize_provider' ) );
        register_setting( self::OPTION_GROUP, 'gec_gemini_api_key', array( $this, 'sanitize_text' ) );
        register_setting( self::OPTION_GROUP, 'gec_groq_api_key', array( $this, 'sanitize_text' ) );
        register_setting( self::OPTION_GROUP, 'gec_gemini_model', array( $this, 'sanitize_text' ) );
        register_setting( self::OPTION_GROUP, 'gec_groq_model', array( $this, 'sanitize_text' ) );
        register_setting( self::OPTION_GROUP, 'gec_timeout', array( $this, 'sanitize_timeout' ) );
    }

    public function sanitize_text( $value ) {
        return sanitize_text_field( (string) $value );
    }

    public function sanitize_provider( $value ) {
        $allowed = array( 'groq', 'gemini' );
        $value   = sanitize_key( (string) $value );
        return in_array( $value, $allowed, true ) ? $value : 'groq';
    }

    public function sanitize_timeout( $value ) {
        $timeout = absint( $value );
        if ( $timeout < 10 ) {
            $timeout = 10;
        }
        if ( $timeout > 120 ) {
            $timeout = 120;
        }
        return $timeout;
    }

    public function render_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }

        $provider = get_option( 'gec_provider', 'groq' );
        ?>
        <div class="wrap">
            <h1><?php echo esc_html__( 'Elementor AI Copilot Settings', 'gemini-elementor-copilot' ); ?></h1>
            <p><?php echo esc_html__( 'For high-volume free testing, set provider to Groq first and keep Gemini as fallback.', 'gemini-elementor-copilot' ); ?></p>

            <form method="post" action="options.php">
                <?php settings_fields( self::OPTION_GROUP ); ?>

                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="gec_provider"><?php echo esc_html__( 'AI Provider', 'gemini-elementor-copilot' ); ?></label></th>
                        <td>
                            <select id="gec_provider" name="gec_provider">
                                <option value="groq" <?php selected( $provider, 'groq' ); ?>>Groq</option>
                                <option value="gemini" <?php selected( $provider, 'gemini' ); ?>>Gemini</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="gec_groq_api_key">Groq API Key</label></th>
                        <td><input id="gec_groq_api_key" type="password" class="regular-text" name="gec_groq_api_key" value="<?php echo esc_attr( get_option( 'gec_groq_api_key', '' ) ); ?>" /></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="gec_groq_model">Groq Model</label></th>
                        <td><input id="gec_groq_model" type="text" class="regular-text" name="gec_groq_model" value="<?php echo esc_attr( get_option( 'gec_groq_model', 'llama-3.1-8b-instant' ) ); ?>" /></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="gec_gemini_api_key">Gemini API Key</label></th>
                        <td><input id="gec_gemini_api_key" type="password" class="regular-text" name="gec_gemini_api_key" value="<?php echo esc_attr( get_option( 'gec_gemini_api_key', '' ) ); ?>" /></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="gec_gemini_model">Gemini Model</label></th>
                        <td><input id="gec_gemini_model" type="text" class="regular-text" name="gec_gemini_model" value="<?php echo esc_attr( get_option( 'gec_gemini_model', 'models/gemini-1.5-flash' ) ); ?>" /></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="gec_timeout"><?php echo esc_html__( 'Request Timeout (seconds)', 'gemini-elementor-copilot' ); ?></label></th>
                        <td><input id="gec_timeout" type="number" min="10" max="120" name="gec_timeout" value="<?php echo esc_attr( get_option( 'gec_timeout', 45 ) ); ?>" /></td>
                    </tr>
                </table>

                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
}
