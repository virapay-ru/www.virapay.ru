(async () => {

	const sessionKey = `/${location.hostname}/sessionV2`
	const sessionTransportKey = `/${location.hostname}/transport`
	const sessionTransportPayKey = `/${location.hostname}/transportPaying`
	const sessionActiveProjectKey = `/${location.hostname}/activeProject`

	const getUserToken = () => storageGet(sessionKey)

	let payingFlag = false //storageGet(sessionTransportPayKey)

	let selectCard = () => { }

	activityNavBar.querySelector('.go-transport').addEventListener('click', evt => {
		activityNavBar.xonafterhide = () => pushActivity(activityTransport)
		getCurrentActivity().querySelector('.back').click()
	})

	activityNavBar.querySelector('.go-main').addEventListener('click', evt => {
		activityNavBar.xonafterhide = () => pushActivity(activityMain)
		getCurrentActivity().querySelector('.back').click()
	})

	let activityTicket = activities.find(a => a.classList.contains('ticket'))
	
	//
	// activityTransport
	//

	let holderNode = activityTransport.querySelector('.card-holder')
	let sliderNode = holderNode.querySelector('.card-slider')
	let dotsNode = activityTransport.querySelector('.card-dots')
	let btnsPrev = holderNode.querySelectorAll('.prev')
	let btnsNext = holderNode.querySelectorAll('.next')

	// const cardStatus = { }
	// cardStatus[0] = "Действителен"
	// cardStatus[1] = "Ожидает оплаты"
	// cardStatus[2] = "Действителен" // Оплачен, но не активирован
	// cardStatus[3] = "Недействителен" // Лимит исчерпан
	// cardStatus[4] = "Недействителен" // Лимит сгорел

	const cardTypes = { }
	cardTypes[1] = { name: "Разовая поездка" }
	cardTypes[2] = { name: "Пересадка" }
	cardTypes[3] = { name: "Поездка +" }
	cardTypes[4] = { name: "День безлимита", period: 'День с даты активации' }
	cardTypes[5] = { name: "Неделя безлимита", period: 'Неделя с даты активации' }
	cardTypes[6] = { name: "Месяц безлимита", period: 'Месяц с даты активации' }
	cardTypes[7] = { name: "Студенческий", period: 'Месяц с даты активации' }

	const cardPeriods = { }

	function createCardItem(cardRow) {
		let cardType = cardTypes[cardRow.card_type_id]
		let itemEl = document.createElement('div')
		itemEl.classList.add('card-spacer')
		itemEl.classList.add('user-card')
		let showStar = cardRow.card_status === 0 || !(cardRow.card_status === 2 && cardRow.card_based_on === 3)
			? false
			: true
		let numMonths = parseInt(cardRow.num_months)
		let numDays = parseInt(cardRow.num_days)
		let period = []
		if (numMonths) {
			period.push(`${numMonths} мес.`)
		}
		if (numDays) {
			period.push(`${numDays} дн.`)
		}
		period = period.join(' и ')
		itemEl.innerHTML = `
			<div class="card card-${cardRow.card_type_id} flip flip-horizontal">
				<div class="flip-inner">
					<div class="flip-front">
						<div>Транспортная карта</div>
						<h2>&laquo;${cardType.name}&raquo;</h2>
						<div class="property">
							<span class="value card-num">${parseInt(cardRow.card_num)}</span>
							<span class="value status"></span>
						</div>
						<div class="actions">
							<button class="do-flip">Подробнее</button>
						</div>
					</div>
					<div class="flip-back">
						<div class="property count">
							<span class="name">Доступно поездок:</span>
							<span class="value">${
								cardRow.card_limit_tickets !== null
									? cardRow.card_limit_tickets
									: (cardRow.card_status !== 0 && cardRow.card_status !== 2 && cardRow.card_based_on === 3 ? 0 : '&infin;')
							}</span>
						</div>
						<div class="property stock">
							<span class="name">В запасе проездных:</span>
							<span class="value">2</span>
						</div>
						<div class="property transfer">
							<span class="name">Доступна пересадка до:</span>
							<span class="value">17:30:20</span>
						</div>
						<div class="property expiration">
							<span class="name">Срок действия:</span>
							<span class="value${showStar ? ' with-star' : ''}">${
								cardRow.card_status === 0 || !(cardRow.card_status === 2 && cardRow.card_based_on === 3)
									? (cardRow.card_expiration_date !== null ? cardRow.card_expiration_date_.replace(/^(\d{4})\-(\d\d)\-(\d\d)$/, '$3.$2.$1') : '&infin;')
									: period
							}</span>
						</div>
						<div class="star-info${showStar ? '' : ' force-hidden'}">cо дня активации</div>
						<div class="actions">
							<button class="freeze">Заморозить</button>
							<button class="prolong">${ cardRow.card_type_id == 1 ? 'Оплатить поездки' : 'Продлить' }</button>
						</div>
					</div>
				</div>
			</div>
		`
		let cardEl = itemEl.firstElementChild
		cardEl.dataset.cardId = cardRow.card_id
		cardEl.dataset.cardTypeId = cardRow.card_type_id
		cardEl.dataset.cardStatus = cardRow.card_status
		cardEl.dataset.commissionSumm = cardRow.penalty_total_sum
		cardEl.querySelector('.property .status').innerText = cardRow.card_status_text
		let transferEl = cardEl.querySelector('.transfer')
// cardRow.card_transfer_status = true
// cardRow.card_transfer_time_ = '21:00:08'
		if (cardRow.card_transfer_status) {
			transferEl.querySelector('.value').innerText = cardRow.card_transfer_time_
		} else {
			transferEl.parentElement.removeChild(transferEl)
		}
		let stockEl = cardEl.querySelector('.stock')
// cardRow.card_in_pool = 2
		if (cardRow.card_in_pool > 0) {
			stockEl.querySelector('.value').innerText = cardRow.card_in_pool
		} else {
			stockEl.parentElement.removeChild(stockEl)
		}
		return itemEl
	}

	async function loadCards() { // TODO order by ...
		let rows = await backend.tGetCards(getUserToken())
console.log(rows)
		if (payingFlag) {
			let requestToContinuePaying = false
			let card = rows.find(row => row.card_type_id === 1)
			if (card && card.card_status === 6) {
				requestToContinuePaying = true
				// try {
				// 	let orders = await backend.tOrdersByTickets(getUserToken())
				// 	if (orders && orders.length > 0) {
				// 		requestToContinuePaying = true
				// 	}
				// } catch (err) {
				// 	console.warn(err)
				// }
			}
			if (requestToContinuePaying) {
				await new Promise(resolve => {
					location.replace('/prolong.html')
				})
			} else {
				storagePut(sessionTransportPayKey, false)
			}
		}
		activityTransport.classList.remove('preloading')
		activityTransport.querySelectorAll('.user-card').forEach(node => {
			node.parentElement.removeChild(node)
		})
		let insertPoint = activityTransport.querySelector('.card-insert-point')
		rows.map(createCardItem).forEach(cardEl => {
			insertPoint.parentElement.insertBefore(cardEl, insertPoint)
		})
		dotsNode.innerHTML = ''
		getCards().forEach((cardEl, i) => {
			let btnDot = document.createElement('button')
			btnDot.innerHTML = `<i class="iconify" data-icon="mdi-checkbox-blank-circle"></i>`
			btnDot.addEventListener('click', () => { selectCard(i) })
			dotsNode.appendChild(btnDot)
		})
	}

	function getCards() {
		return activityTransport.querySelectorAll('.card')
	}

	function getIndexByCardId(cardId) {
		let found = -1
		getCards().forEach((cardEl, i) => {
			if (cardId == cardEl.dataset.cardId) {
				found = i
			}
		})
console.log('getIndexByCardId(', cardId, ')', found)
		return found
	}

	function getIndexByCardTypeId(cardTypeId) {
		let found = -1
		getCards().forEach((cardEl, i) => {
console.log(cardEl, i, cardEl.dataset.cardTypeId)
			if (cardTypeId == cardEl.dataset.cardTypeId) {
				found = i
			}
		})
console.log('getIndexByCardTypeId(', cardTypeId, ')', found)
		return found
	}

	/*function getTickets() {
		return activityTransport.querySelectorAll('.ticket')
	}*/

	let scrolling = null
	let flipping = null
	let touchPoint = {
		x: 0,
		y: 0,
		touched: false,
		card: 0,
		scrollLeft: 0,
		scrollTop: 0,
		dx: 0,
		dy: 0
	}

	function flipCard(node, callback) {
		if (touchPoint.touched === false && scrolling === null && flipping === null) {
			if (node.classList.contains('add')) {
				location.replace('/add.html')
			} else {
				node.classList.toggle('flipped')
				flipping = true
				setTimeout(() => {
					flipping = null
					if (callback) {
						callback(node)
					}
				}, 1000)
			}
		}
	}

	function freezeCard(node) {
	}

	async function prolongCard(node) {
		location.replace('./prolong.html')
	}

	let getCurrentCardIndex = () => 0

	function initCard(node) {

		node.onclick = function () {
console.log('click')
			flipCard(node)
		}

		node.querySelectorAll('.freeze').forEach(btn => {
			btn.addEventListener('touchstart', (evt) => {
				evt.preventDefault()
				freezeCard(node)
			})
			btn.addEventListener('mousedown', (evt) => {
				evt.preventDefault()
				freezeCard(node)
			})
		})

		node.querySelectorAll('.prolong').forEach(btn => {
			btn.addEventListener('touchstart', (evt) => {
				evt.preventDefault()
				prolongCard(node)
			})
			btn.addEventListener('mousedown', (evt) => {
				evt.preventDefault()
				prolongCard(node)
			})
		})
	}

	//function initCardHolder(holderNode) {

		// let sliderNode = holderNode.querySelector('.card-slider')
		// let dotsNode = activityTransport.querySelector('.card-dots')

		// let btnsPrev = holderNode.querySelectorAll('.prev')
		// let btnsNext = holderNode.querySelectorAll('.next')
		//let btnsDots = dotsNode.querySelectorAll('button')

		let cards = []//getCards()

		getCurrentCardIndex = function () {
			return parseInt(holderNode.dataset.cardIndex)
		}

		const threshold = 5
		let activeCard = null//cards[0]
		// const touchThreshold = 30

		sliderNode.addEventListener('touchstart', evt => {
			if (scrolling === null && flipping === null) {
				let t = evt.touches[0]
				touchPoint.x = t.clientX
				touchPoint.y = t.clientY
				touchPoint.card = getCurrentCardIndex()
				touchPoint.scrollLeft = sliderNode.scrollLeft
				touchPoint.scrollTop = sliderNode.scrollTop
				touchPoint.dx = 0
				touchPoint.dy = 0
				touchPoint.touched = true
			}
		})

		sliderNode.addEventListener('touchmove', evt => {
			if (touchPoint.touched && scrolling === null && flipping === null) {
				let t = evt.touches[0]
				touchPoint.dx = t.clientX - touchPoint.x
				touchPoint.dy = t.clientY - touchPoint.y
				sliderNode.scrollLeft = touchPoint.scrollLeft - touchPoint.dx
			}
		})

		sliderNode.addEventListener('touchend', evt => {
			if (touchPoint.touched) {
				touchPoint.touched = false
				if (scrolling === null && flipping === null && activeCard) {
					if (Math.abs(touchPoint.dx) >= activeCard.offsetWidth / 4) {
						if (Math.abs(sliderNode.scrollLeft - touchPoint.scrollLeft) >= 1) {
							if (touchPoint.dx > 0) {
								selectCard(touchPoint.card - 1)
							} else {
								selectCard(touchPoint.card + 1)
							}
						}
					} else {
// 						if (Math.abs(touchPoint.dx) <= activeCard.offsetWidth / 4 - 5) {
// 							sliderNode.scrollLeft = touchPoint.scrollLeft
// 						} else {
// console.log('pt3')
// 							selectCard(touchPoint.card)
// 						}
						evt.preventDefault()
						doScroll(touchPoint.scrollLeft, () => flipCard(activeCard))

					}
				}				
			}
		})

		const NUM_TICKETS_PER_PAGE = 20

		const createCommissionItem = (summ, cardTypeId) => {

			let ticketItem = document.createElement('div')
			ticketItem.classList.add('ticket')
			ticketItem.classList.add(`card-${cardTypeId}`)
			// ticketItem.classList.add(`showing`)
			// ticketItem.classList.add(`hide`)
			ticketItem.innerHTML = `
				<div class="details">
					<div class="icon">
						<i class="iconify" data-icon="tabler-bus"></i>
					</div>
					<div class="title">
						<div class="name">Сервисный сбор</div>
						<!-- <div class="timestamp"></div> -->
					</div>
					<div class="price">
						<span class="summ"></span>
						<i class="iconify currency" data-icon="mdi-currency-rub"></i>
					</div>
				</div>
			`

			ticketItem.classList.add('not-payed')

			// ticketItem.querySelector('.name').innerText = row._contragent_name
			// ticketItem.querySelector('.timestamp').innerText = row._ticket_timestamp
			// 	.replace(/^(\d{4})\-(\d\d)\-(\d\d) (\d\d\:\d\d\:\d\d).*$/, '$3.$2.$1 $4')
			ticketItem.querySelector('.summ').innerText = parseFloat(summ).toFixed(2)

			ticketItem.addEventListener('click', evt => {
				// location.replace(`./ticket.html?id=${encodeURIComponent(row._ticket_id)}`)
				location.replace('/prolong.html')
			})

			return ticketItem
		}

		const createTicketItem = (row, cardTypeId) => {

			let ticketItem = document.createElement('div')
			ticketItem.classList.add('ticket')
			ticketItem.classList.add(`card-${cardTypeId}`)
			// ticketItem.classList.add(`showing`)
			// ticketItem.classList.add(`hide`)
			ticketItem.innerHTML = `
				<div class="details">
					<div class="icon">
						<i class="iconify" data-icon="tabler-bus"></i>
					</div>
					<div class="title">
						<div class="name"></div>
						<div class="timestamp"></div>
					</div>
					<div class="price">
						<span class="summ"></span>
						<i class="iconify currency" data-icon="mdi-currency-rub"></i>
					</div>
				</div>
			`

			if (row._needs_payment) {
				ticketItem.classList.add('not-payed')
			} else {
				ticketItem.classList.add('payed')
			}

			ticketItem.querySelector('.name').innerText = row._contragent_name
			ticketItem.querySelector('.timestamp').innerText = row._ticket_timestamp
				.replace(/^(\d{4})\-(\d\d)\-(\d\d) (\d\d\:\d\d\:\d\d).*$/, '$3.$2.$1 $4')
			ticketItem.querySelector('.summ').innerText = parseFloat(row._summ).toFixed(2)

			ticketItem.addEventListener('click', evt => {
				location.replace(`./ticket.html?id=${encodeURIComponent(row._ticket_id)}`)
			})

			return ticketItem
		}

		let cardTicketsList = activityTransport.querySelector('.card-tickets')

		async function loadTickets(cardId, cardTypeId, cardStatus, commissionSumm, reload = true) {

			if (reload) {
				cardTicketsList.innerHTML = `
					<button class="button primary pay-tickets force-hidden">
						<span>Оплатить неоплаченные</span>
					</button>
					<button class="button load-tickets">
						<span>Загрузить еще</span>
					</button>
				`
				cardTicketsList.dataset.offset = 0
			}

			let btnPayTickets = cardTicketsList.querySelector('.pay-tickets')
			let btnLoadTickets = cardTicketsList.querySelector('.load-tickets')

			btnPayTickets.addEventListener('click', async (evt) => {
				location.replace('/prolong.html')
			})

			btnLoadTickets.addEventListener('click', async (evt) => {

				btnLoadTickets.setAttribute('disabled', true)
				let hasMoreItems = false

				try {

					let offset = parseInt(cardTicketsList.dataset.offset)
console.log('tGetTickets', cardId, cardTypeId, [offset, NUM_TICKETS_PER_PAGE])
					let result = await backend.tGetTickets(
						getUserToken(),
						cardId,
						offset,
						NUM_TICKETS_PER_PAGE
					)
console.log('result', result)
					cardTicketsList.dataset.offset = offset + result.length
					let hasUnpayedTicket = false
					let t = 0
					let commission = parseFloat(commissionSumm)
					if (offset == 0 && commission > 0) {
						let item = createCommissionItem(commission, cardTypeId)
						cardTicketsList.prepend(item)
						item.classList.add('show')
						t = 120
					}
					result.forEach((row, i) => {
						if (row._needs_payment) {
							hasUnpayedTicket = true
						}
						let ticket = createTicketItem(row, cardTypeId)
						cardTicketsList.insertBefore(ticket, btnPayTickets)
						t = (i + 1) * 120
						setTimeout(() => {
							// ticket.classList.remove('hide')
							ticket.classList.add('show')
						}, t)
					})
					setTimeout(() => {
						if (cardTypeId == 1 && (cardStatus == 6 || hasUnpayedTicket)) {
							btnPayTickets.classList.remove('force-hidden')
						}			
					}, t + 120)
					if (result.length >= NUM_TICKETS_PER_PAGE) {
						hasMoreItems = true
					}
	
				} catch (err) {
	
					hasMoreItems = true
					console.warn(err)

				} finally {

					if (hasMoreItems) {
						btnLoadTickets.removeAttribute('disabled')
					}
				}
			})

			btnLoadTickets.click()
		}
		
		function doScroll(left, callback) {
console.log('doScroll', left)
			scrolling = setInterval(() => {
				sliderNode.scrollLeft += (left - sliderNode.scrollLeft) * 0.2
//console.log('left', sliderNode.scrollLeft)
				if (Math.abs(sliderNode.scrollLeft - left) < threshold) {
//console.log('ready')
					sliderNode.scrollLeft = left
					clearInterval(scrolling)
					scrolling = null
					if (callback) {
						callback()
					}
				}
			}, 1000/60)
		}

		let prevCardInx = -1
		selectCard = function (cardIndex, immediately = false, reloadTickets = true, compareCards = true) {
console.log('selectCard(', cardIndex, ')')
			if (touchPoint.touched || scrolling !== null || flipping !== null) {
				return
			}
			let places = sliderNode.querySelectorAll('.card-spacer')
			if (cardIndex < 0) {
				cardIndex = 0
			}
			if (cardIndex >= places.length) {
				cardIndex = places.length - 1
			}
// console.log('clamped', cardIndex)
			let left = 0
			for (let i = 0; i < cardIndex; i ++) {
				left += places[i].offsetWidth
// console.log('offsetWidth', i, places[i].offsetWidth, places[i])
			}
// console.log('left', left)
			holderNode.dataset.cardIndex = cardIndex
			if (cardIndex === 0) {
				btnsPrev.forEach(node => node.setAttribute('disabled', true))
			} else {
				btnsPrev.forEach(node => node.removeAttribute('disabled'))
			}
			if (cardIndex === places.length - 1) {
				btnsNext.forEach(node => node.setAttribute('disabled', true))
			} else {
				btnsNext.forEach(node => node.removeAttribute('disabled'))
			}
			if (activeCard && activeCard.classList.contains('flipped')) {
				//flipCard(activeCard, () => doScroll(left))
doScroll(left)
activeCard.classList.remove('flipped')
			} else {
				if (immediately) {
					sliderNode.scrollLeft = left
				} else {
					doScroll(left)
				}
			}
			let btnsDots = dotsNode.querySelectorAll('button')
			btnsDots.forEach(node => node.classList.remove('active'))
			if (!btnsDots[cardIndex] || !cards[cardIndex]) {
				return
			}
			btnsDots[cardIndex].classList.add('active')
			activeCard = cards[cardIndex]
//console.log('current card', activeCard, activeCard.dataset, activeCard.dataset.cardId)
			if (activeCard.dataset.cardId) {
				storagePut(sessionTransportKey, {
					lastCardId: activeCard.dataset.cardId,
					lastCardTypeId: activeCard.dataset.cardTypeId
				})
				if (reloadTickets) {
					//console.log('compareCards', compareCards, 'is same', activeCard === cards[cardIndex], activeCard, cards[cardIndex])
					console.log('compareCards', compareCards, 'is same', prevCardInx === cardIndex, prevCardInx, cardIndex)
					if (!compareCards || prevCardInx !== cardIndex) {
						loadTickets(activeCard.dataset.cardId, activeCard.dataset.cardTypeId, activeCard.dataset.cardStatus, activeCard.dataset.commissionSumm)
					}
				}
			} else {
				cardTicketsList.innerHTML = ''
			}
			prevCardInx = cardIndex
		}

		btnsPrev.forEach(node => node.onclick = () =>
			selectCard(getCurrentCardIndex() - 1))

		btnsNext.forEach(node => node.onclick = () =>
			selectCard(getCurrentCardIndex() + 1))

		// holderNode.querySelector('.card.add').addEventListener('click', evt => {
		// 	//productsList.classList.remove('is-hidden')
		// 	location.replace('/add.html')
		// })

	// 	selectCard(0)
	// }

	async function boot() {

		await backend.tAddCard(getUserToken(), 1, 0)

		await loadCards()

		sliderNode.scrollLeft = 0
		cards = getCards()
		cards.forEach(node => initCard(node))
		activeCard = cards[0]

		let transportSettings = storageGet(sessionTransportKey)
		let itemIndex = 0
		if (transportSettings) {
			if (transportSettings.lastCardId) {
				itemIndex = getIndexByCardId(transportSettings.lastCardId)
			} else if (transportSettings.lastCardTypeId) {
				itemIndex = getIndexByCardTypeId(transportSettings.lastCardTypeId)
			}
		}
		selectCard(itemIndex, true)
		holderNode.classList.remove('is-invisible')
	}

	activityTransport.xonbeforeshow = async () => {
		holderNode.classList.add('is-invisible')
	}

	activityTransport.xonaftershow = async () => {
		activityNavBar.querySelector('.go-transport').classList.add('is-hidden')
		activityNavBar.querySelector('.go-main').classList.remove('is-hidden')
		storagePut(sessionActiveProjectKey, 'transport')
		await boot()
	}

	activityTransport.xonafterhide = () => {
		activityNavBar.querySelector('.go-main').classList.add('is-hidden')
		activityNavBar.querySelector('.go-transport').classList.remove('is-hidden')
		storagePut(sessionActiveProjectKey, 'main')
	}

	// initCardHolder(holderNode)

	let activityApproveAction = activities.find(a => a.classList.contains('approve-action'))
	let showTariffsActivity = () => { }

	activityApproveAction.xonaftershow = () => {
		storagePut(sessionActiveProjectKey, 'transport')
		activityTransport.classList.add('preloading')
	}

    // activityApproveAction.querySelector('.action .back').addEventListener('click', () => history.back())
    activityApproveAction.querySelector('.action .pick-tariff').addEventListener('click', () => {
        hideActivity(activityApproveAction)
		showTariffsActivity()
    })

	activityApproveAction.querySelectorAll('.cancel').forEach(btnCancel => {
		btnCancel.addEventListener('click', () => {
			hideActivity(activityApproveAction)
			showActivity(activityTransport)
		})
	})

	function turnOnNFCScanner() {
		return new Promise((resolve, reject) => {
			try {
				const ndef = new NDEFReader()
				ndef.addEventListener('readingerror', () => {
					console.warn('Cannot read data from the NFC tag.')
				})
				ndef.addEventListener("reading", ({ message, serialNumber }) => {
					// console.log(`> Serial Number: ${serialNumber}`)
					// console.log(`> Records: (${message.records.length})`)
					const decoder = new TextDecoder()
					for (const record of event.message.records) {
						// alert(''
						// 	+ "Record type: '" + record.recordType + "'\n"
						// 	+ "MIME type: '" + record.mediaType + "'\n"
						// 	+ "=== data ===\n" + decoder.decode(record.data)
						// )
						if (record.recordType === 'url') {
							let url = '' + decoder.decode(record.data)
							// let m = url.match(/^https\:\/\/evolution\.virapay\.ru\/\?t=([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})(\&n=[1-9][0-9]*)?$/)
							let m = url.match(/^https\:\/\/(?:(?:evolution|www)\.)?virapay\.ru\/\?t=([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})(\&n=[1-9][0-9]*)?$/)
							if (m) {
								// alert(`linkId = '${m[1]}'`)
								let linkId = m[1]
								showTariffsActivity = () => {
									let sessionTransport = storageGet(sessionTransportKey)
									if (sessionTransport.lastCardId) {
										sessionTransport.lastLinkId = linkId
										sessionTransport.askBeforeTransaction = true
										storagePut(sessionTransportKey, sessionTransport)
										// alert('redirecting...')
										location.replace('./tariffs.html')
										//location.replace(url)
									} else {
										showMessage('Сканирование кода', 'Сначала выберите транспортную карту.', () => {})
									}
								}
								hideActivity(activityTransport)
								showActivity(activityApproveAction)
							}
						}
					}
				})
				ndef.scan().then(resolve())
				// console.log('> Scan started')
			} catch (error) {
				console.warn(error)
				reject(error)
			}
		})
	}


// { simulation
// {
// 	let linkId = '91c47034-f732-44a6-bc82-3f28a0c1ce31'
// 	showTariffsActivity = () => {
// 		let sessionTransport = storageGet(sessionTransportKey)
// 		if (sessionTransport.lastCardId) {
// 			sessionTransport.lastLinkId = linkId
// 			storagePut(sessionTransportKey, sessionTransport)
// 			// alert('redirecting...')
// 			location.replace('./tariffs.html')
// 		}
// 	}
// 	window.simulateNFCTagReading = () => {
// 		hideActivity(activityTransport)
// 		showActivity(activityApproveAction)
// 	}
// }
// } simulation


	let btnNFCScanner = activityTransport.querySelector('button.nfc')
	btnNFCScanner.onclick = async () => {
		btnNFCScanner.setAttribute('disabled', true)
		try {
			await turnOnNFCScanner()
			btnNFCScanner.classList.add('is-turned-on')
		} catch (error) {
			showMessage('Включение сканера', 'Не удалось включить NFC-сканер.', () => {
				btnNFCScanner.removeAttribute('disabled')
				pushActivity(activityTransport)
			})
		}
	}
	if (!('NDEFReader' in window)) {
		btnNFCScanner.setAttribute('disabled', true)
		btnNFCScanner.classList.add('is-turned-on')
	}

	let btnQRScanner = activityTransport.querySelector('button.qr')
	btnQRScanner.onclick = () => {
		pushActivity(activityScanner)
	}

	let btnInfo = activityTransport.querySelector('button.inf')
	btnInfo.onclick = () => {
		location.replace('/info.html')
	}

	// try {
	// 	btnNFCScanner.setAttribute('disabled', true)
	// 	await turnOnNFCScanner()
	// 	btnNFCScanner.classList.add('is-turned-on')
	// } catch(err) {
	// 	btnNFCScanner.removeAttribute('disabled')
	// }

/*
	let ticketCCTPos = { x: 0, y: 0 }

	activityTicket.querySelectorAll('.back').forEach(btn => btn.onclick = () => {
		hideActivityCCT(activityTicket, ticketCCTPos.x, ticketCCTPos.y)
	})

	getTickets().forEach(node => node.onclick = (evt) => {
		//node.classList.toggle('picked')
		ticketCCTPos.x = evt.clientX
		ticketCCTPos.y = evt.clientY
		showActivityCCT(activityTicket, undefined, false, ticketCCTPos.x, ticketCCTPos.y)
	})
*/

	let prevWidth = window.innerWidth
	let redrawTimer = null
	window.addEventListener('resize', () => {
		//console.log('resize')
		if (prevWidth !== window.innerWidth) {
			prevWidth = window.innerWidth
			clearTimeout(redrawTimer)
			redrawTimer = setTimeout(() => {
				selectCard(getCurrentCardIndex(), true, false, false)
			}, 500)
		}
	})



	const activityInputTransportNum = getActivityByName('input-transport-num')
	activityInputTransportNum.querySelectorAll('.back').forEach(btn => btn.onclick = () => history.back())
	const transportNum = activityInputTransportNum.querySelector('.transport-num')
	activityInputTransportNum.querySelectorAll('.get-ticket').forEach(btn => btn.onclick = () => {
		let sessionTransport = storageGet(sessionTransportKey)
		if (sessionTransport.lastCardId) {
			console.log('getting link by reg num', transportNum.value)
			backend.tGetLinkIdByRegNumber(sessionTransport.lastCardId, transportNum.value).then(result => {
console.log({ result })
				if (result._error_code == 0) {
					sessionTransport.lastLinkId = result._qr_code_uuid
					sessionTransport.askBeforeTransaction = true
					storagePut(sessionTransportKey, sessionTransport)
					storagePut(sessionActiveProjectKey, 'transport')
					location.replace('./tariffs.html')
				} else {
					showMessage('Самостоятельный ввод', result._error_message, function () { history.back() })
				}
			}).catch(err => {
				console.log({ err })
//alert(err)
				showMessage('Самостоятельный ввод', 'Ошибка. Попробуйте еще раз.', function () { history.back() })
			})
		} else {
			showMessage('Самостоятельный ввод', 'Сначала выберите транспортную карту.', function () { history.back() })
		}
	})

	activityTransport.querySelectorAll('.manual-input').forEach(btn => btn.onclick = () => {
		pushActivity(activityInputTransportNum)
	})

})();