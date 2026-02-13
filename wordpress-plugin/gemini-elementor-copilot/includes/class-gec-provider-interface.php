<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

interface GEC_Provider_Interface {
    /**
     * @param string $prompt
     * @return array{success:bool,content?:string,error?:string}
     */
    public function generate( $prompt );
}
