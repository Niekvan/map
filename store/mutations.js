import * as types from './mutation-types'

export default {
  [types.SET_COMPANIES](state, payload) {
    state.companies = payload
  },
  [types.SET_PENDING](state, payload) {
    state.pending = payload
  }
}
