<?php

class eshoplogisticShippingApi
{

    const METHOD_TARGET = 'target';
    const METHOD_INFO = 'info';
    const METHOD_DELIVERY = 'delivery';
    const METHOD_SEARCH = 'search';
    /**
     * @var string
     */
    private $default_api_url = 'https://api.eshoplogistic.ru/api/';
    private $api_url = '';

    /**
     * @var string
     */
    protected $api_key = '';

    /**
     * @var string
     */
    protected $widget_key = '';

    /**
     * @var string
     */
    protected $widget_secret_code = '';

    /**
     * Errors from request
     * @var string
     */
    protected $errors = null;

    /**
     * @var eshoplogisticShipping $esl
     */
    protected $esl = null;
    protected $data = array();

    public function __construct($settings = '', eshoplogisticShipping $esl = null)
    {
        $this->api_key = $settings['api_key'];
        $this->widget_key = $settings['widget_key'];
        $this->widget_secret_code = $settings['widget_secret_code'];
        $this->esl = $esl;
    }

    private function generateApiUrl($path = '')
    {
        $this->api_url = $this->default_api_url . $path;
    }

    public function getByApiMethod($method, $data = '')
    {
        if ($method === self::METHOD_TARGET) {
            $result = $this->setTarget($data);
        }elseif($method === self::METHOD_INFO){
            $result = $this->infoAccount();
        }elseif($method === self::METHOD_SEARCH){
            $result = $this->searchAccount($data);
        }elseif($method === self::METHOD_DELIVERY){
            $result = $this->deliveryAccount($data);
        }else {
            $result = [];
        }

        return $result;
    }

    public function saveApiKey()
    {
        if(empty($this->api_key)) {
            throw new waException('API ключ пустой');
        }

        $result = $this->getByApiMethod('info');
        if (!$result) {
            throw new waException('API ключ некорректный');
        }

    }

    public function infoAccount()
    {
        $this->generateApiUrl('site');

        $result = $this->sendRequest($this->data);
        return $result['data'];
    }

    public function searchAccount($data)
    {
        $this->generateApiUrl('search');

        $result = $this->sendRequest(['target' => $data]);
        return $result['data'][0];
    }

    public function deliveryAccount($type, $data)
    {
        $type = 'sdek';
        $this->generateApiUrl('delivery/'.mb_strtolower($type));

        $result = $this->sendRequest($data);
        return $result['data'];
    }

    /**
     * @param array $data
     * @return array
     */
    protected function sendRequest(array $data = array())
    {
        $options = [
            'request_format' => 'default',
            'format'         => waNet::FORMAT_JSON,
            'verify'         => false,
        ];
        $data['key'] = $this->api_key;

        $net = new waNet($options);
        try {
            $result = $net->query($this->api_url, $data, waNet::METHOD_POST);
        } catch (waException $e) {
            $result = [];
        }

        $errors = $this->setErrors($result);

        if (count($result) <= 0 || $errors) {
            $result = [];
        }

        return (array)$result;
    }

    public function setTarget($data = '')
    {
        if(isset($data['fias']) && !empty($data['fias'])) {
            $this->data = [
                'fias' => $data['fias']
            ];
        }
        elseif(isset($data['city']) && !empty($data['city'])) {
            $this->data = [
                'city' => $data['city']
            ];
        }else {
            $this->data = [
                'ip' => $_SERVER['REMOTE_ADDR']
            ];
        }

        $this->generateApiUrl('target');
        $result =  $this->sendRequest($this->data);
        return $result['data'];
    }


    /**
     * @param $result
     * @return bool
     */
    protected function setErrors($result)
    {
        if (isset($result[0]['err'])) {
            $this->errors = $result[0]['err'];
        }

        if (isset($result['err'])) {
            $this->errors = $result['err'];
        }

        return (bool)$this->errors;
    }



}