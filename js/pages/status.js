(async () => {

    //alert(location.href) // http://127.0.0.1/status.html?i=4117949&orderId=3375a45c-26fc-7d81-a230-e521644d5a9c&lang=ru

    const sessionKey = `/${location.hostname}/sessionV2`
    const sessionTransportPayKey = `/${location.hostname}/transportPaying`

	const getUserToken = () => storageGet(sessionKey)

    let userToken = getUserToken()
    if (!userToken) {
        location.replace('/')
        return
    }

    let payingFlag = storageGet(sessionTransportPayKey)
    storagePut(sessionTransportPayKey, false)

    let p = parseParameters(location.search)
    if (/^\d+$/.test(p.i)) {
        let checkingEl = document.querySelector('.status .checking')
        let doneEl = document.querySelector('.status .done')
        let btnContinue = doneEl.querySelector('.continue')
        // console.log(checkingEl, doneEl, btnContinue)
        btnContinue.addEventListener('click', evt => {
            if (payingFlag) {
                location.replace('/prolong.html')
            } else {
                location.replace('/')
            }
        })
        let isDone = false
        const doCheck = async () => {
            try {
                let result = await backend.tGetStatus(userToken, p.i)
                console.log(result)
                if (result && result.payment_status_id == 4) {
                    checkingEl.classList.add('is-hidden')
                    doneEl.classList.remove('is-hidden')
                    isDone = true
                }
            } catch (err) {
                console.warn(err)
            } finally {
                if (!isDone) {
                    setTimeout(doCheck, 3000)
                }
            }
        }
        doCheck()
    } else {
        location.replace('/')
    }

})();
