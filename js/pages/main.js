'use strict';

let profileData = null
let providersList = null
let paymentsTypesList = null
let profileSave = function () { };
let profilePaymentInit = function (rowKey, paymentTypeId, account, summ, counters) { };

// qrcode generator

let qrcode = new QRCode('qrcode', {
	width: 256,
	height: 256,
	correctLevel: QRCode.CorrectLevel.H,
	useSVG: true
});


// regions selector 

(function () {

	let regionsSelector = document.querySelector('.regions-selector')
	let toggleSelector = function (evt) {
//		evt.preventDefault()
//		evt.stopPropagation()
		if (!regionsSelector.classList.contains('open')) {
//			scrollByYTo(document.scrollingElement, regionsSelector.offsetTop - parseInt(getComputedStyle(regionsSelector).marginTop), 300, function () {
//				regionsSelector.classList.toggle('open')
//			})
regionsSelector.classList.toggle('open')
		} else {
			regionsSelector.classList.toggle('open')
		}
	}
	let el = regionsSelector.querySelector('.trigger')
//el.onclick = toggleSelector
	el.onmouseup = toggleSelector
//	el.ontouchend = toggleSelector
//	el.ontouchend = toggleSelector
//	el.addEventListener('touchstart', toggleSelector)

//	document.onmouseup = function (evt) {
//		regionsSelector.classList.remove('open')
//	}

})();


// activity main

let mainInited = false
let accountsCache = { }

