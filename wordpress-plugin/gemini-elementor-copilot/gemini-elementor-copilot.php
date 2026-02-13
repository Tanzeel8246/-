<?php
/**
 * Plugin Name: Gemini Elementor Copilot
 * Description: AI Copilot for Elementor with provider switching (Groq/Gemini), secure AJAX handling, and validated layout generation.
 * Version: 1.0.0
 * Author: Coding Partner
 * Text Domain: gemini-elementor-copilot
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'GEC_PLUGIN_FILE', __FILE__ );
define( 'GEC_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'GEC_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'GEC_VERSION', '1.0.0' );

require_once GEC_PLUGIN_DIR . 'includes/class-gec-settings.php';
require_once GEC_PLUGIN_DIR . 'includes/class-gec-layout-validator.php';
require_once GEC_PLUGIN_DIR . 'includes/class-gec-provider-interface.php';
require_once GEC_PLUGIN_DIR . 'includes/class-gec-provider-gemini.php';
require_once GEC_PLUGIN_DIR . 'includes/class-gec-provider-groq.php';
require_once GEC_PLUGIN_DIR . 'includes/class-gec-controller.php';

final class Gemini_Elementor_Copilot {
    /** @var Gemini_Elementor_Copilot|null */
    private static $instance = null;

    /** @return Gemini_Elementor_Copilot */
    public static function instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    private function __construct() {
        new GEC_Settings();
        new GEC_Controller( new GEC_Layout_Validator() );
    }
}

Gemini_Elementor_Copilot::instance();
