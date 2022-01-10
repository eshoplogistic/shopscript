<?php

/**
 * Class eshoplogisticShipping
 * @property-read string api_url
 * @property-read string api_key
 * @property-read string widget_key
 * @property-read string widget_secret_code
 */

class eshoplogisticShipping extends waShipping
{
    const CACHE_NAME = 'sel_delivery_list';

    public $payment = array();
    private $dataTmp = array(
        'city' => array(),
        'offers' => array()
    );
    private $calcDefault = array(
        'price' => 0,
        'name' => '',
        'time' => '',
        'mode' => ''
    );
    private $services_default = array(
        'pickup' => array(
            'name' => 'Самовывоз ESL',
            'est_delivery' => '',
            'description' => 'ПВЗ',
            'currency' => 'RUB',
            'rate' => '',
            'type' => self::TYPE_PICKUP,
            'service' => '',
        ),
        'delivery' => array(
            'name' => 'Курьер ELS',
            'est_delivery' => '',
            'description' => 'Курьер',
            'currency' => 'RUB',
            'rate' => '',
            'type' => self::TYPE_TODOOR,
            'service' => '',
        ),
        'post' => array(
            'name' => 'Почта ESL',
            'est_delivery' => '',
            'description' => 'Почта',
            'currency' => 'RUB',
            'rate' => '',
            'type' => self::TYPE_POST,
            'service' => '',
        )
    );


    public function getPluginPath()
    {
        return $this->path;
    }


    public function getSettingsHTML($params = array())
    {
        $view = wa()->getView();
        $settings = new eshoplogisticShippingGetSettings($this);

        $view->assign(array(
            'obj'          => $this,
            'payment_type' => $this->getPaymentTypeSettings(),
            'payment_esl' => $this->getPaymentEslNamespace(),
            'settings'     => $settings,
            'timezones'    => waDateTime::getTimeZones(),
        ));

        $html = $settings->getHtml($params);
        $html .= parent::getSettingsHTML($params);

        return $html;
    }

    public function saveSettings($settings = array())
    {
        $api_settings = new eshoplogisticShippingApi($settings, $this);
        $api_settings->saveApiKey();

        return parent::saveSettings($settings);
    }


    public function getPaymentTypeSettings()
    {
        $payments = $this->getListPayment();
        $result = array();
        foreach ($payments as $key=>$value){
            $result[] = array(
                'value'=>$value,
                'title'=>$key
            );
        }
        return $result;
    }

    public function getPaymentEslNamespace()
    {
        return array(
            'cash'=>'cash',
            'card'=>'card',
            'cashless'=>'cashless',
            'prepay'=>'prepay',
        );
    }

    public function requestedAddressFields()
    {
        return array(
            'zip' => array('cost' => false),
            'street' => array('cost' => false),
            'city' => array('cost' => false),
            'country' => array('cost' => true),
        );
    }

    public function allowedAddress()
    {
        return array(
            array(
                'country' => 'rus',
            ),
        );
    }

    public function allowedCurrency()
    {
        return 'RUB';
    }

    public function allowedWeightUnit()
    {
        return 'kg';
    }


    protected function calculate($params = array())
    {
        $api = new eshoplogisticShippingApi($this->getSettings());
        $info = $api->getByApiMethod('info');
        if($info['blocked']){
            return [];
        }

        if(isset($_POST['details']['custom']['esldata_data']) && $_POST['details']['custom']['esldata_data']){
            $data = json_decode($_POST['details']['custom']['esldata_data'], true);
            $this->cacheResult($data);
        }
        if (isset($_POST['esljson']) && $_POST['esljson'] == '1') {
            $data = json_decode($_POST['esldata'], true);
            $this->cacheResult($data);
        }
        if (isset($_POST['esljson']) && $_POST['esljson'] == 'false') {
             return [];
        }
        $this->calcDefault = $this->getCachedResult();

        if(isset($_POST['details']['custom']['esldata_selected_response']) && $_POST['details']['custom']['esldata_selected_response']){
            $data = json_decode($_POST['details']['custom']['esldata_selected_response'], true);
            $this->calcDefault['price'] = $data['price'];
        }

        return $this->getServicesList($this->calcDefault['mode']);
    }