async function mainInit() {

	if (mainInited === false) {

		switchActivity(activityLoading)

		let storageRegionsKey = `/${location.hostname}/regions`
		let regionsData = storageGet(storageRegionsKey)
		let regionsVersion = (regionsData ? regionsData.version : 0)
		let regionsNewData = await backend.regionsGetUpdate(regionsVersion)
		if (regionsNewData !== null) {
			regionsData = regionsNewData
			storagePut(storageRegionsKey, regionsData)
		}

		let regionsSelector = document.querySelector('.regions-selector')
		let regionsList = regionsSelector.querySelector('.list')
		regionsList.innerHTML = `
			<label>
				<input type="checkbox" class="all"/>
				<b>Все</b>
			</label>
		`

		let regionsNodes = []

		function updateRegionsLabel() {
			let numSelected = 0
			regionsNodes.forEach(node => {
				if (node.checked)
					numSelected ++
			})
			let label = (numSelected >= regionsNodes.length || numSelected <= 0 ? 'Все регионы' : 'Выбрано регионов: ' + numSelected)
			regionsSelector.querySelector('.trigger .label').innerText = label
		}

		function updateProfileRegions() {
			profileData.rgnList = []
			regionsNodes.forEach(node => {
				if (node.checked)
					profileData.rgnList.push(parseInt(node.value))
			})
			profileSave()
		}

		function updateHistoryFlag(provider) {
			let prevFlag = provider.hasHistory
			let isMatch = false
			let accounts = profileData.accList[provider.rowKey]
			if (accounts instanceof Array) {
				accounts = accounts.map(accItem => accItem.acc)
				let history = profileData.history[provider.rowKey]
				if (history instanceof Array) {
					if (history.find(paymItem => accounts.indexOf(paymItem.a) >= 0)) {
						isMatch = true
					}
				}
			}
			provider.hasHistory = isMatch
			if (prevFlag !== provider.hasHistory) {
				filterProviders()
			}
		}

		let allRegionsTrigger = regionsList.querySelector('.all')
		allRegionsTrigger.onchange = function () {
			regionsNodes.forEach(node => node.checked = allRegionsTrigger.checked)
			updateRegionsLabel()
			updateProfileRegions()
			filterProviders()
		}

		regionsData.regions.forEach(item => {

			let labelNode = document.createElement('label')

			let checkboxNode = document.createElement('input')
			checkboxNode.setAttribute('type', 'checkbox')
			checkboxNode.setAttribute('value', item.id)
			checkboxNode.classList.add('region')

			if (profileData.rgnList.indexOf(item.id) >= 0) {
				checkboxNode.checked = true
			}

			let spanNode = document.createElement('span')
			spanNode.innerText = item.name

			labelNode.appendChild(checkboxNode)
			labelNode.appendChild(spanNode)
			regionsList.appendChild(labelNode)
			regionsNodes.push(checkboxNode)
		})

		regionsNodes.forEach(node => {
			node.onchange = function () {
				updateRegionsLabel()
				updateProfileRegions()
				filterProviders()
			}
		})

		updateRegionsLabel()

		activityMain.querySelectorAll('.search-cancel').forEach(node => node.onclick = () => {
			activityMain.classList.remove('search-results')
			filterProviders()
		})

// TODO fix apple
//		regionsList.querySelectorAll('label').forEach(node => {
//
//			node.onmousedown = function (evt) {
//				evt.preventDefault()
//				evt.stopPropagation()
//			}
//		})




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
		paymentsTypesList = providersData.paymentsTypes

		// TODO generate list of payments types to activityAccountPayment.querySelector('.payments-types > .list')

		providersList.forEach((item, sortIndex) => {

			// unpack list

			if (!('service_id' in item)) { item.service_id = null }
			if (!('service_name' in item)) { item.service_name = null }
			if (!('counters_type_id' in item)) { item.counters_type_id = 1 }
			if (!('counters_title' in item)) { item.counters_title = null }
			if (!('limits' in item)) {
				item.limits = { }
				paymentsTypesList.forEach(pt => item.limits[pt.id] = false)
			}
			paymentsTypesList.forEach(pt => {
				if (!(pt.id in item.limits)) {
					item.limits[pt.id] = false
				}
			})
			if (!('commission' in item)) {
				item.commission = { }
				paymentsTypesList.forEach(pt => item.commission[pt.id] = { rules: 0, description: '0.00%' })
			}
			paymentsTypesList.forEach(pt => {
				if (!(pt.id in item.commission)) {
					item.commission[pt.id] = { rules: 0, description: '0.00%' }
				}
				if (!('description' in item.commission[pt.id])) {
					item.commission[pt.id].description = parseFloat(item.commission[pt.id].rules).toFixed(2) + '%'
				}
			})

			let rowKey = '' + item.id + '/' + (item.service_id ? item.service_id : 0)
			item.rowKey = rowKey
			item.sortIndex = sortIndex

			// process item

			let providerNode = document.createElement('div')
			providerNode.classList.add('provider')
			providerNode.classList.add('show')

			let favNode = document.createElement('a')
			favNode.classList.add('icon')
			favNode.classList.add('mdi')
			favNode.classList.add('fav')
			if (profileData.favList.indexOf(rowKey) >= 0) {
				favNode.classList.add('mdi-star')
				favNode.classList.add('selected')
				item.isFavorite = true
			} else {
				favNode.classList.add('mdi-star-outline')
				item.isFavorite = false
			}

			if ((rowKey in profileData.history) && (profileData.history[rowKey] instanceof Array) && profileData.history[rowKey].length > 0) {
				item.hasHistory = true
			} else {
				item.hasHistory = false
			}

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

			let btnNode = document.createElement('a')
			btnNode.classList.add('icon')
			btnNode.classList.add('mdi')
			btnNode.classList.add('mdi-chevron-right')

			detailsNode.appendChild(nameNode)
			detailsNode.appendChild(innNode)
			detailsNode.appendChild(serviceNode)
			providerNode.appendChild(favNode)
			providerNode.appendChild(detailsNode)
			providerNode.appendChild(btnNode)
			providerNode.dataset.categories = JSON.stringify(item.categories === null ? [] : item.categories)
			listNode.appendChild(providerNode)

			favNode.onmousedown = function () { // TODO fix apple
				if (favNode.classList.contains('mdi-star-outline')) {
					favNode.classList.remove('mdi-star-outline')
					favNode.classList.add('mdi-star')
					favNode.classList.add('selected')
					profileData.favList.push(rowKey)
					item.isFavorite = true
				} else {
					favNode.classList.remove('selected')
					favNode.classList.remove('mdi-star')
					favNode.classList.add('mdi-star-outline')
					profileData.favList.splice(profileData.favList.indexOf(rowKey), 1)
					item.isFavorite = false
				}
				let result = profileSave()
				if (result) {
					let favoritesFlag = activityMain.querySelector('.open-favorites').classList.contains('selected')
					if (favoritesFlag) {
						filterProviders()
					}
				} else {
					showMessage('Профиль пользователя', 'Не удалось сохранить данные. Попробуйте позднее.', () => {
						favNode.classList.remove('selected')
						favNode.classList.remove('mdi-star')
						favNode.classList.add('mdi-star-outline')
						profileData.favList.splice(profileData.favList.indexOf(rowKey), 1)
						item.isFavorite = false
					})
				}
			}

			let accountsList = activityAccounts.querySelector('.accounts-list')

			function accountsListUpdateTriggers() {

				let triggers = document.querySelectorAll('.popup-trigger')

				document.onmousedown = function (evt) { // TODO fix apple
					triggers.forEach(node => node.classList.remove('is-active'))
				}

// TODO fix apple
				triggers.forEach((node, i) => {
					node.onmousedown = (evt) => {
						evt.stopPropagation()
						//evt.preventDefault() // TODO test it
						triggers.forEach((node_, j) => {
							if (i != j) node_.classList.remove('is-active')
						})
						node.classList.toggle('is-active')
					}
				})

// TODO fix apple
				document.querySelectorAll('.popup > a').forEach(a => a.onmousedown = (evt) => {
					evt.stopPropagation()
					//evt.preventDefault() // TODO test it
					triggers.forEach(node => {
						node.classList.remove('is-active')
					})
					a.onclick()
				})
  
			}

			function enableAccountValidation(inputAccount, rowKey, inn, onValidationProgress) {

				let accountCheckTimeout = null

				inputAccount.oninput = function () {
//console.log('acc', inputAccount.value, rowKey, inn)
					if (accountCheckTimeout !== null) {
						clearTimeout(accountCheckTimeout)
						accountCheckTimeout = null
					}

					inputAccount.classList.remove('valid')
					inputAccount.classList.remove('error')
					inputAccount.classList.add('verification')

					onValidationProgress()

					accountCheckTimeout = setTimeout(function () {

						accountCheckTimeout = null
//						inputAccount.classList.remove('valid')
//						inputAccount.classList.remove('error')
//						inputAccount.classList.add('verification')

						let acc = inputAccount.value
						if (acc === '') {
							inputAccount.classList.remove('verification')
							onValidationProgress()
							return
						}

						function handleResult(result) {
							inputAccount.classList.remove('valid')
							inputAccount.classList.remove('error')
							inputAccount.classList.remove('verification')
							if (result && result.account == acc) {
								inputAccount.classList.add('valid')
							} else {
								inputAccount.classList.add('error')
							}
							onValidationProgress(result)
						}

						if (accountsCache[rowKey] && accountsCache[rowKey][acc]) {
							let accRec = accountsCache[rowKey][acc]
							let dt = Date.now() - accRec.time
							if (dt < accRec.ttl) {
console.log('acc cached check result', accRec.result)
								handleResult(accRec.result)
								return
							} else {
console.log('acc cached check result expired', dt, accRec.ttl)
							}
						}

						backend.accountCheck(rowKey, inn, acc).then(result => {

							if (!accountsCache[rowKey]) {
								accountsCache[rowKey] = { }
							}
							accountsCache[rowKey][acc] = {
								result,
								time: Date.now(),
								ttl: (result ? 60 : 10) * 1000
							}

console.log('acc check result', result)
							handleResult(result)

						}).catch(err => {

							inputAccount.classList.remove('verification')
							onValidationProgress()
							console.log(err) // TODO

						})

					}, 750)
				}
			}

			let scrollTopMain = 0
			let scrollTopAccounts = 0

			function addAccountNode(accItem) {

				let accountNode = document.createElement('div')
				accountNode.classList.add('account')

					let detailsNode = document.createElement('div')
					detailsNode.classList.add('details')

						let infoNode = document.createElement('div')
						infoNode.classList.add('info')

							let nameNode = document.createElement('div')
							nameNode.classList.add('name')
							nameNode.innerText = item.acc_name

							let valueNode = document.createElement('div')
							valueNode.classList.add('value')
							valueNode.innerText = accItem.acc

							let descriptionNode = document.createElement('div')
							descriptionNode.classList.add('description')
							descriptionNode.innerText = accItem.desc

						infoNode.appendChild(nameNode)
						infoNode.appendChild(valueNode)
						infoNode.appendChild(descriptionNode)

						let commandsNode = document.createElement('div')
						commandsNode.classList.add('commands')
						commandsNode.innerHTML = `
							<i class="icon mdi mdi-dots-vertical popup-trigger"></i>
							<div class="popup">
								<a class="account-edit"><i class="mdi mdi-pencil-outline"></i>Изменить</a>
								<a class="account-history"><i class="mdi mdi-history"></i>История</a>
								<a class="account-message"><i class="mdi mdi-message-outline"></i>Сообщение</a>
								<a class="account-delete"><i class="mdi mdi-trash-can-outline"></i>Удалить</a>
							</div>
						`

					detailsNode.appendChild(infoNode)
					detailsNode.appendChild(commandsNode)

				accountNode.appendChild(detailsNode)

				let buttonContainerNode = document.createElement('div')
				buttonContainerNode.classList.add('button-container')
				buttonContainerNode.innerHTML = `
					<button class="button account-payment">
			            <span>Перейти к оплате</span>
						<i class="icon mdi mdi-arrow-right"></i>
					</button>
				`

				accountNode.appendChild(buttonContainerNode)

				accountNode.querySelectorAll('.account-edit').forEach(commandNode => commandNode.onclick = () => {

					let inputAccount = activityAccountEdit.querySelector('input.account')
					let inputDescription = activityAccountEdit.querySelector('input.description')

					scrollTopAccounts = document.scrollingElement.scrollTop

					activityAccountEdit.querySelector('.acc-description').innerText = item.acc_description
					activityAccountEdit.querySelector('.acc-example').innerText = item.acc_example
					inputAccount.value = accItem.acc
					inputDescription.value = accItem.desc

					activityAccountEdit.querySelector('.account-save').onclick = () => {
						let prevAcc = accItem.acc
						let prevDesc = accItem.desc
						accItem.acc = inputAccount.value
						accItem.desc = inputDescription.value
						let result = profileSave()
						if (result) {
							accountNode.querySelector('.value').innerText = inputAccount.value
							accountNode.querySelector('.description').innerText = inputDescription.value
							updateHistoryFlag(item)
							activityAccountEdit.querySelector('.back').onclick()
						} else {
							showMessage('Учетные данные', 'Не удалось сохранить данные. Попробуйте позднее.', () => {
								accItem.acc = prevAcc
								accItem.desc = prevDesc
							})
						}
					}

					historyPut('accounts')
					inputAccount.oninput()
					switchActivity(activityAccountEdit)
				})

				accountNode.querySelectorAll('.account-delete').forEach(commandNode => commandNode.onclick = () => {
					let scrollTop = document.scrollingElement.scrollTop
					getConfirm('Удаление данных', 'Вы действительно хотите удалить' + (item.acc_name ? ' ' + item.acc_name : '') + '?', () => {
						let prevList = profileData.accList[rowKey]
						accItem.removed = true
						profileData.accList[rowKey] = profileData.accList[rowKey].filter(x => !x.removed)
						let result = profileSave()
						if (result) {
							accountNode.remove()
							updateHistoryFlag(item)
						} else {
							showMessage('Учетные данные', 'Не удалось удалить данные. Попробуйте позднее.', () => {
								profileData.accList[rowKey] = prevList
								delete accItem.removed
							})
						}
						switchActivity(activityAccounts)
						document.scrollingElement.scrollTop = scrollTop
					}, () => {
						switchActivity(activityAccounts)
						document.scrollingElement.scrollTop = scrollTop
					})
				})

				accountNode.querySelectorAll('.account-history').forEach(commandNode => commandNode.onclick = () => {

					function formatSum(val) {
						return val.replace(/\./, ',')
					}

					function formatDate(val) {
						return val.replace(/^(\d\d\d\d)\-(\d\d)\-(\d\d).*$/, '$3.$2.$1')
					}

					function formatStatusColor(val) {
						val = parseInt(val)
						if (val === 3 || val === 4) {
							return 'color-normal'
						}
						if (val === 5) {
							return 'color-warning'
						}
						return 'color-neutral'
					}

					function getStatusColors() {
						return [ 'color-normal', 'color-warning', 'color-neutral' ]
					}

					function formatStatus(val) { // TODO use dict
						switch (parseInt(val)) {
						case 1: return "Черновик";
						case 2: return "Ожидается";
						case 3: return "Поступил";
						case 4: return "Проведен";
						case 5: return "Отменен";
						case 6: return "Обработка банком";
						}
						return 'Ошибка: статус'
					}

					function isFinalStatus(val) {
						val = parseInt(val)
						return val === 4 || val === 5
					}

					function formatStatusIcon(val) {
						val = parseInt(val)
						if (val === 3) {
							return '<i class="icon mdi mdi-check"></i>'
						}
						if (val === 4) {
							return '<i class="icon mdi mdi-check-all"></i>'
						}
						if (val === 5) {
							return '<i class="icon mdi mdi-close"></i>'
						}
						return '<i class="icon mdi mdi-loading spin"></i>'
					}

					function formatStatusHtml(val) {
						return '<span class="val">' + formatStatus(val) + '</span>' + formatStatusIcon(val)
					}

					function formatPaymentTypeHtml(val) { // TODO use paymentsTypesList
						val = parseInt(val)
						if (val === 3) {
							return '<i class="mdi mdi-qrcode"></i> Система быстрых платежей'
						}
						if (val === 2) {
							return '<i class="mdi mdi-credit-card-outline"></i> Картой банка'
						}
						if (val === 1) {
							return '<i class="mdi mdi-file-check-outline"></i> Платежный перевод'
						}
						return ''
					}

					activityAccountHistory.querySelector('.acc-value').innerText = accItem.acc

					let listNode = activityAccountHistory.querySelector('.history-list')

					let payments = profileData.history[rowKey].filter(row => row.a == accItem.acc)
					console.log('payments', payments)

					listNode.innerHTML = '' // clear list

					let pendingIds = []
					let pendingNodes = { }

					payments.forEach(paymItem => {

						let paymentNode = document.createElement('div')
						paymentNode.classList.add('payment')
						paymentNode.innerHTML = `
							<div class="details">
								<div class="info">
									<div class="row">
										<div class="date"><span class="val"></span></div>
										<div class="id">#<span class="val"></span></div>
									</div>
									<div class="row summary">
										<div class="summ"><span class="val"></span><i class="mdi mdi-currency-rub"></i></div>
										<div class="commission"><div>+ <span class="val"></span><i class="mdi mdi-currency-rub"></i></div><div>сервисный сбор</div></div>
									</div>
									<div class="description"></div>
								</div>
							</div>
							<div class="counters"></div>
							<div class="button-container">
								<a class="button status"></a>
							</div>
						`
						paymentNode.querySelector('.id .val').innerText = paymItem.i
						paymentNode.querySelector('.date .val').innerText = formatDate(paymItem.d)
						paymentNode.querySelector('.summ .val').innerText = formatSum(paymItem.s)
						paymentNode.querySelector('.commission .val').innerText = formatSum(paymItem.c)
						paymentNode.querySelector('.status').innerHTML = formatStatusHtml(paymItem.e)
						paymentNode.querySelector('.description').innerHTML = formatPaymentTypeHtml(paymItem.t)
						paymentNode.classList.add(formatStatusColor(paymItem.e))

						if ((paymItem.r instanceof Array) && paymItem.r.length > 0) {
							let countersNode = paymentNode.querySelector('.counters')
							paymItem.r.forEach(counter => {
								let counterNode = document.createElement('div')
								counterNode.classList.add('counter')
								let nameNode = document.createElement('div')
								nameNode.classList.add('name')
								nameNode.innerText = counter.name
								let valueNode = document.createElement('div')
								valueNode.classList.add('value')
								valueNode.innerText = counter.value
								counterNode.appendChild(nameNode)
								counterNode.appendChild(valueNode)
								countersNode.appendChild(counterNode)
							})
						}

						if (!isFinalStatus(paymItem.e)) {
							pendingIds.push(paymItem)
							pendingNodes[paymItem.i] = paymentNode
						}

						listNode.appendChild(paymentNode)

					})




					let intervalId = null

					if (pendingIds.length > 0) {
						intervalId = setInterval(function () {
							pendingIds = pendingIds.filter(paymItem => !isFinalStatus(paymItem.e))
							if (pendingIds.length <= 0) {
								clearInterval(intervalId)
								intervalId = null
							} else {
								let ids = pendingIds.map(paymItem => paymItem.i)
								backend.paymentGetStatus(ids).then(result => {
//console.log('statuses', ids, '->', result)
									let doUpdate = false
									for (let id in result) {
										let status = result[id].status_id
										let paymentNode = pendingNodes[id]
										let paymItem = pendingIds.find(itm => itm.i == id)
										paymItem.e = status
										paymentNode.querySelector('.status').innerHTML = formatStatusHtml(status)
										getStatusColors().forEach(colorClass => paymentNode.classList.remove(colorClass))
										paymentNode.classList.add(formatStatusColor(status))
										if (isFinalStatus(status)) {
//console.log('final', id, status)
											delete pendingNodes[id]
											doUpdate = true
										} else {
//console.log('continue', id, status)
										}
									}
									if (doUpdate) {
										profileSave()
									}
								}).catch(err => {
									console.log(err)
								})
							}
						}, 10*1000)
					}

					activityAccountHistory.querySelector('.clear-interval').onclick = function () {
						clearInterval(intervalId)
//console.log('clear interval')
					}



					historyPut('accounts')
					switchActivity(activityAccountHistory)

				})

				accountNode.querySelectorAll('.account-payment').forEach(commandNode => commandNode.onclick = () => {

					let inputAccount = activityAccountPayment.querySelector('input.account')
//					let inputDescription = activityAccountPayment.querySelector('input.description')
					let inputSum = activityAccountPayment.querySelector('input.summ')
					let outputCommission = activityAccountPayment.querySelector('.commission')
					let outputTotal = activityAccountPayment.querySelector('.total')
					let actionButton = activityAccountPayment.querySelector('.prepare-payment')
					let countersSection = activityAccountPayment.querySelector('.counters')
					let countersList = countersSection.querySelector('.counters-list')
					let settedCounters = { }

					countersSection.querySelector('.subject').innerText = item.counters_title
					countersSection.hidden = true

					scrollTopAccounts = document.scrollingElement.scrollTop

					activityAccountPayment.querySelector('.acc-description').innerText = item.acc_description
					activityAccountPayment.querySelector('.acc-example').innerText = item.acc_example
					inputAccount.value = accItem.acc
//					inputDescription.value = accItem.desc
					inputSum.value = accItem.sum
					let defaultPaymentTypeId = paymentsTypesList[0].id
					let initPaymentTypeId = parseInt(accItem.paymTyp)
					if (!initPaymentTypeId) { initPaymentTypeId = defaultPaymentTypeId } // default payment type

					paymentsTypesList.forEach(paymentType => {
						let paymentTypeNode = activityAccountPayment.querySelector('.payments-types > .list > .li.id-' + paymentType.id)
						let commissionNode = paymentTypeNode.querySelector('.commission-description')
						paymentTypeNode.hidden = true
						if (item.payments_types.indexOf(paymentType.id) >= 0) {
							if (commissionNode) {
								commissionNode.innerText = item.commission[paymentType.id].description
							}
							paymentTypeNode.hidden = false
						}
					})

					function onValidationProgress(result) {

						let isValid = true
							&& inputAccount.classList.contains('valid')
							&& inputSum.classList.contains('valid')

						countersSection.hidden = true
						countersList.innerHTML = ''

						if (isValid) {
							actionButton.removeAttribute('disabled')
							if (item.counters_type_id > 1) {
//console.log('COUNTERS', result.counters)

								if ((result.counters instanceof Array) && result.counters.length > 0) {

									result.counters.forEach(counter => {

										let counterNode = document.createElement('label')

										counterNode.classList.add('label')

										let hintNode = document.createElement('div')

										hintNode.classList.add('hint')
										hintNode.innerText = counter.name

										let containerNode = document.createElement('div')

										let inputValue = document.createElement('input')

										inputValue.setAttribute('type', 'text')
										inputValue.dataset.extData = counter.ext_data
										inputValue.dataset.name = counter.name
										inputValue.dataset.orderNo = counter.order_no
										inputValue.oninput = function (evt) {
											settedCounters[counter.ext_data] = inputValue.value
										}

										if (counter.ext_data in settedCounters) {
											inputValue.value = settedCounters[counter.ext_data]
//										} else {
//											inputValue.value = '0'
										}

										inputValue.onkeypress = function (evt) {

											let c = String.fromCharCode(evt.keyCode)
											if (/^\d$/.test(c)) {
												return true
											} else {
												evt.preventDefault()
												if (c === ',' || c === '.') {
													let el = evt.srcElement
													let val = '' + el.value
													let start = el.selectionStart
													let end = el.selectionEnd
													let lval = val.substring(0, start)
													let rval = val.substring(end)
													let replacement = '.'
													let offset = -1 + replacement.length
													let shiftOffset = (/\./.test(lval) ? 0 : 1)
													el.value = lval.replace(/\./g, '') + replacement + rval.replace(/\./g, '')
													el.selectionStart = start + offset + shiftOffset
													el.selectionEnd = el.selectionStart
													el.dispatchEvent(new Event('input'))
												}
												return false
											}
											
										}

//										inputValue.onfocus = function () {
//											if (Math.abs(parseFloat(inputValue.value)) < 0.01) {
//												inputValue.value = ''
//											}
//										}
//
//										inputValue.onblur = function () {
//											if (inputValue.value == '') {
//												inputValue.value = '0'
//											}
//										}

										containerNode.appendChild(inputValue)
										counterNode.appendChild(hintNode)
										counterNode.appendChild(containerNode)
										countersList.appendChild(counterNode)
									})

									countersSection.hidden = false
								}
							}
						} else {
							actionButton.setAttribute('disabled', true)
						}
					}

					enableAccountValidation(inputAccount, rowKey, item.inn, onValidationProgress)

					function validateSumm() {

						let paymentTypeId = activityAccountPayment.querySelector('input[name=payment-type]:checked').value
						let limits = item.limits[paymentTypeId]

						inputSum.classList.remove('valid')
						inputSum.classList.remove('error')
						inputSum.classList.add('verification')

						if (limits) {

							let sum = parseFloat(parseFloat(inputSum.value).toFixed(2))
							let valid = true
							if (limits.min_summ !== null && sum < parseFloat(limits.min_summ)) {
								valid = false
							}
							if (limits.max_summ !== null && sum > parseFloat(limits.max_summ) ) {
								valid = false
							}
							if (valid) {
								// TODO validate day_summ
								inputSum.classList.remove('verification')
								inputSum.classList.add('valid')
								onValidationProgress()
							} else {
								inputSum.classList.remove('verification')
								inputSum.classList.add('error')
								onValidationProgress()
							}

						} else {

							inputSum.classList.remove('verification')
							inputSum.classList.add('valid')
						}
					}

					function updateSumms() {

						let sum = parseFloat(inputSum.value).toFixed(2)
						if (isNaN(sum)) {
							sum = '0.00'
						}
						if (sum !== inputSum.value && sum !== '0.00') {
							let start = inputSum.selectionStart
							inputSum.value = sum
							inputSum.selectionStart = start
							inputSum.selectionEnd = inputSum.selectionStart
						}

						validateSumm()

						let paymentTypeId = activityAccountPayment.querySelector('input[name=payment-type]:checked').value
						let rules = item.commission[paymentTypeId].rules

						let commission = '0.00'
						if (typeof rules === 'number') {
							let percent = rules
							commission = ((sum * percent) / 100.0).toFixed(2)
						} else {
							rules.forEach(rule => {
								let [ sumEnd, fixedSum, percent ] = rule
								if ((sumEnd !== null && sum < sumEnd) || (sumEnd === null)) {
									commission = (fixedSum + (sum * percent) / 100.0).toFixed(2)
								}
							})
						}

						let total = (parseFloat(sum) + parseFloat(commission)).toFixed(2)

						outputCommission.innerText = commission
						outputTotal.innerText = total
					}

					activityAccountPayment.querySelectorAll('input.payment-type-id').forEach(option => option.onchange = function () {

						let paymentTypeId = activityAccountPayment.querySelector('input[name=payment-type]:checked').value
						let limitsNode = activityAccountPayment.querySelector('.limits-description')

						if (limitsNode) {
							let limits = item.limits[paymentTypeId]
							let limitsDescription = []
							if (limits) {
								if (limits.min_summ !== null) {
									limitsDescription.push('Минимальная сумма ' + parseFloat(limits.min_summ).toFixed(2))
								}
								if (limits.max_summ !== null) {
									limitsDescription.push('Максимальная сумма ' + parseFloat(limits.max_summ).toFixed(2))
								}
								if (limits.day_summ !== null) {
									limitsDescription.push('Максимальная сумма в сутки ' + parseFloat(limits.day_summ).toFixed(2))
								}
							}
							if (limitsDescription.length > 0) {
								limitsNode.innerText = limitsDescription.join('; ')
								limitsNode.hidden = false
							} else {
								limitsNode.hidden = true
							}
						}

						updateSumms()

					})

					inputSum.oninput = function () {
						updateSumms()
					}

					let paymentTypeControl = activityAccountPayment.querySelector('input.payment-type-id[value="' + initPaymentTypeId + '"]')
					if (!paymentTypeControl) {
						paymentTypeControl = activityAccountPayment.querySelector('input.payment-type-id[value="' + defaultPaymentTypeId + '"]')
					}
					paymentTypeControl.checked = true
					paymentTypeControl.onchange()

					actionButton.onclick = async () => {

						let paymentTypeId = activityAccountPayment.querySelector('input[name=payment-type]:checked').value

						let prevPaymTyp = accItem.paymTyp
						let prevAcc = accItem.acc
						let prevSum = accItem.sum
						accItem.acc = inputAccount.value
						accItem.sum = inputSum.value
						accItem.paymTyp = paymentTypeId

						let counters = []
						countersList.querySelectorAll('input[type=text]').forEach(inputValue => {
							let extData = inputValue.dataset.extData
							if (/^\d+(\.\d+)?$/.test(settedCounters[extData]) && parseFloat(settedCounters[extData]) > 0) { // float and not zero
								counters.push({
									'ext_data': extData,
									'order_no': inputValue.dataset.orderNo,
									'value': inputValue.value,
									'name': inputValue.dataset.name
								})
							}
						})

						switchActivity(activityLoading)
						let payment = await profilePaymentInit(rowKey, accItem.paymTyp, accItem.acc, accItem.sum, counters)
						if (payment && payment.id && payment.url) {
							if (!(profileData.history[rowKey] instanceof Array)) {
								profileData.history[rowKey] = []
							}
							counters.forEach(counter => {
								delete counter.ext_data
								delete counter.order_no
							})
							profileData.history[rowKey].push({
								i: payment.id,
								s: payment.summ,
								c: payment.commission,
								o: payment.discount,
								u: payment.url,
								d: payment.created,
								a: accItem.acc,
								t: accItem.paymTyp,
								e: payment.status,
								r: counters
							})
							item.hasHistory = true
							let result = await profileSave()
							if (result) {
								if (paymentTypeId == 3) { // sbp only
									qrcode.makeCode(payment.url)
									activitySBPPay.querySelector('.action').setAttribute('href', payment.url)
									switchActivity(activitySBPPay)
								} else {
									location.replace(payment.url)
								}
							} else {
								showMessage('Подготовка платежа', 'Не удалось сохранить историю платежей. Попробуйте позднее.', () => {
									accItem.acc = prevAcc
									accItem.sum = prevSum
									switchActivity(activityAccountPayment)
								})
							}
						} else {
							showMessage('Подготовка платежа', 'Не удалось подготовить платеж. Попробуйте позднее.', () => {
								accItem.acc = prevAcc
								accItem.sum = prevSum
								switchActivity(activityAccountPayment)
							})
						}

					}

					historyPut('accounts')
					inputAccount.oninput()
					inputSum.oninput()
					switchActivity(activityAccountPayment)
				})

				accountsList.appendChild(accountNode)

				accountsListUpdateTriggers()

				if (accItem.autoSelect) {
					delete accItem.autoSelect
					accountNode.querySelector('.account-payment').onclick()
				}
			}

			function pickProvider() {

				let showAccountsList = true

				if (item.searchItem && item.searchItem.account !== undefined && item.searchItem.account !== null) {
//console.log('by search result', item.searchItem)

					let sum = null

					if (item.searchItem.summ !== undefined && item.searchItem.summ !== null) {
						sum = parseFloat(item.searchItem.summ).toFixed(2)
					}

					if (!(profileData.accList[item.rowKey] instanceof Array)) {
						profileData.accList[item.rowKey] = []
					}

					let accItem = profileData.accList[item.rowKey].find(accItem => accItem.acc == item.searchItem.account)

					if (accItem) {

						if (sum !== null) {
							accItem.sum = sum
						}

					} else {

						accItem = {
							acc: item.searchItem.account,
							desc: '',
							sum: (sum !== null ? sum : '0.00')
						}

						profileData.accList[item.rowKey].push(accItem)
					}

					accItem.autoSelect = true
					showAccountsList = false

				}

				scrollTopMain = document.scrollingElement.scrollTop

				activityAccounts.querySelectorAll('.back').forEach(node => node.onclick = () => {
					switchActivity(activityMain)
					document.scrollingElement.scrollTop = scrollTopMain
				})

				activityAccounts.querySelectorAll('.provider-details .name').forEach(node => {
					node.innerText = item.name_portal
				})
				activityAccounts.querySelectorAll('.provider-details .inn').forEach(node => {
					node.innerText = 'ИНН ' + item.inn
				})
				activityAccounts.querySelectorAll('.provider-details .service').forEach(node => {
					node.innerText = item.service_name
				})

				accountsList.innerHTML = ''
				if (profileData.accList[rowKey] instanceof Array) {
					profileData.accList[rowKey].forEach(accItem => addAccountNode(accItem))
				}
				activityAccounts.querySelectorAll('.acc-name').forEach(node => {
					node.innerText = item.acc_name
				})
				activityAccounts.querySelectorAll('.popup-trigger').forEach(node => {
					node.classList.remove('is-active')
				})

				activityAccountEdit.querySelectorAll('.back').forEach(node => node.onclick = () => {
					switchActivity(activityAccounts)
					document.scrollingElement.scrollTop = scrollTopAccounts
				})

				activityAccountEdit.querySelectorAll('.provider-details .name').forEach(node => {
					node.innerText = item.name_portal
				})
				activityAccountEdit.querySelectorAll('.provider-details .inn').forEach(node => {
					node.innerText = 'ИНН ' + item.inn
				})
				activityAccountEdit.querySelectorAll('.provider-details .service').forEach(node => {
					node.innerText = item.service_name
				})

				activityAccountEdit.querySelectorAll('.acc-name').forEach(node => {
					node.innerText = item.acc_name
				})
				activityAccountEdit.querySelectorAll('.acc-description').forEach(node => {
					node.innerText = item.acc_description
				})
				activityAccountEdit.querySelectorAll('.acc-example').forEach(node => {
					node.innerText = item.acc_example
				})

				activityAccountPayment.querySelectorAll('.provider-details .name').forEach(node => {
					node.innerText = item.name_portal
				})
				activityAccountPayment.querySelectorAll('.provider-details .inn').forEach(node => {
					node.innerText = 'ИНН ' + item.inn
				})
				activityAccountPayment.querySelectorAll('.provider-details .service').forEach(node => {
					node.innerText = item.service_name
				})

				activityAccountHistory.querySelectorAll('.back').forEach(node => node.onclick = () => {
					activityAccountHistory.querySelector('.clear-interval').onclick()
					switchActivity(activityAccounts)
					document.scrollingElement.scrollTop = scrollTopAccounts
				})

				activityAccountHistory.querySelectorAll('.provider-details .name').forEach(node => {
					node.innerText = item.name_portal
				})
				activityAccountHistory.querySelectorAll('.provider-details .inn').forEach(node => {
					node.innerText = 'ИНН ' + item.inn
				})
				activityAccountHistory.querySelectorAll('.provider-details .service').forEach(node => {
					node.innerText = item.service_name
				})

				activityAccountPayment.querySelectorAll('.back').forEach(node => node.onclick = () => {
					switchActivity(activityAccounts)
					document.scrollingElement.scrollTop = scrollTopAccounts
				})

				activityAccounts.querySelectorAll('.account-add').forEach(node => {

					let inputAccount = activityAccountEdit.querySelector('input.account')
					let inputDescription = activityAccountEdit.querySelector('input.description')
					let saveButton = activityAccountEdit.querySelector('.account-save')

					node.onclick = () => {

						scrollTopAccounts = document.scrollingElement.scrollTop

						inputAccount.value = ''
						inputDescription.value = ''

						saveButton.onclick = () => {

							if (!(profileData.accList[rowKey] instanceof Array)) {
								profileData.accList[rowKey] = [ ]
							}
							let accItem = {
								acc: inputAccount.value,
								desc: inputDescription.value,
								sum: '0.00'
							}
							profileData.accList[rowKey].push(accItem)

							let result = profileSave()
							if (result) {
								addAccountNode(accItem)
								updateHistoryFlag(item)
								activityAccountEdit.querySelector('.back').onclick()
							} else {
								showMessage('Учетные данные', 'Не удалось сохранить данные. Попробуйте позднее.', () => {
									profileData.accList[rowKey].pop()
								})
							}							
						}

						historyPut('accounts')
						switchActivity(activityAccountEdit)
					}

				});

				(function () {

					let inputAccount = activityAccountEdit.querySelector('input.account')
					let actionButton = activityAccountEdit.querySelector('.account-save')

					enableAccountValidation(inputAccount, rowKey, item.inn, function () {
						let isValid = inputAccount.classList.contains('valid')
						if (isValid) {
							actionButton.removeAttribute('disabled')
						} else {
							actionButton.setAttribute('disabled', true)
						}
					})

				})();

				(function () {

					let inputSum = activityAccountPayment.querySelector('input.summ')

					inputSum.onkeypress = function (evt) {

						let c = String.fromCharCode(evt.keyCode)
						if (/^\d$/.test(c)) {
							return true
						} else {
							evt.preventDefault()
							if (c === ',' || c === '.') {
								let el = evt.srcElement
								let val = '' + el.value
								let start = el.selectionStart
								let end = el.selectionEnd
								let lval = val.substring(0, start)
								let rval = val.substring(end)
								let replacement = '.'
								let offset = -1 + replacement.length
								let shiftOffset = (/\./.test(lval) ? 0 : 1)
								el.value = lval.replace(/\./g, '') + replacement + rval.replace(/\./g, '')
								el.selectionStart = start + offset + shiftOffset
								el.selectionEnd = el.selectionStart
								el.dispatchEvent(new Event('input'))
							}
							return false
						}
						
					}

					inputSum.onfocus = function () {
						if (Math.abs(parseFloat(inputSum.value)) < 0.01) {
							inputSum.value = ''
						}
					}

					inputSum.onblur = function () {
						if (inputSum.value == '') {
							inputSum.value = '0.00'
						}
					}

				})();
				
				if (showAccountsList) { // if account is not picked automatically
					historyPut('main')
					switchActivity(activityAccounts)
				}
			}

			nameNode.onclick = pickProvider
			serviceNode.onclick = pickProvider
			btnNode.onclick = pickProvider

			item.node = providerNode
		})

		mainInited = true
	}

	filterProviders()
	switchActivity(activityMain)
	setTimeout(function () {
		document.querySelector('.bottom-panel').classList.remove('hide')
	}, 750)
}

