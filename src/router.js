import { createRouter, createWebHashHistory } from 'vue-router'

const HomeView = () => import('./views/HomeView.vue')
const VoteView = () => import('./views/VoteView.vue')
const ResultsView = () => import('./views/ResultsView.vue')

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/vote', name: 'vote', component: VoteView },
    { path: '/results', name: 'results', component: ResultsView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
