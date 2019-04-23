import * as types from './mutation-types'

export default {
  [types.SET_PENDING](state, payload) {
    state.pending = payload
  },
  [types.SET_ID](state, payload) {
    state.ID = payload
  },
  [types.SET_COOKIES](state, payload) {
    state.cookies = payload
  }
}
