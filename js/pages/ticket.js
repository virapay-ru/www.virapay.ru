(async () => {

    const sessionKey = `/${location.hostname}/sessionV2`
    // const sessionTransportKey = `/${location.hostname}/transport`

	const getUserToken = () => storageGet(sessionKey)

    let activityTicket = activities.find(a => a.classList.contains('ticket'))

    // let tariffsList = activityPickTariff.querySelector('.tariffs-list')

    // function escapeHtml(html) {
    //     return html.replace(/\&/g, '&amp;')
    //         .replace(/\</g, '&lt;')
    //         .replace(/\>/g, '&gt;')
    // }

    /*let tariffs = await backend.tGetTariffs(sessionTransport.lastCardId, sessionTransport.lastLinkId)

    if (tariffs.length <= 0) {
        showMessage('Проезд по проездному', 'Данная метка или транспортное средство не зарегистрировано в системе.', () => history.back())
    } else {
        let items = tariffs.map(tariff => {
            let item = createTariffItem(tariff)
            tariffsList.appendChild(item)
            return item
        })
        if (items.length === 1) {
            items[0].click()
        }
    }*/

    const cardTypes = { }
	cardTypes[1] = { name: "Разовая поездка" }
	cardTypes[2] = { name: "Пересадка" }
	cardTypes[3] = { name: "Поездка +" }
	cardTypes[4] = { name: "День безлимита" }
	cardTypes[5] = { name: "Неделя безлимита" }
	cardTypes[6] = { name: "Месяц безлимита" }
	cardTypes[7] = { name: "Студенческий" }


    let userToken = getUserToken()
    let profile

    if (!userToken) {
        location.replace('/')
        return
    }

    try {
        profile = await backend.login(userToken)
        if (!profile) {
            location.replace('/')
        }
    } catch (err) {
        console.warn(err)
    }

    let ticketNode = activityTicket.querySelector('.ticket')

    ticketNode.querySelector('.back').addEventListener('click', evt => {
        history.back()
    })

    function prepareBackground(code, foregroundColor, backgroundColor) {

        const mask = 0x1ff // 9 bits
        // let minCode = 100
        // let maxCode = 500
        // let code = parseInt(minCode + Math.random() * (maxCode - minCode)) & mask
        code = parseInt(code) & mask
        let matrix = []
        for (let i = 0; i < 9; i ++) {
            matrix.push(code & (1 << i))
        }
        matrix.reverse()
        // console.log(code, code.toString(2), matrix)

        // function randomColor() {
        //     return `rgba(${parseInt(0 + Math.random() * (255 - 0))}, ${parseInt(0 + Math.random() * (255 - 0))}, ${parseInt(0 + Math.random() * (255 - 0))}, 1)`
        // }

        let cellsPerRow = 3
        let cellsPerCol = 3
        let cellSize = 10 // in pixels
        let gutterSize = 4
        let paddingSize = 2
        let canvas = document.createElement('canvas')
        canvas.width = cellSize * cellsPerRow + gutterSize * (cellsPerRow - 1) + paddingSize * 2
        canvas.height = cellSize * cellsPerCol + gutterSize * (cellsPerCol - 1) + paddingSize * 2
        let ctx = canvas.getContext('2d')
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = foregroundColor
        for (let y = 0; y < cellsPerCol; y ++) {
            for (let x = 0; x < cellsPerRow; x ++) {
                if (matrix[y * cellsPerRow + x]) {
                    ctx.fillRect(
                        x * (cellSize + gutterSize) + paddingSize,
                        y * (cellSize + gutterSize) + paddingSize,
                        cellSize,
                        cellSize
                    )
                }
            }
        }

        ticketNode.querySelector('.anim-bg').style.backgroundImage = `url(${canvas.toDataURL('image/png')})`
    }

    let p = parseParameters(location.search)
    let ticket = null

    if (p.id) {
        try {
            ticket = await backend.tGetTicket(getUserToken(), p.id)
            if (ticket && !ticket._ticket_id) {
                ticket = null
            }
        } catch (err) {
            console.warn(err)
        }
    }

    if (!ticket) {

        showMessage('Билет', 'Билет не найден.', () => location.replace('/'))

    } else {
console.log('ticket', ticket)

        const setText = (q, t) => {
            let node = ticketNode.querySelector(q)
            if (node) {
                node.innerText = t
            }
            return node
        }

        setText('.ticket-num .num', ticket._ticket_num)
        setText('.contragent-inn', ticket._contragent_inn)
        setText('.contragent-name', ticket._contragent_name)
        setText('.route-num', ticket._route_num)
        setText('.transport-name', ticket._transport_name)
        setText('.transport-num', ticket._transport_num)
        setText('.tariff-name', ticket._tariff_name)
        setText('.ticket-timestamp', ticket._ticket_timestamp.replace(/^(\d{4})\-(\d\d)\-(\d\d) (\d\d\:\d\d\:\d\d).*$/, '$3.$2.$1 $4'))
        let priceNode = setText('.price', parseFloat(ticket._price).toFixed(2))
        let summNode = setText('.summ', parseFloat(ticket._summ).toFixed(2))
        setText('.payment-id', ticket._payment_id)
        setText('.card-name', cardTypes[ticket._card_type_id]?.name)

        if (ticket._card_type_id == 1) {
            ticketNode.querySelector('.ticket-sum').classList.remove('is-hidden')
        } else {
            ticketNode.querySelector('.card-name').classList.remove('is-hidden')
        }

        if (ticket._needs_payment) {
            ticketNode.classList.add('not-payed')
        } else {
            ticketNode.classList.add('payed')
        }

        if (priceNode && summNode && priceNode.innerText === summNode.innerText) {
            priceNode.style.display = 'none'
        }

        prepareBackground(ticket._background_image, ticket._foreground, ticket._background)

        // let qrcode = new QRCode('qrcode-ticket', {
        //     width: 256,
        //     height: 256,
        //     correctLevel: QRCode.CorrectLevel.H,
        //     useSVG: true
        // });
    
        // qrcode.makeCode(`https://virapay.ru/ticket.html?id=${p.id}&sign=${Date.now()}`)

        let qrcodeNode = ticketNode.querySelector('#qrcode-ticket')
        qrcodeNode.innerHTML = '<i class="iconify" data-icon="tabler-bus"></i>'
        qrcodeNode.classList.add(`card-${ticket._card_type_id}-fcolors`)

        let btnPay = ticketNode.querySelector('.pay')
        btnPay.addEventListener('click', async (evt) => {
            try {
                btnPay.setAttribute('disabled', true)
                hideActivity(getCurrentActivity())
                showActivity(activityLoading)
                let order = await backend.tOrderByTicket(userToken, ticket._ticket_id)
                console.log('order', order)
                if (!order || order._error_code !== 0 || !order._order_id) {
                    throw 'tOrderByTicket() failed'
                }
                let paymentTypeId = 2
                let email = profile.email
                let rowKey = `${order._provider_id}/0`
                let result = await backend.paymentInit(userToken, rowKey, paymentTypeId, order._order_id, parseFloat(order._total_sum).toFixed(2), email, [])
                console.log('payment', result)
                if (result.id && result.url) {
                    location.replace(result.url)
                }
            } catch (err) {
                console.warn(err)
            	showMessage('Оплата поездки', 'При оплате произошла ошибка.', () => {
            		btnPay.removeAttribute('disabled')
                    hideActivity(getCurrentActivity())
                    hideActivity(activityLoading)
                    showActivity(activityTicket)
            	})
            }
        })

        hideActivity(activityLoading)
        showActivity(activityTicket)
    }

})();
