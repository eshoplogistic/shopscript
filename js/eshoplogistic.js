if (typeof window.waOrder !== 'undefined') {

    let esl = {
        items: {
            widget_id: 'eShopLogisticStatic',
            esldata_field_id: 'wahtmlcontrol_details_custom_widget_city_esl',
            esldata_to_id: 'js-city-field',
            esldata_offers_id: 'wahtmlcontrol_details_custom_widget_offers_esl',
            esldata_deliveries_id: 'wahtmlcontrol_details_custom_esldata_deliveries',
            esldata_data: 'wahtmlcontrol_details_custom_esldata_data',
            payments: 'card',
            esl_search_block_id: 'esl_search_block'
        },
        type_delivery_default: {
            terminal: 'pickup',
            postrf: 'post',
            door: 'todoor',
        },
        type_delivery_ss: '',
        current: {payment_id: null, delivery_id: null},
        widget_offers: '',
        widget_city: {name: null, type: null, fias: null, services: {}},
        widget_payment: {key: ''},
        form: window.waOrder.form,
        data_form: '',
        prev_action: '',
        request: function (action) {
            return new Promise(function (resolve, reject) {
                if (!window.eslOrder) {
                    window.eslOrder = esl;
                }

                if (window.eslOrder.prev_action !== action) {
                    window.eslOrder.prev_action = action
                    document.getElementById(esl.items.esldata_data).value = action

                    let name_type_delivery = "[data-id=" + esl.type_delivery_default[esl.type_delivery_ss] + "]"
                    if(name_type_delivery)
                        document.querySelectorAll(name_type_delivery)[0].click()

                    esl.form.update({
                        "data": [
                            {
                                "name": "use_session_input",
                                "value": "1"
                            },
                            {
                                "name": "esljson",
                                "value": "1"
                            },
                            {
                                "name": "esldata",
                                "value": action
                            },
                        ]
                    })
                }

            })
        },
        check: function () {
            const current_payment = document.querySelector('input[name="payment[id]"]:checked'),
                list_payment = JSON.parse(document.getElementById('wahtmlcontrol_details_custom_esldata_payment').value)

            let check = true
            if(!current_payment) {
                console.log('ESL: Нет ни одного варианта оплаты')
                let all_payment_name = document.querySelector('input[name="payment[id]"]')
                if(all_payment_name){
                    all_payment_name = all_payment_name.parentElement.parentElement.getElementsByClassName('wa-payment-name')[0].getElementsByTagName('a')[0]
                    all_payment_name = all_payment_name.innerHTML
                    this.current.payment_id = list_payment[all_payment_name]
                    console.log('ESL: Выбран первый элемент из списка - '+all_payment_name+' ('+this.current.payment_id+')')
                }else{
                    console.log('ESL: Элемент оплаты не найден. Выбран "card" по умолчанию')
                }
            } else {
                let payment_name = current_payment.parentElement.parentElement.getElementsByClassName('wa-payment-name')[0].getElementsByTagName('a')[0]
                payment_name = payment_name.innerHTML
                this.current.payment_id = list_payment[payment_name]
            }

            return check
        },
        prepare: function () {
            const to = JSON.parse(document.getElementById(this.items.esldata_field_id).value)
            this.widget_offers = document.getElementById(this.items.esldata_offers_id).value
            this.widget_city.type = to.type
            this.widget_city.name = to.name
            this.widget_city.fias = to.fias
            this.widget_city.services = to.services
            this.widget_payment.key = (this.current.payment_id)?this.current.payment_id:'card'
            this.widget_payment.active = true
        },
        run: async function (reload = '') {

            if (!this.check()) {
                return false
            }

            const widget = document.getElementById(this.items.widget_id)
            const selected_ss_shipping = document.querySelectorAll('.wa-type-wrapper.is-active ')
            let ss_type_shipping = ''
            selected_ss_shipping.forEach.call(selected_ss_shipping, function (el) {
                ss_type_shipping = el.getAttribute('data-id')
            })
            let tmp = esl.type_delivery_default;
            for (let key in tmp) {
                if(tmp[key] === ss_type_shipping){
                    ss_type_shipping = key;
                }
            }

            if(window.eslShipping !== ss_type_shipping){
                window.eslForm = ''
            }

            window.eslShipping = ss_type_shipping

            this.prepare()
            let detail = {
                city: this.widget_city,
                delivery: ss_type_shipping,
                payment: this.widget_payment,
                offers: this.widget_offers
            }

            if (window.eslForm) {
                let element = document.getElementById('eShopLogisticStatic')
                let parent = element.parentNode
                parent.insertBefore(window.eslForm, element)
                parent.removeChild(element)
                detail = {
                    payment: this.widget_payment
                }

                if(ss_type_shipping !== 'postrf')
                    document.getElementById('eShopLogisticStatic').dispatchEvent(new CustomEvent('eShopLogistic:reload', {detail}))
            } else {
                widget.dispatchEvent(new CustomEvent('eShopLogistic:load', {detail}))
            }
        },
        confirm: async function (response) {
            const esldata_deliveries = JSON.parse(document.getElementById(this.items.esldata_deliveries_id).value)
            ms_delivery_item = document.getElementById('delivery_' + esldata_deliveries[response.keyDelivery]),
                current_delivery = document.querySelector('input[name=delivery]:checked'),
                delivery_info_elements = ['mode', 'time', 'service', 'address', 'comment', 'payment', 'payment-comment']

            document.getElementById('wahtmlcontrol_details_custom_widget_terminal_esl').value = ''

            esldata = {
                price: 0,
                time: '',
                name: response.name,
                key: response.keyShipper,
                mode: response.keyDelivery,
                address: '',
                comment: ''
            }

            if (response.comment) {
                esldata.comment = response.comment
            }

            if (response.keyDelivery === 'postrf') {
                esldata.price = response.terminal.price
                esldata.time = response.terminal.time
                if (response.terminal.comment) {
                    esldata.comment += '<br>' + response.terminal.comment
                }
            } else {
                esldata.price = response[response.keyDelivery].price
                esldata.time = response[response.keyDelivery].time
                if (response[response.keyDelivery].comment) {
                    esldata.comment += '<br>' + response[response.keyDelivery].comment
                }
            }

            if (response.deliveryAddress) {
                esldata.address = response.deliveryAddress.code + ' ' + response.deliveryAddress.address
            } else {
                if (response.currentAddress) {
                    esldata.address = response.currentAddress
                }
            }

            await this.request(JSON.stringify(esldata))

        },
        setTerminal: function (response) {
            const terminal = document.getElementById('wahtmlcontrol_details_custom_widget_terminal_esl'),
                info = document.getElementById('esl-info-address')
            if (response.keyDelivery === 'terminal') {
                terminal.value = response.deliveryAddress.code + ' ' + response.deliveryAddress.address
                if (info) {
                    setTimeout(function () {
                        info.innerHTML = response.deliveryAddress.address
                    }, 500)
                }
            } else {
                if (info) {
                    info.parentElement.style.display = 'none'
                }
                terminal.value = ''
            }
        },
        error: function (response) {
            console.log('Ошибка виджета, включен дефолтный режим доставки', response)
            esl.form.update({
                "data": [
                    {
                        "name": "use_session_input",
                        "value": "1"
                    },
                    {
                        "name": "esljson",
                        "value": "false"
                    },
                ]
            })
        },
    }


    function eslRun() {
        const default_city = document.querySelectorAll('[name="region[city]"]')
        const terminal_field = document.querySelectorAll('[data-visible_esl="0"]')
        document.getElementById('wahtmlcontrol_details_custom_widget_terminal_esl').parentElement.style['width'] = '100%'
        let check_pvz = true
        default_city.forEach.call(default_city, function (el) {
            this.oninput = function () {
                window.eslForm = ''
            }
        })
        terminal_field.forEach.call(terminal_field, function (el) {
            el.parentElement.style["display"] = "none";
            check_pvz = false
        })
        if(check_pvz){
            let tmpStreet = document.querySelectorAll('[name="details[shipping_address][street]"]')
            tmpStreet.forEach.call(tmpStreet, function (el) {
                el.parentElement.style["display"] = "none";
                check_pvz = true
            })
        }

        if(window.selectedService && window.selectedService.hasOwnProperty('keyDelivery')) {
            let nameService = window.selectedService.keyDelivery
            if(nameService !== 'postrf'){
                let tmpZip = document.querySelectorAll('[name="details[shipping_address][zip]"]')
                tmpZip.forEach.call(tmpZip, function (el) {
                    el.parentElement.style["display"] = "none";
                    check_pvz = true
                })
            }
        }



        if(typeof window.selectedData !== 'undefined'){
            document.getElementById('wahtmlcontrol_details_custom_esldata_selected_response').value = window.selectedData
        }

        esl.run()
    }


    document.addEventListener('eShopLogistic:ready', () => {
        eShopLogistic.onDataUpdate = function (response) {
            //console.log('onDataUpdate', response)
            let response_price = response[window.eslShipping]
            if(response_price && response_price.hasOwnProperty('price')){
                if(window.selectedService && window.selectedService.hasOwnProperty('keyShipper')){
                    let nameService = window.selectedService.keyShipper
                    let nameTmp = response.service

                    if(nameService === nameTmp){
                        window.selectedData = JSON.stringify(
                            {
                                price: response_price.price
                            }
                        )
                    }

                }
            }
        }
        eShopLogistic.onSelectedPayment = function (response) {
            console.log('onSelectedPayment', response)
        }
        eShopLogistic.onSelectedPVZ = function (response) {
            console.log('onSelectedPVZ', response)
            esl.setTerminal(response)
        }
        eShopLogistic.onError = function (response) {
            esl.error(response)
            document.dispatchEvent(new CustomEvent('esl2onError', {detail: response}))
        }
        eShopLogistic.onSelectedService = function (response) {
            console.log('onSelectedService', response)
            window.selectedService = response
            esl.type_delivery_ss = response.keyDelivery
            let type_delivery = esl.type_delivery_ss
            if(type_delivery === 'postrf'){
                type_delivery = 'terminal'
            }

            if(response.price){
                window.selectedData = JSON.stringify(
                    {
                        price: response.price
                    }
                )
            }
            if(response[type_delivery].price){
                window.selectedData = JSON.stringify(
                    {
                        price: response[type_delivery].price
                    }
                )
            }

            document.getElementById('wahtmlcontrol_details_custom_esldata_selected_response').value = window.selectedData
            document.querySelectorAll('[name="shipping[type_id]"]')[0].value = esl.type_delivery_default[esl.type_delivery_ss];

            controller.$wrapper.data("ready").promise().then(function (controller) {
                window.eslForm = document.getElementById('eShopLogisticStatic')
                esl.confirm(response)
            });
        }

    })
    let css = ['https://api.eshoplogistic.ru/widget/cart/v1/css/app.css'],
        js = ['https://api.eshoplogistic.ru/widget/cart/v1/js/chunk-vendors.js', 'https://api.eshoplogistic.ru/widget/cart/v1/js/app.js'];

    for (const path of css) {
        let style = document.createElement('link');
        style.rel = "stylesheet"
        style.href = path
        document.body.appendChild(style)
    }
    for (const path of js) {
        let script = document.createElement('script');
        script.src = path
        document.body.appendChild(script)
    }

    var controller = $("#js-order-form").data("controller")
    controller.$wrapper.data("ready").promise().then(function (controller) {
        esl.data_form = controller.getFormData()
        setTimeout(eslRun, 200)
    });
} else {
    window.addEventListener('load', function(event) {
        eslRun()
    });
    var esl = {
        shipping_id: document.querySelectorAll('[name="shipping_id"]')[0].value,
        items: {
            widget_id: 'eShopLogisticStatic',
            esldata_field_id: 'wahtmlcontrol_shipping_'+esl.shipping_id+'_widget_city_esl',
            esldata_to_id: 'js-city-field',
            esldata_offers_id: 'wahtmlcontrol_shipping_'+esl.shipping_id+'_widget_offers_esl',
            esldata_deliveries_id: 'wahtmlcontrol_shipping_'+esl.shipping_id+'_esldata_deliveries',
            esldata_data: 'wahtmlcontrol_shipping_'+esl.shipping_id+'_esldata_data',
            payments: 'cashless',
            esl_search_block_id: 'esl_search_block'
        },
        type_delivery_default: {
            terminal: 'pickup',
            postrf: 'post',
            door: 'delivery',
        },
        type_delivery_ss: '',
        current: { payment_id: null, delivery_id: null },
        widget_offers: '',
        widget_city: { name: null, type: null, fias: null, services: {} },
        widget_payment: { key: 'card' },
        request: function (action) {
            return new Promise(function (resolve, reject) {
                const request = new XMLHttpRequest()
                request.open('POST', '/shop/data/shipping/', true)
                request.responseType = 'json'
                request.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
                request.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
                request.send(action)
                request.addEventListener("readystatechange", () => {
                    if (request.readyState === 4 && request.status === 200) {
                        resolve(request.response)
                    }
                })
            })
        },
        check: function () {
            const elements = ['widget_id','no_delivery_id','esldata_to_id','esldata_deliveries_id'],
                current_payment = document.querySelector('input[name=payment]:checked'),
                current_delivery = document.querySelector('input[name=delivery]:checked')

            let check = true

            return check
        },
        prepare: function () {
            const to = JSON.parse(document.getElementById(this.items.esldata_field_id).value),
                offers = document.getElementById(this.items.esldata_offers_id).value


            this.widget_offers = offers
            this.widget_city.type = to.type
            this.widget_city.name = to.name
            this.widget_city.fias = to.fias
            this.widget_city.services = to.services

        },
        run: async function (reload = '') {

            if (!this.check()) {
                return false
            }

            const widget = document.getElementById(this.items.widget_id)

            this.prepare()

            let detail = {
                city: this.widget_city,
                payment: this.widget_payment,
                offers: this.widget_offers
            }

            if(reload.length != 0) {
                switch (reload) {
                    case 'offers':
                        let offers = await this.request('cart=1')
                        detail = {
                            offers: JSON.stringify(offers)
                        }
                        break
                    case 'payment':
                        detail = {
                            payment: this.widget_payment
                        }
                        break
                    case 'city':
                        detail = {
                            city: this.widget_city
                        }
                        break
                }
                widget.dispatchEvent(new CustomEvent('eShopLogistic:reload', {detail}))
            }
            else {
                widget.dispatchEvent(new CustomEvent('eShopLogistic:load', {detail}))
            }
        },
        confirm:  async function (response) {
            const esldata_field = document.getElementById(this.items.esloutdata_field_id),
                esldata_deliveries = JSON.parse(document.getElementById(this.items.esldata_deliveries_id).value)
                ms_delivery = esldata_deliveries[response.keyDelivery],
                ms_delivery_item = document.getElementById('delivery_' + esldata_deliveries[response.keyDelivery]),
                current_delivery = document.querySelector('input[name=delivery]:checked'),
                delivery_info_elements = ['mode', 'time', 'service', 'address', 'comment', 'payment', 'payment-comment']


            esldata = {
                price: 0,
                time: '',
                name: response.name,
                key: response.keyShipper,
                mode: response.keyDelivery,
                address: '',
                comment: ''
            }

            if (response.comment) {
                esldata.comment = response.comment
            }

            if(response.keyDelivery === 'postrf') {
                esldata.price = response.terminal.price
                esldata.time = response.terminal.time
                if (response.terminal.comment) {
                    esldata.comment += '<br>' + response.terminal.comment
                }
            } else {
                esldata.price = response[response.keyDelivery].price
                esldata.time = response[response.keyDelivery].time
                if (response[response.keyDelivery].comment) {
                    esldata.comment += '<br>' + response[response.keyDelivery].comment
                }
            }

            if (response.deliveryAddress) {
                esldata.address = response.deliveryAddress.code + ' ' + response.deliveryAddress.address
            } else {
                if (response.currentAddress) {
                    esldata.address = response.currentAddress
                }
            }

            let result = await this.request('shipping_id='+esl.shipping_id+'&esljson=1&esldata='+JSON.stringify(esldata))
            document.getElementsByClassName('js-price')[0].innerHTML = esldata.price+' <span class="ruble">₽</span>'
        },
        setTerminal: function (response) {
            const terminal = document.getElementById('wahtmlcontrol_shipping_'+esl.shipping_id+'_widget_terminal_esl'),
                info = document.getElementById('esl-info-address')

            if(response.keyDelivery == 'terminal') {
                terminal.value = response.deliveryAddress.code + ' ' + response.deliveryAddress.address
                if(info) {
                    setTimeout(function () {
                        info.innerHTML = response.deliveryAddress.address
                    }, 500)
                }
            } else {
                if(info) {
                    info.parentElement.style.display = 'none'
                }
                terminal.value = ''
            }
        },
        error: function (response) {
            console.log('Ошибка виджета, включен дефолтный режим доставки', response)
        },
    }

    function eslRun() {

        document.getElementsByClassName('s-shipping-details')[0].style['display'] = 'none';
        esl.run()
    }


    document.addEventListener('eShopLogistic:ready', () => {
        eShopLogistic.onSelectedPVZ = function (response) {
            console.log('onSelectedPVZ', response)
            esl.setTerminal(response)
        }
        eShopLogistic.onError = function (response) {
            esl.error(response)
            document.dispatchEvent(new CustomEvent('esl2onError', {detail: response }))
        }
        eShopLogistic.onSelectedService = function (response) {
            console.log('onSelectedService', response)
            esl.type_delivery_ss = response.keyDelivery
            const select = document.getElementsByClassName('s-shipping-select')[0].getElementsByTagName('option');
            for (let i = 0; i < select.length; i++) {
                if (select[i].value === esl.type_delivery_default[esl.type_delivery_ss]) select[i].selected = true;
            }
            let terminal_field = document.getElementById('wahtmlcontrol_shipping_'+esl.shipping_id+'_widget_terminal_esl')
            terminal_field.value = ""
            terminal_field.setAttribute("readonly", true)
            if (esl.type_delivery_ss === 'terminal') {
                terminal_field.parentElement.parentElement.parentElement.parentElement.style["display"] = "block"
            }else{
                terminal_field.parentElement.parentElement.parentElement.parentElement.style["display"] = "none"
            }
            esl.confirm(response)
            document.dispatchEvent(new CustomEvent('esl2onSelectedService', {detail: response }))
        }
    })

    let css = ['https://api.eshoplogistic.ru/widget/cart/v1/css/app.css'],
        js = ['https://api.eshoplogistic.ru/widget/cart/v1/js/chunk-vendors.js', 'https://api.eshoplogistic.ru/widget/cart/v1/js/app.js'];

    for (const path of css) {
        let style = document.createElement('link');
        style.rel = "stylesheet"
        style.href = path
        document.body.appendChild(style)
    }
    for (const path of js) {
        let script = document.createElement('script');
        script.src = path
        document.body.appendChild(script)
    }

}