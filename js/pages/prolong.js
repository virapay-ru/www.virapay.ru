(async () => {

    const sessionKey = `/${location.hostname}/sessionV2`
    const sessionTransportKey = `/${location.hostname}/transport`
    const sessionTransportPayKey = `/${location.hostname}/transportPaying`

	const getUserToken = () => storageGet(sessionKey)

    let activityProlongCard = activities.find(a => a.classList.contains('prolong-card'))

    storagePut(sessionTransportPayKey, false)

    activityProlongCard.querySelectorAll('.back').forEach(btn => {
        btn.onclick = () => {
            storagePut(sessionTransportPayKey, false)
            history.back()
        }
    })
/*
    let prevOnPopState = window.onpopstate
    window.onpopstate = evt => {
        console.log('POPSTATE handled')
        storagePut(sessionTransportPayKey, false)
        if (prevOnPopState) {
            window.onpopstate = prevOnPopState
            // window.onpopstate(evt)
            alert('ok')
        }
    }
    let state = 'empty'
    history.pushState(
        state,
        document.title,
        location.pathname
    )
    console.log('handler of POPSTATE is setted up')
*/
    let userToken = getUserToken()
    let profile
    let userCard

    if (!userToken) {
        location.replace('/')
    }

    let sessionTransport =  storageGet(sessionTransportKey)
    if (!sessionTransport.lastCardId) {
        location.replace('/')
    }

    try {
        let [ prof, cards ] = await Promise.all([
            backend.login(userToken),
            backend.tGetCards(userToken)
        ])
        if (!prof) {
            location.replace('/')
        }
        profile = prof
        userCard = cards.find(card => card.card_id === sessionTransport.lastCardId)
        if (!userCard) {
            location.replace('/')
        }
    } catch (err) {
        console.warn(err)
    }

    let tariffsList = activityProlongCard.querySelector('.tariffs-list')

    function escapeHtml(html) {
        return html.replace(/\&/g, '&amp;')
            .replace(/\</g, '&lt;')
            .replace(/\>/g, '&gt;')
    }

    function createTariffItem(order, tariffName, doSetupPayKey = false) {
        let summ = parseFloat(order._total_sum).toFixed(2)
        let item = document.createElement('button')
        item.classList.add('tariff')
        item.innerHTML = `
            <h3><span class="tariff">&laquo;${escapeHtml(tariffName)}&raquo;</span></h3>
            <div class="cost"><span class="price">${summ}</span><span class="iconify currency" data-icon="mdi:currency-rub"></span></div>
        `
        if (order.name_portal) {
            let providerName = document.createElement('span')
            providerName.classList.add('provider-name')
            providerName.innerText = order.name_portal
            item.querySelector('h3').appendChild(providerName)
        }
        item.addEventListener('click', async (evt) => {
            item.setAttribute('disabled', true)
            if (doSetupPayKey) {
                storagePut(sessionTransportPayKey, true)
            }
            hideActivity(activityProlongCard)
            showActivity(activityLoading)
            try {
                let paymentTypeId = 2
                let email = profile.email
                let rowKey = `${order._provider_id}/0`
                let result = await backend.paymentInit(userToken, rowKey, paymentTypeId, order._order_id, summ, email, [])
                console.log('payment', result)
                if (result.id && result.url) {
                    location.replace(result.url)
                }
            } catch (err) {
                console.warn(err)
            	showMessage('Оплата проездного', 'При оплате произошла ошибка.', () => {
            		item.removeAttribute('disabled')
                    hideActivity(getCurrentActivity())
                    hideActivity(activityLoading)
                    showActivity(activityProlongCard)
            	})
            }
        })
        return item
    }

    tariffsList.innerHTML = ''

    try {
        let tariffs = []
        let orders
        let titleEl = activityProlongCard.querySelector('.page > .title')
        let hintEl = activityProlongCard.querySelector('.page > .hint')
        let doSetupPayKey = false
        if (userCard.card_type_id === 1) {
            orders = await backend.tOrdersByTickets(userToken)
            console.log('orders', orders)
            orders.forEach(order => { order._error_code = 0 })
            tariffs = orders.map(order => order._provider_id === 3283 ? 'Сервисный сбор' : 'Поездки')
            if (orders.length <= 0) {
                titleEl.innerText = 'Все поездки уже оплачены'
                hintEl.classList.add('force-hidden')
                storagePut(sessionTransportPayKey, false)
            } else {
                titleEl.innerText = 'Оплатить неоплаченные'
                hintEl.classList.remove('force-hidden')
                doSetupPayKey = true
            }
        } else {
            tariffs = [ 'Минимальная сумма', 'x2', 'x3' ]
            orders = await Promise.all([
                backend.tOrderByCard(userToken, sessionTransport.lastCardId, 1),
                backend.tOrderByCard(userToken, sessionTransport.lastCardId, 2),
                backend.tOrderByCard(userToken, sessionTransport.lastCardId, 3)
            ])
            titleEl.innerText = 'Пополнить карту'
            hintEl.classList.remove('force-hidden')
        }
        let isOk = false
        orders.forEach((order, i) => {
console.log('order', order, 'tariff', tariffs[i])
            if (order._error_code === 0 && order._order_id) {
                let item = createTariffItem(order, tariffs[i], doSetupPayKey)
                tariffsList.appendChild(item)
                isOk = true
            }
        })
        hideActivity(activityLoading)
        pushActivity(activityProlongCard)
    } catch (err) {
        console.warn(err)
        showMessage('Оплата проездного', 'При получении стоимости произошла ошибка.' + err, () => {
            history.back()
        })
    }    

})();