'use strict';

let profileData = null
let providersList = null
let profileSave = function () { };


// regions selector 

(function () {

	let regionsSelector = document.querySelector('.regions-selector')
	regionsSelector.querySelector('.trigger').onmousedown = function (evt) {
		evt.preventDefault()
		evt.stopPropagation()
		if (!regionsSelector.classList.contains('open')) {
			scrollByYTo(document.scrollingElement, regionsSelector.offsetTop - parseInt(getComputedStyle(regionsSelector).marginTop), 300, function () {
				regionsSelector.classList.toggle('open')
			})
		} else {
			regionsSelector.classList.toggle('open')
		}
	}
	document.onmousedown = function (evt) {
		regionsSelector.classList.remove('open')
	}


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

		regionsList.querySelectorAll('label').forEach(node => {

			node.onmousedown = function (evt) {
				evt.preventDefault()
				evt.stopPropagation()
			}
		})




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
		providersList.forEach(item => {

			let rowKey = '' + item.id + '/' + (item.service_id ? item.service_id : 0)

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

			favNode.onclick = function () {
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
					filterProviders()
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

				document.onmousedown = function (evt) {
					triggers.forEach(node => node.classList.remove('is-active'))
				}

				triggers.forEach((node, i) => {
					node.onmousedown = (evt) => {
						evt.stopPropagation()
						evt.preventDefault()
						triggers.forEach((node_, j) => {
							if (i != j) node_.classList.remove('is-active')
						})
						node.classList.toggle('is-active')
					}
				})

				document.querySelectorAll('.popup > a').forEach(a => a.onmousedown = () => {
					triggers.forEach(node => {
						node.classList.remove('is-active')
					})
				})

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
					let prevList = profileData.accList[rowKey]
					accItem.removed = true
					profileData.accList[rowKey] = profileData.accList[rowKey].filter(x => !x.removed)
					let result = profileSave()
					if (result) {
						accountNode.remove()
					} else {
						showMessage('Учетные данные', 'Не удалось удалить данные. Попробуйте позднее.', () => {
							profileData.accList[rowKey] = prevList
							delete accItem.removed
						})
					}
				})

				accountNode.querySelectorAll('.account-payment').forEach(commandNode => commandNode.onclick = () => {

					let inputAccount = activityAccountPayment.querySelector('input.account')
					let inputDescription = activityAccountPayment.querySelector('input.description')
					let inputSum = activityAccountPayment.querySelector('input.summ')

					scrollTopAccounts = document.scrollingElement.scrollTop

					activityAccountPayment.querySelector('.acc-description').innerText = item.acc_description
					activityAccountPayment.querySelector('.acc-example').innerText = item.acc_example
					inputAccount.value = accItem.acc
					inputDescription.value = accItem.desc
					inputSum.value = accItem.sum

					activityAccountPayment.querySelector('.prepare-payment').onclick = () => {

						let prevAcc = accItem.acc
						let prevDesc = accItem.desc
						let prevSum = accItem.sum
						accItem.acc = inputAccount.value
						accItem.desc = inputDescription.value
						accItem.sum = inputSum.value
						let result = profileSave()
						if (result) {
							accountNode.querySelector('.value').innerText = inputAccount.value
							accountNode.querySelector('.description').innerText = inputDescription.value
							activityAccountPayment.querySelector('.back').onclick()
						} else {
							showMessage('Учетные данные', 'Не удалось сохранить данные. Попробуйте позднее.', () => {
								accItem.acc = prevAcc
								accItem.desc = prevDesc
								accItem.sum = prevSum
							})
						}

						// TODO payment
					}

					historyPut('accounts')
					inputAccount.oninput()
					inputSum.oninput()
					switchActivity(activityAccountPayment)
				})

				accountsList.appendChild(accountNode)

				accountsListUpdateTriggers()
			}

			function pick() {

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

					

				})

				// accounts validation

				function enableAccountValidation(inputAccount, actionButton) {

let accountCheckTimeout = null
					inputAccount.oninput = function () {
console.log('acc', inputAccount.value, item.id, item.inn, item.service_id)
						if (accountCheckTimeout !== null) {
							clearTimeout(accountCheckTimeout)
							accountCheckTimeout = null
						}
						actionButton.setAttribute('disabled', true)
						accountCheckTimeout = setTimeout(function () {

							accountCheckTimeout = null
							inputAccount.classList.remove('valid')
							inputAccount.classList.remove('error')
							inputAccount.classList.add('verification')

							let acc = inputAccount.value
							if (acc === '') {
								inputAccount.classList.remove('verification')
								return
							}

							function handleResult(result) {
								inputAccount.classList.remove('verification')
								if (result && result.account == acc) {
									inputAccount.classList.add('valid')
									actionButton.removeAttribute('disabled')
								} else {
									inputAccount.classList.add('error')
								}
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

							backend.accountCheck(rowKey, item.inn, acc).then(result => {

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
								console.log(err)

							})

						}, 500)
					}
				}

				enableAccountValidation(
					activityAccountEdit.querySelector('input.account'),
					activityAccountEdit.querySelector('.account-save')
				);

				enableAccountValidation(
					activityAccountPayment.querySelector('input.account'),
					activityAccountPayment.querySelector('.prepare-payment')
				);

				(function () {

					let inputSum = activityAccountPayment.querySelector('input.summ')
					let outputCommission = activityAccountPayment.querySelector('.commission')
					let outputTotal = activityAccountPayment.querySelector('.total')

					function updateSumms() {

						let sum = parseFloat(inputSum.value).toFixed(2)
						if (isNaN(sum)) {
							sum = '0.00'
						}
console.log('sum', sum)
						let commission = ((sum / 100) * 5 + 3).toFixed(2) // TODO commission
console.log('commission', commission)
						let total = (parseFloat(sum) + parseFloat(commission)).toFixed(2)
console.log('total', total)

						outputCommission.innerText = commission
						outputTotal.innerText = total
					}

					inputSum.oninput = function (evt) {

						/*let c = String.fromCharCode(evt.keyCode)
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
								el.value = lval.replace(/\./g, '') + replacement + rval.replace(/\./g, '')
								el.selectionStart = start + offset + 1
								el.selectionEnd = el.selectionStart
								el.dispatchEvent(new Event('input'))
							}
							return false
						}*/

						updateSumms()
					}

				})();
				




				historyPut('main')
				switchActivity(activityAccounts)
			}

			nameNode.onclick = pick
			serviceNode.onclick = pick
			btnNode.onclick = pick

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

function filterProviders() {

	let favlistOnly = activityMain.querySelector('.open-favorites').classList.contains('selected')

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


	let hiddenItems = []

	providersList.forEach(row => {

		row.isMatch = true

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

		if (favlistOnly && !row.isFavorite) {
			row.isMatch = false
		}

		if (row.isMatch) {
			row.node.classList.add('show')
		} else {
			if (row.node.classList.contains('show')) {
				row.node.classList.remove('show')
				row.node.classList.add('hide')
				hiddenItems.push(row.node)
			}
		}

	})

	setTimeout(function () {
		hiddenItems.forEach(node => {
			node.style.marginBottom = '-' + node.offsetHeight + 'px'
		})
		setTimeout(function () {
			hiddenItems.forEach(node => {
				node.classList.remove('hide')
				node.style.marginBottom = '0'
			})
		}, 500)
	}, 0)
}

// profile functions

async function profileInit(apiName, id, fullName, imageUrl, email, token, doLogout, doUpdate) {

	let logoutCallback = function () {
		doLogout()
		profileData = null
		profileSave = function () { }
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


			if (result.isNew) {
				historyPut('main')
				switchActivity(activityProfile)
			} else {
				mainInit()
			}

		} else {

			showMessage('Вход', 'Не удалось подтвердить токен пользователя. Попробуйте позднее.', logoutCallback)
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
		category.onclick = () => {
			category.classList.toggle('selected')
			filterProviders()
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
	})();

	activityMain.querySelectorAll('.open-favorites').forEach(btn => {
		btn.onclick = () => {
			let icon = btn.querySelector('.icon')
			if (icon.classList.contains('mdi-star-outline')) {
				icon.classList.remove('mdi-star-outline')
				icon.classList.add('mdi-star')
				btn.classList.add('selected')
				setTimeout(function () {
					let el = document.querySelector('.search-field')
					scrollByYTo(document.scrollingElement, el.offsetTop - parseInt(getComputedStyle(el).marginTop))
				}, 500)
			} else {
				btn.classList.remove('selected')
				icon.classList.remove('mdi-star')
				icon.classList.add('mdi-star-outline')
			}
			filterProviders()
		}
	})

	activityMain.querySelectorAll('.scroll-horizontal').forEach(el => {

		let drag = false
		let pt0 = null

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
					el.scrollLeft -= dx
					pt0 = pt
					evt.stopPropagation()
					evt.preventDefault()
				}
			}
		}

		function touchEnd(evt, pt) {
			drag = false
//console.log('end', pt, evt.type)
		}

		el.addEventListener('mousedown', function (evt) {
			return touchStart(evt, { x: evt.pageX, y: evt.pageY })
		})

		el.addEventListener('touchstart', function (evt) {
			return touchStart(evt, { x: evt.touches[0].pageX, y: evt.touches[0].pageY })
		})

		el.addEventListener('mousemove', function (evt) {
			return touchMove(evt, { x: evt.pageX, y: evt.pageY })
		})

		el.addEventListener('touchmove', function (evt) {
			return touchMove(evt, { x: evt.touches[0].pageX, y: evt.touches[0].pageY })
		})

		document.addEventListener('mouseup', function (evt) {
			return touchEnd(evt, { x: evt.pageX, y: evt.pageY })
		})

		document.addEventListener('touchend', function (evt) {
			return touchEnd(evt, { x: evt.changedTouches[0].pageX, y: evt.changedTouches[0].pageY })
		})
	});

	(function () {

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
