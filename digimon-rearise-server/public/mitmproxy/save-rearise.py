def request(flow):
	request = flow.request
	if request.host in ('api.digi-rise.com', 'digirige-os-api.channel.or.jp'):
		request.host = 'digi-rearise.is-saved.org'
