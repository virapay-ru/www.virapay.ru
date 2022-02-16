(async () => {

    const sessionKey = `/${location.hostname}/sessionV2`
    const sessionTransportKey = `/${location.hostname}/transport`

    // function simulateLinkScanning() {
    //     let linkId = '91c47034-f732-44a6-bc82-3f28a0c1ce31'
    //     let sessionTransport =  storageGet(sessionTransportKey)
    //     if (sessionTransport.lastCardId) {
    //         sessionTransport.lastLinkId = linkId
    //         storagePut(sessionTransportKey, sessionTransport)
    //     }
    // }

    // simulateLinkScanning()

	const getUserToken = () => storageGet(sessionKey)

    let items = []

    let activityPickTariff = activities.find(a => a.classList.contains('pick-tariff'))
    let activityApproveAction = activities.find(a => a.classList.contains('approve-action'))

    activityApproveAction.querySelector('.action .pick-tariff').addEventListener('click', () => {
        hideActivity(activityApproveAction)
        items[0].click()
    })

    let sessionTransport =  storageGet(sessionTransportKey)
    if (!sessionTransport.lastCardId || !sessionTransport.lastLinkId) {
        history.back()
    }

    let lastLinkId = sessionTransport.lastLinkId
    let askBeforeTransaction = sessionTransport.askBeforeTransaction
    delete sessionTransport.lastLinkId
    delete sessionTransport.askBeforeTransaction
    storagePut(sessionTransportKey, sessionTransport)

    let tariffsList = activityPickTariff.querySelector('.tariffs-list')

    function escapeHtml(html) {
        return html.replace(/\&/g, '&amp;')
            .replace(/\</g, '&lt;')
            .replace(/\>/g, '&gt;')
    }

    function createTariffItem(tariff) {
        let item = document.createElement('button')
        item.classList.add('tariff')
        item.innerHTML = `
            <h3>&laquo;${escapeHtml(tariff._tariff_name)}&raquo;</h3>
            <div class="cost"><span class="price">${parseFloat(tariff._tariff_price).toFixed(2)}</span><span class="iconify currency" data-icon="mdi:currency-rub"></span></div>
        `
        item.addEventListener('click', async (evt) => {
            item.setAttribute('disabled', true)
            hideActivity(activityPickTariff)
            showActivity(activityLoading)
            try {
                let result = await backend.tMakeTicket(
                    getUserToken(),
                    sessionTransport.lastCardId,
                    lastLinkId,
                    tariff._tariff_id
                )
                console.log('result', result)
                //let returnCode = ('_rc' in result ? result._rc : result._error_code)
                let returnCode = result._error_code
                if (returnCode == 1) {
                    location.replace(`./ticket.html?id=${encodeURIComponent(result._ticket_id)}`)
                } else {
                    // TODO messages for return codes
                    // let messages = { }
                    // messages[-2] = 'Проездной не оплачен.'
                    // messages[-14] = 'Вы заблокированы.'
                    // //messages[-13] = 'Срок действия проездного закончился.'
                    // messages[-13] = 'Пересадка на тот же маршрут невозможна.'
                    // messages[-15] = 'У вас слишком много неоплаченных билетов.'
                    // let message = messages[returnCode]
                    let message = result._error_message
                    console.log(result)
                    showMessage('Проезд по проездному', message || 'При регистрации поездки произошла ошибка.', () => {
                        //history.back()
                        if (returnCode == -20) {
                            storagePut(sessionKey, null)
                        }
                        location.replace('/')
                    })
                }
            } catch (err) {
                console.warn(err)
                showMessage('Проезд по проездному', 'При регистрации поездки произошла ошибка.', () => {
                    item.removeAttribute('disabled')
                    hideActivity(getCurrentActivity())
                    hideActivity(activityLoading)
                    showActivity(activityPickTariff)
                })
            }
        })
        return item
    }

    tariffsList.innerHTML = ''

    let tariffs = await backend.tGetTariffs(sessionTransport.lastCardId, lastLinkId)

    hideActivity(activityLoading)
    if (tariffs.length <= 0) {
        showMessage('Проезд по проездному', 'Данная метка или транспортное средство не зарегистрировано в системе.', () => {
            // history.back()
            location.replace('/')
        })
    } else {
        items = tariffs.map(tariff => {
            let item = createTariffItem(tariff)
            tariffsList.appendChild(item)
            return item
        })
        console.log(sessionTransport.lastCardTypeId)
        if (items.length === 1) {
            if (askBeforeTransaction) {
                showActivity(activityApproveAction)
            } else {
                items[0].click()
            }
        } else {
            hideActivity(activityLoading)
            if (parseInt(sessionTransport.lastCardTypeId) <= 1) {
                showActivity(activityPickTariff)
            } else {
                if (askBeforeTransaction) {
                    showActivity(activityApproveAction)
                } else {
                    items[0].click()
                }
            }
        }
    }
    
})();