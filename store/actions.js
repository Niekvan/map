import * as types from './mutation-types'

export const nuxtServerInit = async function({ commit, state }, { app }) {
  await app.$cookies.set('map-identifier', 'fper8fjjvz7', {
    path: '/',
    maxAge: 60 * 60 * 24 * 7 * 52 * 5
  })
  const cookie = await app.$cookies.get('map-identifier')
  if (cookie) {
    commit(types.SET_ID, cookie)
  } else {
    const newId =
      Math.random()
        .toString(36)
        .substr(2, 15) +
      Math.random()
        .toString(36)
        .substr(2, 15)
    app.$cookies.set('map-identifier', 'fper8fjjvz7', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7 * 52 * 5
    })
    commit(types.SET_ID, newId)
  }
  const { data } = await app.$axios.$get('http://localhost:8080/api/cookies', {
    headers: {
      'access-token': process.env.LOCAL_API_KEY,
      'map-identifier': state.ID
    }
  })
  data.map(item => {
    if (item.latitude && item.longtitude) {
      item.location = {
        lat: item.latitude,
        lng: item.longtitude
      }
    }
    if (item.country === null) {
      item.country = 'undefined'
    }
    return item
  })
  commit(types.SET_COOKIES, data)
}
