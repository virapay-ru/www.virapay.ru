'use strict';

let providersList = null
let feedbackMessage = function () { };


// activity main

let mainInited = false
let accountsCache = { }

async function mainInit() {

	if (mainInited === false) {

		hideActivity(getCurrentActivity())
		showActivity(activityLoading)

		let storageProvidersKey = `/${location.hostname}/providers`
		let providersData = storageGet(storageProvidersKey)
		let providersVersion = (providersData ? providersData.version : 0)
		let providersNewData = await backend.providersGetUpdate(providersVersion)
		if (providersNewData !== null) {
			providersData = providersNewData
			storagePut(storageProvidersKey, providersData)
		}

		let listNode = activityMain.querySelector('.partners')
		listNode.innerHTML = ''
		providersList = providersData.providers

		// TODO generate list of payments types to activityAccountPayment.querySelector('.payments-types > .list')

		providersList.forEach((item, sortIndex) => {

			// unpack list

			if (!('service_id' in item)) { item.service_id = null }
			if (!('service_name' in item)) { item.service_name = null }

			let rowKey = '' + item.id + '/' + (item.service_id ? item.service_id : 0)
			item.rowKey = rowKey
			item.sortIndex = sortIndex

			// process item
console.log(item)

			let providerNode = document.createElement('div')
			providerNode.classList.add('provider')
			providerNode.classList.add('show')

			let detailsNode = document.createElement('div')
			detailsNode.classList.add('details')

			let nameNode = document.createElement('div')
			nameNode.classList.add('name')
			nameNode.innerText = item.name_portal

			let innNode = document.createElement('div')
			innNode.classList.add('inn')
			innNode.innerText = 'ИНН ' + item.inn

			let serviceNode = document.createElement('div')
			serviceNode.classList.add('service')
			serviceNode.innerText = item.service_name

			detailsNode.appendChild(nameNode)
			detailsNode.appendChild(innNode)
			detailsNode.appendChild(serviceNode)
			listNode.appendChild(providerNode)

			item.node = providerNode

		})

		mainInited = true
	}

	pushActivity(activityMain)
}

/*
// activity feedback

(function () {

	let messageNode = activityFeedback.querySelector('.message')
	let sendButton = activityFeedback.querySelector('.send')

	messageNode.oninput = function () {
		if (messageNode.value) {
			sendButton.removeAttribute('disabled')
		} else {
			sendButton.setAttribute('disabled', true)
		}
	}

	sendButton.onclick = function () {
		feedbackMessage(messageNode.value).then(result => {
			if (result) {
				showMessage('Отправка сообщения', 'Ваше сообщение отправлено. Спасибо!', () => {
					pushActivity(activityMain)
					messageNode.value = ''
					messageNode.oninput()
				})
			} else {
				showMessage('Отправка сообщения', 'Не удалось отправить сообщение. Попробуйте аозже.', () => {
					pushActivity(activityFeedback, { message: messageNode.value })
				})
			}
		})
	}

	activityFeedback.xonbeforeshow = function (options) {
		if (options) {
			messageNode.value = options.message
		} else {
			messageNode.value = ''
		}
		messageNode.oninput()
	}

})();
*/


// entry point

(function () {

	console.log('VERSION', 1, 0)

})();