    /**
     * @param waOrder $order
     * @return array
     */
    public function customFields(waOrder $order)
    {
        $type_page = wa()->getEnv();
        $fields = parent::customFields($order);
        $shipping_params = $order->shipping_params;
        $shipping_address = $order->shipping_address;
        $this->payment = $this->getSettings('payment_type');
        if(!$shipping_address['city'])
            $shipping_address = $this->getAddress();

        if(!$order->items)
            $order->items = $this->getItems();

        if(!$shipping_address)
            return array();


        if ($type_page === 'frontend') {

            $api = new eshoplogisticShippingApi($this->getSettings());
            $city = $api->getByApiMethod('target', $shipping_address);
            $info = $api->getByApiMethod('search', $city['fias']);
            $cacheData = $this->getCachedResult();
            if (isset($city) && $city) {

                $services = array();
                foreach ($info['services'] as $key => $item) {
                    $services[$key] = $item;
                }

                $this->dataTmp['city'] = array(
                    'fias' => $city['fias'],
                    'name' => $city['target'],
                    'type' => $city['type'],
                    'services' => $services
                );

                if(!$order->items)
                    $order->items = array();

                foreach ($order->items as $key => $item) {
                    if(!isset($item['product_id']))
                        continue;

                    $product = new shopProduct($item['product_id']);
                    $features = $product->getFeatures();

                    $this->dataTmp['offers'][] = array(
                        'article' => $item['product_id'],
                        'name' => $item['name'],
                        'count' => $item['quantity'],
                        'price' => $item['price'],
                        'weight' => isset($features['weight']->value) ? $features['weight']->value : 1,
                    );
                }

                $fields['widget_city_esl'] = array(
                    'control_type' => waHtmlControl::HIDDEN,
                    'value' => json_encode($this->dataTmp['city']),
                );
                $fields['widget_offers_esl'] = array(
                    'control_type' => waHtmlControl::HIDDEN,
                    'value' => json_encode($this->dataTmp['offers']),
                );
                $fields['esldata_deliveries'] = array(
                    'control_type' => waHtmlControl::HIDDEN,
                    'value' => json_encode(array(self::TYPE_PICKUP, self::TYPE_TODOOR, self::TYPE_POST)),
                );
                $fields['esldata_data'] = array(
                    'control_type' => waHtmlControl::HIDDEN,
                );
                $fields['esldata_selected_response'] = array(
                    'control_type' => waHtmlControl::HIDDEN,
                );
                $fields['esldata_payment'] = array(
                    'control_type' => waHtmlControl::HIDDEN,
                    'value' =>  json_encode(self::getListPayment($this->payment)),
                );
                $this->registerControl('EslSelectControl', array($this, 'customSelectControl'));
                $fields['delivery_control'] = array(
                    'control_type' => 'EslSelectControl',
                );

            }
        }

        $styleTerminal = 0;
        $requiredTerminal = false;
        if ((isset($cacheData['mode']) && $cacheData['mode'] == 'terminal') || $type_page === 'backend'){
            $styleTerminal = 1;
            $requiredTerminal = true;
        }


        $fields['widget_terminal_esl'] = array(
            'control_type' => waHtmlControl::INPUT,
            'required' => $requiredTerminal,
            'readonly' => true,
            'class' => 'long',
            'title' => 'Пункт самовывоза (выберите на карте)',
            'value' => (isset($shipping_params['widget_terminal_esl']) && $shipping_params['widget_terminal_esl']) ? $shipping_params['widget_terminal_esl'] : '',
            'data' => array(
                'visible_esl' => $styleTerminal,
            ),

        );
        return $fields;
    }


