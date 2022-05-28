from mitmproxy import ctx
import mitmproxy.http

class LocalRedirect:

  def __init__(self):
    print('Loaded redirect addon')

  def request(self, flow: mitmproxy.http.HTTPFlow):
    if 'digi-rearise.is-saved.org' in flow.request.pretty_host:
      ctx.log.info("pretty host is: %s" % flow.request.pretty_host)
      flow.request.host = 'digi-rearise.is-saved.org'
      flow.request.port = 3000
      flow.request.scheme = 'http'

addons = [
  LocalRedirect()
]