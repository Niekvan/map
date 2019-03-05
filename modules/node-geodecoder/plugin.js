import Vue from 'vue'
const nodeGeoCoder = require('node-geocoder')

const geocoder = nodeGeoCoder({
  provider: 'opencage',
  apiKey: '<%= options.key %>'
})

Vue.prototype.$geo = geocoder

export default ctx => {
  const { app, store } = ctx
  ctx.prototype.$geo = Vue.prototype.$geo
  app.prototype.$geo = Vue.prototype.$geo

  if (store) {
    store.prototype.$geo = Vue.prototype.$geo
  }
}