function filterProviders(searchResults = null) {

	let autoSelectedProvider = null

	let comparator

	function compareBySortIndex(a, b) {

		if (a.sortIndex < b.sortIndex) {
			return -1
		}

		if (a.sortIndex > b.sortIndex) {
			return 1
		}

		return 0
	}

	function getLastPaymentDate(rowKey) {

		let date = new Date("1970-01-01 00:00:00")

		if (profileData.history[rowKey] && (profileData.history[rowKey] instanceof Array)) {
			profileData.history[rowKey].forEach(paymItem => {
				let paymDate = new Date(paymItem.d)
				if (paymDate.getTime() > date.getTime()) {
					date = paymDate
				}
			})
		}

		return date
	}

	function compareByHistoryDate(a, b) {
		
		let aDate = getLastPaymentDate(a.rowKey).getTime()
		let bDate = getLastPaymentDate(b.rowKey).getTime()

		if (aDate < bDate) {
			return 1
		}

		if (aDate > bDate) {
			return -1
		}

		return 0
	}

	if (searchResults !== null) {

		searchResults.forEach(res => {
			res.rowKey = '' + res.provider_id + '/' + (res.service_id === null ? '0' : res.service_id)
		})
//console.log('searchResults', searchResults)

		let numFoundProviders = 0
		providersList.forEach(row => {
			let searchItem = searchResults.find(res => res.rowKey === row.rowKey)
			if (searchItem) {
				row.searchItem = searchItem
				row.isMatch = true
				autoSelectedProvider = row
				numFoundProviders ++
			} else {
				row.searchItem = null
				row.isMatch = false
			}
		})
		if (numFoundProviders !== 1) {
			autoSelectedProvider = null
		}
//console.log('filtration done')
		comparator = compareBySortIndex

	} else {

//console.log('default filtration')

		let favoritesFlag = activityMain.querySelector('.open-favorites').classList.contains('selected')
		let historyFlag = activityMain.querySelector('.open-history').classList.contains('selected')

		let selectedCategories = []
		activityMain.querySelectorAll('.category').forEach(category => {
			if (category.classList.contains('selected')) {
				selectedCategories.push(JSON.parse(category.dataset.id))
			}
		})

		let selectedRegions = []
		activityMain.querySelectorAll('.regions-selector .region').forEach(region => {
			if (region.checked) {
				selectedRegions.push(parseInt(region.value))
			}
		})

		let searchQuery = '' + document.querySelector('.search-field input').value
		let searchWords = searchQuery
			.toLowerCase()
			.replace(/[\,\.\?\!\%\*\(\)\[\]\{\}\-\+\_\<\>\:\;\"\'\`\\\/\r\n\t]+/g, ' ')
			.split(/\s+/)
			.filter(word => word.length > 0)
	//console.log('searchWords', searchWords)

		providersList.forEach(row => {

			row.isMatch = true
			row.searchItem = null

			if (searchWords.length > 0) {
				let found = true
				searchWords.forEach(word => {
					//if (row.search_key.indexOf(word) < 0) {
					if (!row.search_key.some(key => key.startsWith(word))) {
						found = false
					}
				})
				if (!found) {
					row.isMatch = false
				}
			}

			if (selectedCategories.length > 0) {
				let found = false
				let categories = row.categories
				selectedCategories.forEach(selectedCategory => {
					if (categories.indexOf(selectedCategory) >= 0) {
						found = true
					}
				})
				if (!found) {
					row.isMatch = false
				}
			}

			if (selectedRegions.length > 0) {
				let found = false
				let regions = row.regions
				selectedRegions.forEach(selectedRegion => {
					if (regions.indexOf(selectedRegion) >= 0) {
						found = true
					}
				})
				if (!found) {
					row.isMatch = false
				}
			}

			if (favoritesFlag && !row.isFavorite) {
				row.isMatch = false
			}

			if (historyFlag && !row.hasHistory) {
				row.isMatch = false
			}

		})

		comparator = (historyFlag ? compareByHistoryDate : compareBySortIndex)
	}

	let parentNode = activityMain.querySelector('.partners')

	providersList
		.forEach(row => {
			if (row.timeout) {
				clearTimeout(row.timeout)
			}
			if (row.node.parentElement) {
				row.node.parentElement.removeChild(row.node)
			}
			row.node.classList.remove('show')
//			row.node.classList.add('hide')
		})

	setTimeout(function () {
		let items = providersList.filter(row => row.isMatch)
		items.sort(comparator)
		items.forEach((row, i) => {
			parentNode.appendChild(row.node)
		})
		items.forEach((row, i) => {
			row.timeout = setTimeout(() => {
				row.node.classList.add('show')
			}, i * 150)
		})
	}, 300)

	if (autoSelectedProvider !== null) {
		autoSelectedProvider.node.querySelector('.name').onclick()
	}

}

// profile functions

async function profileInit(apiName, id, fullName, imageUrl, email, token, doLogout, doUpdate) {

	let updatingKey = `/${location.hostname}/updatingToken`

	let logoutCallback = function () {
		doLogout()
		profileData = null
		profileSave = function () { }
		profilePaymentInit = function (rowKey, paymentTypeId, account, summ, counters) { };
	}

	switchActivity(activityLoading)

	try {

		console.log('LOGIN REQUEST', apiName, id, token)

		let result = await backend.login(apiName, id, token, fullName, email, imageUrl)

		console.log('LOGIN RESULT', result)

		if (result) {

			if (!result.data) {
				result.data = { }
			}
			if (!(result.data.favList instanceof Array)) {
				result.data.favList = [ ]
			}
			if (typeof result.data.accList !== 'object') {
				result.data.accList = { }
			}
			if (!(result.data.rgnList instanceof Array)) {
				result.data.rgnList = [ ]
			}
			if (typeof result.data.history !== 'object') {
				result.data.history = { }
			}
			profileData = result.data

			activityProfile.querySelector('.avatar').style.backgroundImage = 'url(' + imageUrl + ')'
			activityProfile.querySelector('.apiname').innerText = apiName
			activityProfile.querySelector('.id').innerText = id
			activityProfile.querySelector('.fullname').value = result.name
			activityProfile.querySelector('.email').value = result.email
			activityProfile.querySelectorAll('.logout').forEach(node => {
				node.onclick = function () {
					logoutCallback();
				}
			})
			activityProfile.querySelectorAll('.back').forEach(node => {
				if (result.isNew) {
					node.onclick = function () {
						logoutCallback()
					}
				} else {
					node.onclick = function () {
						mainInit()
					}
				}
			})
			profileSave = async function () {
				try {
					let name = activityProfile.querySelector('.fullname').value
					let email = activityProfile.querySelector('.email').value
					let result = await backend.profileUpdate(
						apiName, id, token,
						name, email, imageUrl, profileData
					)
					if (result) {
						doUpdate(name, email)
					}
					return result
				} catch (errorProfileSaving) {
					console.log('SAVING PROFILE FAILED', errorProfileSaving)
					showMessage('Профиль пользователя', 'Не удалось сохранить данные. Попробуйте позднее.', () => switchActivity(activityProfile))
				}
				return null
			}
			profilePaymentInit = async function (rowKey, paymentTypeId, account, summ, counters) {
				try {
					let name = activityProfile.querySelector('.fullname').value
					let email = activityProfile.querySelector('.email').value
					let result = await backend.paymentInit(
						apiName, id, token,
						name, email, imageUrl,
						rowKey, paymentTypeId, account, summ,
						counters
					)
console.log('PAYMENT', result)
					return result
				} catch (errorPaymentRegistering) {
					console.log('REGISTERING PAYMENT FAILED', errorPaymentRegistering)
				}
				return null
			}
			activityProfile.querySelectorAll('.profile-save').forEach(node => {
				node.onclick = async function () {
					switchActivity(activityLoading)

					let result = profileSave()
					if (result) {
						let name = activityProfile.querySelector('.fullname').value
						activityMain.querySelector('.fullname').innerText = name
						activityProfile.querySelectorAll('.back').forEach(node => {
							node.onclick = function () {
								mainInit() //switchActivity(activityMain)
							}
						})
						mainInit() //switchActivity(activityMain)
					} else {
						showMessage('Профиль пользователя', 'Не удалось сохранить данные. Попробуйте позднее.', () => switchActivity(activityProfile))
					}


				}
			})
			activityMain.querySelector('.avatar').style.backgroundImage = 'url(' + imageUrl + ')'
			activityMain.querySelector('.fullname').innerText = result.name

			document.querySelectorAll('.profile-show').forEach(node => node.onclick = () => {
				historyPut('main')
				switchActivity(activityProfile)
			})
			activityMain.querySelectorAll('.profile-show').forEach(node => {
				node.onclick = function () {
					if (activityNavBar.classList.contains('is-hidden')) {
						navBarShow()
					} else {
						navBarHide()
					}
				}
			})

			storagePut(updatingKey, false)

			if (result.isNew) {
				historyPut('main')
				switchActivity(activityProfile)
			} else {
				mainInit()
			}

		} else {

			let updating = storageGet(updatingKey)

			if (updating) {

				storagePut(updatingKey, false)
				showMessage('Вход', 'Не удалось подтвердить токен пользователя. Попробуйте позднее.', logoutCallback)

			} else {

				storagePut(updatingKey, true)
				console.log('AUTO UPDATE TOKEN')

				let url = null
				if (apiName === 'google') {
					url = document.querySelector('.signin-with-google').href
				} else if (apiName === 'facebook') {
					url = document.querySelector('.signin-with-facebook').href
				} else if (apiName === 'vk') {
					url = document.querySelector('.signin-with-vk').href
				} else if (apiName === 'debug') {
					url = 'http://127.0.0.1:8080/debug/auth'
				}
				if (url !== null) {
					setTimeout(function () {
						location.replace(url)
					}, 750)
				}

			}

		}

	} catch (errorLogin) {

		console.log('LOGIN FAILED', errorLogin)
		showMessage('Вход', 'Не удалось выпольнить вход в приложение. Попробуйте позднее.', logoutCallback)
	}

}

//

let navBarShow = () => { }
let navBarHide = () => { }

// common controls

(function () {

	activityMain.querySelectorAll('.category').forEach(category => {
		function trigger(evt) {
			let scrollElement = category.parentElement.parentElement
			if (!scrollElement.dataset.draggingToScroll) {
console.log('category', evt.type, evt)
				category.classList.toggle('selected')
				filterProviders()
			} else {
console.log('scrolling flag is on...')
			}
		}
		if (isTouchScreen()) {
			category.onmouseup = trigger
		} else {
			category.onclick = trigger
		}
	});

	(function () {
		let timeout = null
		let searchInput = activityMain.querySelector('.search-field input')
		searchInput.addEventListener('input', evt => {
			if (timeout !== null) {
				clearTimeout(timeout)
				timeout = null
			}
			timeout = setTimeout(function () {
				clearTimeout(timeout)
				timeout = null
				filterProviders()
			}, 500)
		})
		searchInput.addEventListener('keydown', evt => {
			if (evt.keyCode === 13) {
				evt.stopPropagation()
				evt.preventDefault()
				leaveFocusedElement()
				let el = document.querySelector('.search-field')
				scrollByYTo(document.scrollingElement, el.offsetTop - parseInt(getComputedStyle(el).marginTop))
			}
		})
		let focusTimeout = null
		searchInput.addEventListener('focusin', evt => {
			if (focusTimeout !== null) {
				clearTimeout(focusTimeout)
				focusTimeout = null
			}
			let el = document.querySelector('.search-field')
			scrollByYTo(document.scrollingElement, el.offsetTop - parseInt(getComputedStyle(el).marginTop))
			document.querySelector('.bottom-panel').classList.add('hide')
		})
		searchInput.addEventListener('focusout', evt => {
			if (focusTimeout !== null) {
				clearTimeout(focusTimeout)
				focusTimeout = null
			}
			focusTimeout = setTimeout(function () {
				document.querySelector('.bottom-panel').classList.remove('hide')
				focusTimeout = null
			}, 750)
		})
/*		window.addEventListener('resize', evt => {
			if (document.activeElement.getAttribute('type') !== 'text') {
				if (focusTimeout !== null) {
					clearTimeout(focusTimeout)
					focusTimeout = null
				}
				focusTimeout = setTimeout(function () {
					document.querySelector('.bottom-panel').classList.remove('hide')
					focusTimeout = null
				}, 750)
			}
		})*/
	})();

	activityMain.querySelectorAll('.open-favorites').forEach(btn => {
		btn.onclick = () => {
			if (!btn.classList.contains('selected')) {
				btn.classList.add('selected')
				setTimeout(function () {
					let el = document.querySelector('.search-field')
					scrollByYTo(document.scrollingElement, el.offsetTop - parseInt(getComputedStyle(el).marginTop))
				}, 500)
			} else {
				btn.classList.remove('selected')
			}
			filterProviders()
		}
	})

	activityMain.querySelectorAll('.open-scanner').forEach(btn => {
		btn.onclick = () => {

			if (!btn.classList.contains('selected')) {
				btn.classList.add('selected')

				let doContinue = true

				function closeScanner() {
					doContinue = false
					switchActivity(activityMain)
					btn.classList.remove('selected')
				}

				function showScannerResults(results) {
					activityMain.classList.add('search-results')
					filterProviders(results)
				}

				activityScanner.querySelectorAll('.back').forEach(btn => {
					btn.onclick = closeScanner
				})

				let info = activityScanner.querySelectorAll('.info')
				let video = document.createElement('video')
				let canvas = activityScanner.querySelector('canvas')
				let canvasOffscreen = document.createElement('canvas')
				let ctx = canvas.getContext('2d')
				let ctxOffscreen = canvasOffscreen.getContext('2d')
				let loadingMessage = activityScanner.querySelector('.loading')

				canvas.hidden = true
				info.forEach(node => node.hidden = true)
				loadingMessage.hidden = false

				let inited = false

				function tick() {

					if (video.readyState === video.HAVE_ENOUGH_DATA) {

						if (!inited) {
							loadingMessage.hidden = true
							info.forEach(node => node.hidden = false)
							canvas.hidden = false
							canvas.width = video.videoWidth
							canvas.height = video.videoHeight
							canvasOffscreen.width = video.videoWidth
							canvasOffscreen.height = video.videoHeight
							let w = canvas.offsetWidth
							let h = canvas.offsetHeight
							canvas.width = w
							canvas.height = h
							inited = true
						}

						let rectWidth = Math.min(canvasOffscreen.width, 256)
						let rectHeight = Math.min(canvasOffscreen.height, 256)
						let x = Math.floor((canvasOffscreen.width - rectWidth) / 2)
						let y = Math.floor((canvasOffscreen.height - rectHeight) / 2)

						ctxOffscreen.drawImage(video, 0, 0, canvasOffscreen.width, canvasOffscreen.height)
						ctxOffscreen.fillStyle = 'rgba(0,0,0,0.5)'
						ctxOffscreen.fillRect(0, 0, canvasOffscreen.width, y)
						ctxOffscreen.fillRect(0, y + rectHeight, canvasOffscreen.width, y + 1)
						ctxOffscreen.fillRect(0, y, x, rectHeight)
						ctxOffscreen.fillRect(x + rectWidth, y, x, rectHeight)

						//let imageData = ctxOffscreen.getImageData(0, 0, canvasOffscreen.width, canvasOffscreen.height)
						let imageData = ctxOffscreen.getImageData(x, y, rectWidth, rectHeight)
						let code = jsQR(imageData.data, imageData.width, imageData.height, {
							inversionAttempts: "dontInvert",
						})

						ctx.drawImage(canvasOffscreen, 0, 0, canvasOffscreen.width, canvasOffscreen.height, 0, 0, canvas.width, canvas.height)
						
//let code = null;
						if (code) {

							ctxOffscreen.lineWidth = 4
							ctxOffscreen.strokeStyle = '#FF3B58'
							ctxOffscreen.beginPath()
							ctxOffscreen.moveTo(x + code.location.topLeftCorner.x, y + code.location.topLeftCorner.y)
							ctxOffscreen.lineTo(x + code.location.topRightCorner.x, y + code.location.topRightCorner.y)
							ctxOffscreen.lineTo(x + code.location.bottomRightCorner.x, y + code.location.bottomRightCorner.y)
							ctxOffscreen.lineTo(x + code.location.bottomLeftCorner.x, y + code.location.bottomLeftCorner.y)
							ctxOffscreen.lineTo(x + code.location.topLeftCorner.x, y + code.location.topLeftCorner.y)
							ctxOffscreen.stroke()

							ctx.drawImage(canvasOffscreen, 0, 0, canvasOffscreen.width, canvasOffscreen.height, 0, 0, canvas.width, canvas.height)
							beep()

							console.log('QR code data', code.data)

							doContinue = false


							backend.scanCode(code.data).then(results => {
								console.log('Scanner results', results)
								if ((results instanceof Array) && results.length > 0) {
									closeScanner()
									showScannerResults(results)
								} else {
									showMessage('Сканирование кода', 'Направления платежа нет в списке.', closeScanner)
								}
								//showMessage('Сканирование кода', 'Данные кода получены - ' + JSON.stringify(results) + ', дальнейший функционал еще не реализован. Ожидайте новых релизов.', closeScanner)
							}).catch(err => {
								console.log(err)
								showMessage('Сканирование кода', 'Ошибка. Попробуйте отсканировать код еще раз.', closeScanner)
							})

//							setTimeout(function () {
//								showMessage('Сканирование кода', 'Данные кода получены, дальнейший функционал еще не реализован. Ожидайте новых релизов.', closeScanner)
//							}, 1000)
						}
					}

					if (doContinue) {
						requestAnimationFrame(tick)
					} else {
						video.srcObject.getTracks().forEach(track => track.stop())
					}
				}

				navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function(stream) {
					video.srcObject = stream
					video.setAttribute('playsinline', true) // required to tell iOS safari we don't want fullscreen
					video.play()
					ctx.fillStyle = '#000'
					ctx.fillRect(0, 0, canvas.width, canvas.height)
					requestAnimationFrame(tick)
				}).catch(err => {
					showMessage('Сканирование кода', 'Не удалось получить доступ к камере.', closeScanner)
					console.log(err)
				})

				historyPut('main')
				switchActivity(activityScanner)

			} else {
				btn.classList.remove('selected')
			}
			filterProviders()
		}
	})

	activityMain.querySelectorAll('.open-history').forEach(btn => {
		btn.onclick = () => {
			if (!btn.classList.contains('selected')) {
				btn.classList.add('selected')
				setTimeout(function () {
					let el = document.querySelector('.search-field')
					scrollByYTo(document.scrollingElement, el.offsetTop - parseInt(getComputedStyle(el).marginTop))
				}, 500)
			} else {
				btn.classList.remove('selected')
			}
			filterProviders()
		}
	})


// TODO fix apple
	activityMain.querySelectorAll('.scroll-horizontal').forEach(el => {

		let drag = false
		let pt0 = null
		let draggingFlagTimer = null

		function touchStart(evt, pt) {
			pt0 = pt
			drag = true
//console.log('start', pt, evt.type)
		}

		function touchMove(evt, pt) {
			if (drag) {
//console.log('move', pt, evt.type)
				let dx = pt.x - pt0.x
				let dy = pt.y - pt0.y
				if (Math.abs(dx) > Math.abs(dy)) {
					clearTimeout(draggingFlagTimer)
					el.dataset.draggingToScroll = true
					el.scrollLeft -= dx
					pt0 = pt
//					evt.stopPropagation() // TODO test it
//					evt.preventDefault()
				}
			}
		}

		function touchEnd(evt, pt) {
//evt.preventDefault()
//evt.stopPropagation()
			drag = false
			draggingFlagTimer = setTimeout(function () {
				delete el.dataset.draggingToScroll
			}, 250)
//console.log('end', pt, evt.type, evt)
//return false
		}

		if (!isTouchScreen()) {

			el.addEventListener('mousedown', function (evt) {
				return touchStart(evt, { x: evt.pageX, y: evt.pageY })
			}, true)

//			el.addEventListener('touchstart', function (evt) {
//				return touchStart(evt, { x: evt.touches[0].pageX, y: evt.touches[0].pageY })
//			})

			el.addEventListener('mousemove', function (evt) {
				return touchMove(evt, { x: evt.pageX, y: evt.pageY })
			}, true)

//			el.addEventListener('touchmove', function (evt) {
//				return touchMove(evt, { x: evt.touches[0].pageX, y: evt.touches[0].pageY })
//			})

			document.addEventListener('mouseup', function (evt) {
				return touchEnd(evt, { x: evt.pageX, y: evt.pageY })
			}, true)

//			document.addEventListener('touchend', function (evt) {
//				return touchEnd(evt, { x: evt.changedTouches[0].pageX, y: evt.changedTouches[0].pageY })
//			})

		}
	});

	;(function () {

		let avatar = activityMain.querySelector('.avatar')
		let timerStep0 = null
		let timerStep1 = null

		function clearTimers() {
			if (timerStep0 !== null) {
				clearTimeout(timerStep0)
				timerStep0 = null
			}
			if (timerStep1 !== null) {
				clearTimeout(timerStep1)
				timerStep1 = null
			}
		}

		navBarShow = () => {
			let x = avatar.offsetLeft + avatar.offsetWidth/2
			let y = avatar.offsetTop + avatar.offsetHeight/2
			activityNavBar.style.clipPath = `circle(0% at ${x}px ${y}px)`
			activityNavBar.style.transition = 'clip-path 0.6s ease-out'
			activityNavBar.classList.remove('is-hidden')
			clearTimers()
			timerStep0 = setTimeout(() => {
				timerStep0 = null
				activityNavBar.style.clipPath = `circle(100% at ${x}px ${y}px)`
				document.querySelector('.bottom-panel').classList.add('hide')
				timerStep1 = setTimeout(() => {
					timerStep1 = null
					activityNavBar.style.clipPath = 'none'
					activityNavBar.style.transition = 'unset'
					activityNavBar.style.height = `${activityMain.offsetHeight}px`
				}, 600)
			}, 50)
		}

		navBarHide = () => {
			let x = avatar.offsetLeft + avatar.offsetWidth/2
			let y = avatar.offsetTop + avatar.offsetHeight/2
			document.scrollingElement.scrollTop = 0
			activityNavBar.style.height = 'auto'
			activityNavBar.style.clipPath = `circle(100% at ${x}px ${y}px)`
			activityNavBar.style.transition = 'clip-path 0.6s ease-out'
			clearTimers()
			timerStep0 = setTimeout(() => {
				timerStep0 = null
				activityNavBar.style.clipPath = `circle(0% at ${x}px ${y}px)`
				document.querySelector('.bottom-panel').classList.remove('hide')
				timerStep1 = setTimeout(() => {
					timerStep1 = null
					activityNavBar.style.clipPath = 'none'
					activityNavBar.style.transition = 'unset'
					activityNavBar.classList.add('is-hidden')
				}, 600)
			}, 50)
		}

		activityNavBar.querySelector('.back').onclick = function () {
			navBarHide()
		}

	})();

})();


// entry point

(function () {

	historyPut('main')

	window.onpopstate = function (evt) {
		let state = evt.state
		console.log('HISTORY.ONPOPSTATE', state)
		activities.forEach(activity => {
			if (!activity.classList.contains('is-hidden')) {
				activity.querySelectorAll('.back').forEach(node => node.onclick())
			}
		})
	}

	let sessionKey = `/${location.hostname}/session`
	let user = storageGet(sessionKey)
	if (user) {
		profileInit(user.apiName, user.id, user.name, user.picture, user.email, user.token, () => {
			storagePut(sessionKey, null)
			switchActivity(activityLogin)
			profileData = null
		}, (name, email) => {
			user.name = name
			user.email = email
			user.isNew = false
			storagePut(sessionKey, user)
		})
	} else {
		switchActivity(activityLogin)
	}

	console.log('VERSION', 122)

})();
