<?php

class eshoplogisticShippingGetSettings
{
    protected $esl = null;

    public function __construct(eshoplogisticShipping $esl)
    {
        $this->esl = $esl;
    }

    /**
     * @param array $params
     * @return string
     */
    public function getHtml($params = array())
    {
        $view = wa()->getView();
        $deletable_params = array();

        $view->assign($deletable_params + array(
                'obj'                   => $this->esl,
                'settings'              => $this->esl->getSettings(),
                'namespace'             => waHtmlControl::makeNamespace($params),
            ));
        $path = $this->esl->getPluginPath();
        $html = $view->fetch($path.'/templates/settings.html');
        return $html;
    }

    protected function getApiManager()
    {
        return new eshoplogisticShippingApi($this->esl->token, $this->esl->api_url, $this->esl);
    }

}
