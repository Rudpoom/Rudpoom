import { defineEventHandler, sendRedirect } from 'h3'

export default defineEventHandler((event) => {
  const url = (event.node.req?.url || '') as string
  if (url === '/shop' || url === '/shop/') {
    return sendRedirect(event, '/photos', 302)
  }
})
