(async () => {

    const sessionKey = `/${location.hostname}/sessionV2`
    const sessionTransportKey = `/${location.hostname}/transport`
    const sessionActiveProjectKey = `/${location.hostname}/activeProject`

	const getUserToken = () => storageGet(sessionKey)

    let activityAddProduct = activities.find(a => a.classList.contains('add-product'))

    // let products = activityAddProduct.querySelectorAll('.product')
    let productsList = activityAddProduct.querySelector('.products-list')
    let products = []

    let userToken = getUserToken()

    let [ cardsTypes, userCards ] = await Promise.all([
        backend.tGetCardsTypes(userToken),
        backend.tGetCards(userToken)
    ])
// console.log('cardsTypes', cardsTypes, 'userCards', userCards)

    cardsTypes.forEach(cardType => {
        let product = document.createElement('div')
        product.classList.add('product')
        product.classList.add(`card-${cardType.type_id}`)
        product.innerHTML = `
            <h3>&laquo;<span class="title"></span>&raquo;</h3>
            <p class="description"></p>
            <p class="contragent-name"></p>
            <p class="cost" style="display: none"><span class="price">20.00</span><span class="iconify currency" data-icon="mdi:currency-rub"></span></p>
            <div class="actions"><button class="button primary add" data-card-type-id="${cardType.type_id}" data-contragent-id="${cardType.carrier_id}"><i class="icon iconify mdi mdi-plus" data-icon="mdi-plus"></i><span>Добавить</span></button>
        `
        product.querySelector('.title').innerText = cardType.card_name
        product.querySelector('.description').innerText = cardType.working_rule
        product.querySelector('.contragent-name').innerText = cardType.carrier_name
        productsList.appendChild(product)
        products.push(product)
    })

    // console.log('cardsTypes', cardsTypes)

    userCards.forEach(cardRow => {
        products.forEach(productEl => {
            let btnAdd = productEl.querySelector('.add')
            if (btnAdd.dataset.cardTypeId == cardRow.card_type_id && btnAdd.dataset.contragentId == cardRow.carrier_id) {
                productEl.classList.add('is-disabled')
                let btn = productEl.querySelector('.add')
                btn.setAttribute('disabled', true)
                btn.innerText = 'Добавлено'
            }
        })
    })

    products.forEach(productEl => {
        let btnAdd = productEl.querySelector('.add')
        btnAdd.addEventListener('click', async (evt) => {
            btnAdd.setAttribute('disabled', true)
            try {
                let cardTypeId = btnAdd.dataset.cardTypeId
                let contragentId = btnAdd.dataset.contragentId
                let result = await backend.tAddCard(userToken, cardTypeId, contragentId)
                if (result._rc == 1 || result._rc == -3) {
                    storagePut(sessionActiveProjectKey, 'transport')
                    storagePut(sessionTransportKey, { lastCardId: result._card_id, lastCardTypeId: cardTypeId })
                    location.replace('/')
                } else {
                    throw `backend.tAddCard() returns code ${result._rc}`
                }
            } catch (err) {
                console.warn(err)
                showMessage('Добавить продукт', 'При добавлении произошла ошибка.', () => {
                    btnAdd.removeAttribute('disabled')
                })
            }
        })
    })

    hideActivity(activityLoading)
    showActivity(activityAddProduct)

})();