    public function customSelectControl()
    {
        $widgetKey = $this->getSettings('widget_key');
        $widgetSecret = $this->getSettings('widget_secret_code');

        if ($widgetKey && $widgetSecret) {
            $dom = new DOMDocument();
            $divParent = $dom->createElement('div');
            $divParent->setAttribute('id', 'eShopLogisticBox');
            $div = $dom->createElement('div');
            $div->setAttribute('id', 'eShopLogisticStatic');
            $div->setAttribute('data-key', $widgetKey);
            $div->setAttribute('data-v-app', '1');
            $divParent->appendChild($div);
            $dom->appendChild($divParent);

            $script = $dom->createElement('script');
            $script->setAttribute('src', wa()->getUrl() . 'wa-plugins/shipping/eshoplogistic/js/eshoplogistic.js');
            $dom->appendChild($script);

            $link = $dom->createElement('link');
            $link->setAttribute('rel', 'stylesheet');
            $link->setAttribute('type', 'text/css');
            $link->setAttribute('href', wa()->getUrl() . 'wa-plugins/shipping/eshoplogistic/css/style.css');
            $dom->appendChild($link);

            return $dom->saveHTML();
        }
    }

    private function getServicesList($mods = '')
    {
        $services = $this->services_default;
        $services['pickup']['name'] = ($this->getSettings('pickup_name'))?$this->getSettings('pickup_name'):$services['pickup']['name'];
        $services['delivery']['name'] = ($this->getSettings('delivery_name'))?$this->getSettings('delivery_name'):$services['delivery']['name'];
        $services['post']['name'] = ($this->getSettings('post_name'))?$this->getSettings('post_name'):$services['post']['name'];

        $api = new eshoplogisticShippingApi($this->getSettings());
        $info = $api->getByApiMethod('info');
        $services = $this->infoCheckServices($info['services'], $services);

        switch ($mods) {
            case 'terminal':
                $services['pickup'] = array(
                    'name' => $services['pickup']['name'],
                    'est_delivery' => $this->calcDefault['time'],
                    'description' => 'ПВЗ',
                    'currency' => 'RUB',
                    'rate' => $this->calcDefault['price'],
                    'type' => self::TYPE_PICKUP,
                    'service' => $this->calcDefault['name'],

                );
                break;
            case 'door':
                $services['delivery'] = array(
                    'name' => $services['delivery']['name'],
                    'est_delivery' => $this->calcDefault['time'],
                    'description' => 'Курьер',
                    'currency' => 'RUB',
                    'rate' => $this->calcDefault['price'],
                    'type' => self::TYPE_TODOOR,
                    'service' => $this->calcDefault['name'],
                );
                break;
            case 'postrf':
                $services['post'] = array(
                    'name' => $services['post']['name'],
                    'est_delivery' => $this->calcDefault['time'],
                    'description' => 'Почта',
                    'currency' => 'RUB',
                    'rate' => $this->calcDefault['price'],
                    'type' => self::TYPE_POST,
                    'service' => $this->calcDefault['name'],
                );
                break;
        }


        return $services;
    }

    private function cacheResult(array $data)
    {
        $cache = $this->calcDefault;
        if (isset($data['price'])) {
            $cache = $data;
        }

        wa()->getStorage()->set(self::CACHE_NAME, $cache);

        return $cache;
    }


    private function getCachedResult()
    {
        return wa()->getStorage()->get(self::CACHE_NAME);
    }

    private function infoCheckServices($services, $servicesReturn){
        $result = array(
            'post' => false,
            'pickup' => false,
            'delivery' => false
        );
        foreach ($services as $key=>$value){
            if($key == 'postrf'){
                $result['post'] = true;
            }
            if(isset($value['terminal']) && $value['terminal']){
                $result['pickup'] = true;
            }
            if(isset($value['door']) && $value['door']){
                $result['delivery'] = true;
            }
        }

        foreach ($result as $key=>$value){
            if(!$value)
               unset($servicesReturn[$key]);
        }

        return $servicesReturn;
    }

    public static function getListPayment($paymentSettings = '')
    {
        if (!class_exists('waPayment')) {
            throw new waException(_w('Payment plugins not installed yet'));
        }
        $list = waPayment::enumerate();
        $list['dummy'] = shopPaymentDummy::dummyInfo();
        uasort($list, wa_lambda('$a, $b', 'return strcasecmp($a["name"], $b["name"]);'));

        $result = array();
        foreach ($list as $key=>$value){
            if($paymentSettings &&  isset($paymentSettings[$value['name']])){
                $val = $paymentSettings[$value['name']];
            }else{
                $val = 'card';
            }
            $result[$value['name']] = $val;
        }

        return $result;
    }

}